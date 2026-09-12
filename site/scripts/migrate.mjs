/**
 * Migration runner.
 *
 * Until now there was no migrations directory at all: 0001 was applied to Neon
 * by hand from specs/schema.sql, and nothing recorded that it had been. That is
 * survivable with one migration and one developer, and stops being survivable
 * the moment Phase 3's retail tables land, because nothing can then answer
 * "which of these has this database already had?"
 *
 *   node scripts/migrate.mjs                  # status. Read-only. The default.
 *   node scripts/migrate.mjs --up             # apply everything pending
 *   node scripts/migrate.mjs --up --dry-run   # print what --up would do
 *   node scripts/migrate.mjs --baseline 0001  # record as applied WITHOUT running
 *
 * Nothing is written unless a flag asks for it, following scripts/fix-emdash.mjs.
 *
 * BASELINE exists for exactly one situation, which is the one this repo is in:
 * the schema is already live in Neon, so running 0001 would either fail on
 * every `create table` or, worse, partially succeed. Baselining records the
 * migration as applied and executes none of it. Use it only for migrations you
 * have personally confirmed are already in the database — scripts/verify-schema.mjs
 * is what confirms that for 0001, and it passes 17/17.
 *
 * The pg protocol is used rather than the neon() HTTP driver because a
 * migration is many statements that must land together or not at all. The HTTP
 * driver takes one statement per call, and splitting a .sql file on ";" would
 * shred the eight dollar-quoted trigger bodies in 0001.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import path from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";

// Node 22+ ships a global WebSocket, which is all the driver needs; without
// this the pooled (pg-protocol) client cannot open a connection at all.
if (!neonConfig.webSocketConstructor && typeof WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = WebSocket;
}

const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations", import.meta.url));

function loadEnv(p) {
  let raw;
  try {
    raw = readFileSync(p, "utf8");
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

// The OWNER connection, never DATABASE_URL_PUBLIC: app_public is the
// storefront role and is deliberately refused DDL and every booking table.
const url = env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not found (looked in .env.local and the environment).");
  process.exit(2);
}

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f) => {
  const i = argv.indexOf(f);
  return i === -1 ? null : argv[i + 1];
};

const DRY = has("--dry-run");
const UP = has("--up");
const BASELINE = valueOf("--baseline");

const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex").slice(0, 16);

function onDisk() {
  let names;
  try {
    names = readdirSync(MIGRATIONS_DIR);
  } catch {
    console.error(`No migrations directory at ${MIGRATIONS_DIR}`);
    process.exit(2);
  }
  return names
    .filter((n) => n.endsWith(".sql"))
    .sort()
    .map((name) => {
      const body = readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
      return { name, version: name.split("_")[0], body, checksum: sha(body) };
    });
}

const pool = new Pool({ connectionString: url });
let exitCode = 0;

try {
  const client = await pool.connect();
  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        version     text primary key,
        name        text not null,
        checksum    text not null,
        applied_at  timestamptz not null default now(),
        baselined   boolean not null default false
      )`);

    /* RLS is not optional on this table, and forgetting it was caught by
       scripts/verify-schema.mjs the first time this ran: that gate asserts row
       level security on EVERY public table, and a bookkeeping table is no
       exception. With RLS on and no policy, every non-owner role is denied by
       default; the owner role this script connects as bypasses it, which is the
       only access the runner needs. app_public is revoked explicitly as well,
       so the storefront connection cannot even read the migration history. */
    await client.query(
      "alter table public.schema_migrations enable row level security"
    );
    await client.query(`
      do $$
      begin
        if exists (select 1 from pg_roles where rolname = 'app_public') then
          revoke all on public.schema_migrations from app_public;
        end if;
      end $$`);

    const { rows: applied } = await client.query(
      "select version, name, checksum, applied_at, baselined from public.schema_migrations order by version"
    );
    const byVersion = new Map(applied.map((r) => [r.version, r]));
    const files = onDisk();

    /* ---- baseline ---- */
    if (BASELINE) {
      const f = files.find((x) => x.version === BASELINE || x.name === BASELINE);
      if (!f) {
        console.error(`No migration matching "${BASELINE}" in ${MIGRATIONS_DIR}`);
        process.exit(2);
      }
      if (byVersion.has(f.version)) {
        console.log(`${f.name} is already recorded. Nothing to do.`);
      } else if (DRY) {
        console.log(`[dry run] would record ${f.name} as applied WITHOUT running it.`);
      } else {
        await client.query(
          `insert into public.schema_migrations (version, name, checksum, baselined)
           values ($1, $2, $3, true)`,
          [f.version, f.name, f.checksum]
        );
        console.log(`Baselined ${f.name} — recorded as applied, not executed.`);
      }
    }

    /* ---- up ---- */
    if (UP) {
      const fresh = BASELINE
        ? (await client.query("select version from public.schema_migrations")).rows.map(
            (r) => r.version
          )
        : [...byVersion.keys()];
      const pending = files.filter((f) => !fresh.includes(f.version));

      if (pending.length === 0) {
        console.log("Nothing pending.");
      }
      for (const f of pending) {
        if (DRY) {
          console.log(`[dry run] would apply ${f.name} (${f.body.length} bytes)`);
          continue;
        }
        console.log(`Applying ${f.name}…`);
        // One transaction per migration: a half-applied migration is the worst
        // possible outcome, because nothing afterwards can tell how far it got.
        await client.query("begin");
        try {
          await client.query(f.body);
          await client.query(
            `insert into public.schema_migrations (version, name, checksum) values ($1, $2, $3)`,
            [f.version, f.name, f.checksum]
          );
          await client.query("commit");
          console.log(`  applied ${f.name}`);
        } catch (e) {
          await client.query("rollback");
          console.error(`  FAILED ${f.name} — rolled back, nothing was written.`);
          console.error(`  ${e.message}`);
          exitCode = 1;
          break;
        }
      }
    }

    /* ---- status (always printed last) ---- */
    const { rows: now } = await client.query(
      "select version, name, checksum, applied_at, baselined from public.schema_migrations order by version"
    );
    const state = new Map(now.map((r) => [r.version, r]));

    console.log("\nmigration                         state      checksum");
    console.log("------------------------------------------------------------");
    for (const f of files) {
      const row = state.get(f.version);
      let mark;
      if (!row) mark = "PENDING";
      else if (row.checksum !== f.checksum) mark = "CHANGED";
      else mark = row.baselined ? "baseline" : "applied";

      // A CHANGED migration means an already-applied file was edited after the
      // fact. The database no longer matches the repo and no runner can fix
      // that; it needs a new migration, not a rewritten old one.
      if (mark === "CHANGED") exitCode = 1;
      console.log(
        `${f.name.padEnd(33)} ${mark.padEnd(10)} ${f.checksum}` +
          (mark === "CHANGED" ? `  (recorded ${row.checksum})` : "")
      );
    }

    const orphans = now.filter((r) => !files.some((f) => f.version === r.version));
    for (const o of orphans) {
      console.log(`${(o.name || o.version).padEnd(33)} ${"ORPHAN".padEnd(10)} recorded but no file`);
      exitCode = 1;
    }

    if (!UP && !BASELINE) {
      console.log("\nRead-only. Pass --up to apply, or --baseline <version> to record.");
    }
  } finally {
    client.release();
  }
} catch (e) {
  console.error(`Migration runner failed: ${e.message}`);
  exitCode = 2;
} finally {
  await pool.end();
}

process.exit(exitCode);
