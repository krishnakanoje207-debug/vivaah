/**
 * Schema / RLS gate (CLAUDE.md item #12).
 *
 * Reads the live Neon database and checks it against what specs/schema.sql
 * promises. Read-only: every statement here is a SELECT against the catalogs.
 *
 * The load-bearing parts of that spec are the GiST exclusion constraint (the
 * only thing standing between the shop and a double booking), the triggers that
 * keep booking_items consistent with their parent booking, and the two-role RLS
 * model that makes bookings unreachable on the storefront connection. A gate
 * that only reads the .sql file proves none of that actually landed.
 *
 *   node scripts/verify-schema.mjs
 *
 * Exits non-zero if any FAIL is reported, so it can gate a deploy later.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

// .env.local is not loaded for us outside Next, so parse it directly.
function loadEnv(path) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = {
  ...loadEnv(fileURLToPath(new URL("../.env.local", import.meta.url))),
  ...process.env,
};
const url = env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not found (looked in .env.local and the environment).");
  process.exit(2);
}

const sql = neon(url);

const results = [];
const record = (ok, label, detail = "") => {
  results.push({ ok, label, detail });
  const tag = ok ? "PASS" : "FAIL";
  console.log(`${tag}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

// Tables the spec creates, plus comms_log from 0010 (Phase 5). Retail's own
// tables land in 0002 (Phase 3), so they are not expected here.
const EXPECTED_TABLES = [
  "categories",
  "products",
  "product_variants",
  "bookings",
  "booking_items",
  "extension_requests",
  "reviews",
  "site_content",
  "settings",
  "sms_queue",
  "wa_contacts",
  "comms_log",
];

// Reachable on the storefront connection. Everything else must not be.
const PUBLIC_READABLE = ["categories", "products", "product_variants", "reviews"];
const MUST_BE_UNREACHABLE = [
  "bookings",
  "booking_items",
  "extension_requests",
  "sms_queue",
  "wa_contacts",
  "comms_log",
];

async function main() {
  console.log("Schema / RLS gate — live database\n");

  // ---- extensions --------------------------------------------------------
  const ext = await sql`SELECT extname FROM pg_extension WHERE extname = 'btree_gist'`;
  record(
    ext.length === 1,
    "btree_gist installed",
    ext.length ? "" : "the exclusion constraint cannot exist without it"
  );

  // ---- tables ------------------------------------------------------------
  const tables = (
    await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  ).map((r) => r.tablename);
  const missing = EXPECTED_TABLES.filter((t) => !tables.includes(t));
  record(
    missing.length === 0,
    `all ${EXPECTED_TABLES.length} spec tables present`,
    missing.length ? `missing: ${missing.join(", ")}` : `found: ${tables.join(", ")}`
  );

  // ---- the exclusion constraint: the whole double-booking defence ---------
  const excl = await sql`
    SELECT c.conname, pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'booking_items' AND c.contype = 'x'
  `;
  if (excl.length === 0) {
    record(false, "booking_items exclusion constraint", "ABSENT — double bookings are possible");
  } else {
    const def = excl[0].def;
    const hasProduct = /product_id/.test(def);
    const hasRange = /blocked_range|booked_range/.test(def);
    const hasStatusFilter = /WHERE/i.test(def);
    record(
      hasProduct && hasRange && hasStatusFilter,
      `booking_items exclusion constraint (${excl[0].conname})`,
      `${def}${
        hasProduct && hasRange && hasStatusFilter
          ? ""
          : "\n      missing one of: product_id equality, range overlap, status WHERE filter"
      }`
    );
  }

  // ---- triggers ----------------------------------------------------------
  const trg = (
    await sql`
      SELECT t.tgname, c.relname
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace
      ORDER BY c.relname, t.tgname
    `
  ).map((r) => `${r.relname}.${r.tgname}`);
  const onItems = trg.filter((n) => n.startsWith("booking_items."));
  const onBookings = trg.filter((n) => n.startsWith("bookings."));
  record(
    onItems.length > 0 && onBookings.length > 0,
    "booking triggers present",
    trg.length ? trg.join(", ") : "none found"
  );

  // ---- RLS enabled -------------------------------------------------------
  const rls = await sql`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
    ORDER BY c.relname
  `;
  const noRls = rls.filter((r) => !r.relrowsecurity).map((r) => r.relname);
  record(
    noRls.length === 0,
    "row level security enabled on every public table",
    noRls.length ? `RLS OFF: ${noRls.join(", ")}` : ""
  );

  // ---- policies ----------------------------------------------------------
  const pol = await sql`
    SELECT tablename, policyname, cmd, roles::text AS roles, qual
    FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname
  `;
  const polTables = [...new Set(pol.map((p) => p.tablename))];
  const missingPol = PUBLIC_READABLE.filter((t) => !polTables.includes(t));
  record(
    missingPol.length === 0,
    "read policies exist on the public catalogue tables",
    missingPol.length
      ? `no policy on: ${missingPol.join(", ")}`
      : pol.map((p) => `${p.tablename}: ${p.policyname} (${p.cmd}, ${p.roles})`).join("\n      ")
  );

  // ---- app_public role ---------------------------------------------------
  const role = await sql`
    SELECT rolname, rolcanlogin, rolsuper, rolbypassrls
    FROM pg_roles WHERE rolname = 'app_public'
  `;
  if (role.length === 0) {
    record(false, "app_public role exists", "the storefront connection has no role to use");
  } else {
    const r = role[0];
    record(
      !r.rolsuper && !r.rolbypassrls,
      "app_public is not superuser and does not bypass RLS",
      `super=${r.rolsuper} bypassrls=${r.rolbypassrls}`
    );
    record(
      r.rolcanlogin,
      "app_public can log in (password set in the Neon console)",
      r.rolcanlogin
        ? ""
        : "NOLOGIN — this is the known blocker: set the password in the Neon console, " +
          "then `ALTER ROLE app_public LOGIN`. DATABASE_URL_PUBLIC cannot connect until then."
    );
  }

  // ---- grants: the booking tables must be unreachable on app_public ------
  const grants = await sql`
    SELECT table_name, privilege_type
    FROM information_schema.role_table_grants
    WHERE grantee = 'app_public' AND table_schema = 'public'
    ORDER BY table_name, privilege_type
  `;
  const granted = new Map();
  for (const g of grants) {
    if (!granted.has(g.table_name)) granted.set(g.table_name, []);
    granted.get(g.table_name).push(g.privilege_type);
  }
  const leaked = MUST_BE_UNREACHABLE.filter((t) => granted.has(t));
  record(
    leaked.length === 0,
    "no grants to app_public on booking or comms tables",
    leaked.length
      ? `LEAK: app_public can reach ${leaked
          .map((t) => `${t} (${granted.get(t).join("/")})`)
          .join(", ")}`
      : ""
  );

  const writeGrants = [...granted.entries()].filter(([, privs]) =>
    privs.some((p) => ["INSERT", "UPDATE", "DELETE", "TRUNCATE"].includes(p))
  );
  record(
    writeGrants.length === 0,
    "app_public holds no write grants anywhere",
    writeGrants.length
      ? `writable: ${writeGrants.map(([t, p]) => `${t} (${p.join("/")})`).join(", ")}`
      : `read grants: ${[...granted.keys()].join(", ") || "none"}`
  );

  // ---- live proof on the storefront connection ---------------------------
  // The catalog checks above say what the grants and policies claim. This
  // connects as app_public and makes the database prove it, which is the only
  // version of this check that would survive a mistake in the ones above.
  if (!env.DATABASE_URL_PUBLIC) {
    record(false, "DATABASE_URL_PUBLIC is set", "cannot run the live storefront-connection proof");
  } else {
    const pub = neon(env.DATABASE_URL_PUBLIC);

    let whoami = null;
    try {
      const r = await pub`SELECT current_user AS u`;
      whoami = r[0].u;
      record(whoami === "app_public", "storefront connection authenticates as app_public", `current_user = ${whoami}`);
    } catch (e) {
      record(false, "storefront connection can connect", e.message);
    }

    if (whoami) {
      try {
        const r = await pub`SELECT count(*)::int AS n FROM products`;
        record(true, "app_public can read the catalogue", `products visible: ${r[0].n}`);
      } catch (e) {
        record(false, "app_public can read the catalogue", e.message);
      }

      // Every one of these must be refused. A success here is a data leak.
      for (const t of MUST_BE_UNREACHABLE) {
        let blocked = false;
        let why = "";
        try {
          await pub.query(`SELECT 1 FROM ${t} LIMIT 1`);
        } catch (e) {
          blocked = true;
          why = e.message.split("\n")[0];
        }
        record(blocked, `app_public is refused on ${t}`, blocked ? why : "READ SUCCEEDED — this is a leak");
      }
    }
  }

  // ---- summary -----------------------------------------------------------
  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed` +
      (failed.length ? `\nFAILED: ${failed.map((f) => f.label).join("; ")}` : "")
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("gate errored:", e.message);
  process.exit(2);
});
