/**
 * Owner-editable message wording: specs/COMMS_TEMPLATES_SPEC.md.
 *
 *   cd site && npx tsx --env-file=.env.local scripts/verify-templates.mts
 *
 * Proves four things, in this order:
 *
 *   1. Moving the copy out of code changed nothing she would read. Every
 *      message the old code produced (read out of git at 3f3baed, the last
 *      commit before templates) is reproduced byte for byte, across rentals,
 *      one-day collections, mixed baskets, with and without a time, a reason, a
 *      token. The two deliberate changes are asserted as exactly themselves.
 *   2. The save rules refuse what they say they refuse, by name.
 *   3. A broken stored override never silences a message: the built-in wording
 *      goes out and comms_log says why. Proved through `notify` against Neon.
 *   4. The panel: a rejected save writes nothing and keeps what she typed, a
 *      good one is stored, one identical to the built-in is stored as nothing,
 *      and "go back" clears it. Through real Chrome.
 *
 * Requires the dev server on :3000. WRITES to the database: one throwaway
 * product and booking (slug `zz-verify-tpl-*`) and the `comms.templates`
 * settings row, which is snapshotted first and put back exactly in `finally`.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { neon } from "@neondatabase/serverless";
import { chromium } from "@playwright/test";
import { createBooking } from "../lib/booking.ts";
import { addDays, todayIST, weekday } from "../lib/bookingRules.ts";
import { SHOP } from "../lib/site.ts";
import { SESSION_COOKIE, createSession } from "../lib/adminAuth.ts";
import {
  SLOTS,
  compose,
  customerMessage,
  fill,
  ownerMessage,
  slotFor,
  validate,
  type Extra,
  type Message,
  type Template,
} from "../lib/comms/messages.ts";
import { notify } from "../lib/comms/index.ts";
import { clearTemplate, storeTemplate } from "../lib/comms/templates.ts";
import type { CommsBooking, EventKind, Recipient } from "../lib/comms/types.ts";

const BASE = "http://localhost:3000";
const LEGACY_REF = "3f3baed";
const sql = neon(process.env.DATABASE_URL!);

const results: { ok: boolean; label: string; detail: string }[] = [];
const check = (ok: boolean, label: string, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

const KINDS: EventKind[] = [
  "booking.created", "booking.confirmed", "booking.declined", "booking.lapsed",
  "booking.cancelled_shop", "booking.cancelled_no_answer", "booking.cancelled_customer",
  "extension.requested", "extension.approved", "extension.rejected",
  "reminder.pickup", "reminder.return",
];

// ------------------------------------------------------------------ the old copy
// Read out of git rather than kept as a copy in the tree, so there is one
// source for it and it cannot drift. Its `@/` imports are pointed at the real
// modules, so SHOP and the formatters are the ones the new code uses.
const siteDir = resolve(import.meta.dirname, "..");
const legacyDir = mkdtempSync(join(tmpdir(), "verify-templates-"));
const legacyFile = join(legacyDir, "legacy-messages.ts");
const legacySrc = execFileSync("git", ["show", `${LEGACY_REF}:site/lib/comms/messages.ts`], { cwd: siteDir })
  .toString()
  .replace(/from "@\/lib\/([^"]+)"/g, (_, p) => `from "${pathToFileURL(join(siteDir, "lib", `${p}.ts`)).href}"`);
writeFileSync(legacyFile, legacySrc);
const legacy = (await import(pathToFileURL(legacyFile).href)) as {
  customerMessage: (k: EventKind, b: CommsBooking, e?: Extra) => Message | null;
  ownerMessage: (k: EventKind, b: CommsBooking, e?: Extra) => Message | null;
};

// ------------------------------------------------------------------ the bookings
const T = todayIST();
const d = (n: number) => addDays(T, n);
const created = `${T}T04:30:00Z`;
const inHours = (h: number) => new Date(Date.parse(created) + h * 3600000).toISOString().replace(".000Z", "Z");
const lehenga = { name: "Rani Pink Bridal Lehenga", type: "rental" as const, colour: null, size: null };
const gown = { name: "Midnight Gown", type: "rental" as const, colour: "Navy", size: null };
const choker = { name: "Kundan Choker Set", type: "jewellery" as const, colour: null, size: null };
const kurti = { name: "Chikankari Kurti", type: "retail" as const, colour: "Mint", size: "M" };
const coord = { name: "Linen Co-ord", type: "retail" as const, colour: null, size: "L" };
const base = { id: "x", code: "VVH-7K2M", name: "Priya Sharma", phone: "9876543210", createdAt: created };

const BOOKINGS: Record<string, CommsBooking> = {
  rental: { ...base, email: "priya@example.com", pickup: d(10), ret: d(12), time: "11:30", expiresAt: inHours(24), items: [lehenga] },
  collection: { ...base, email: null, pickup: d(4), ret: d(4), time: null, expiresAt: inHours(2), items: [kurti] },
  mixed: { ...base, email: "p@example.com", pickup: d(7), ret: d(9), time: "17:00", expiresAt: inHours(24), items: [lehenga, choker, kurti, coord] },
  "one-day rental": { ...base, email: null, pickup: d(5), ret: d(5), time: "12:00", expiresAt: inHours(3), items: [gown] },
  "confirmed, no deadline": { ...base, email: null, pickup: d(20), ret: d(23), time: null, expiresAt: null, items: [lehenga, gown] },
  "braces in her name": { ...base, name: "Anu {shop_phone}", email: null, pickup: d(3), ret: d(6), time: "11:00", expiresAt: inHours(1), items: [choker] },
};

const EXTRAS: Partial<Record<EventKind, Extra[]>> = {
  "booking.created": [{}, { token: "AbC-123_xyz" }],
  "booking.declined": [{}, { reason: "The lehenga is with the tailor that week." }, { reason: "" }],
  "booking.cancelled_shop": [{}, { reason: "The piece was damaged at its last fitting." }],
  "extension.requested": [{ newReturn: d(30) }, {}],
  "extension.approved": [{}, { newReturn: d(31) }],
};

// A combination the engine never raises: the return reminder only goes to a
// basket with something rented in it (lib/reminders.ts).
const raised = (kind: EventKind, b: CommsBooking) => kind !== "reminder.return" || b.items.some((i) => i.type !== "retail");

/**
 * The two deliberate changes, applied to the old output so each is asserted as
 * exactly itself and nothing else moved.
 */
function amended(who: Recipient, kind: EventKind, extra: Extra, m: Message): Message {
  if (who === "customer" && kind === "booking.cancelled_customer") {
    const tail = `\n\n${SHOP.name}`;
    if (!m.text.endsWith(tail)) throw new Error("old cancelled_customer copy no longer ends with the shop name");
    const phone = `If you change your mind, call us on ${SHOP.phone} and we will see what we can do.`;
    return { ...m, text: `${m.text.slice(0, -tail.length)}\n\n${phone}${tail}` };
  }
  if (who === "customer" && kind === "booking.created" && extra.token) {
    return { ...m, text: m.text.replace(`?t=${extra.token}`, `?k=${extra.token}`) };
  }
  return m;
}

// ================================================================== 1. byte for byte
{
  let compared = 0;
  let skipped = 0;
  const mismatches: string[] = [];
  for (const [bname, b] of Object.entries(BOOKINGS)) {
    for (const kind of KINDS) {
      if (!raised(kind, b)) {
        skipped++;
        continue;
      }
      for (const extra of EXTRAS[kind] ?? [{}]) {
        for (const who of ["customer", "owner"] as const) {
          const old = who === "customer" ? legacy.customerMessage(kind, b, extra) : legacy.ownerMessage(kind, b, extra);
          const expected = old && amended(who, kind, extra, old);
          const viaWrapper = who === "customer" ? customerMessage(kind, b, extra) : ownerMessage(kind, b, extra);
          // What notify actually sends when nothing is stored.
          const viaNotifyPath = compose(who, kind, b, extra, { overrides: {} });
          compared++;
          const same = (m: Message | null | undefined) =>
            m === null || m === undefined ? expected === null : !!expected && m.subject === expected.subject && m.text === expected.text;
          if (!same(viaWrapper) || !same(viaNotifyPath?.message ?? null) || (viaNotifyPath && viaNotifyPath.fallback !== null)) {
            mismatches.push(
              `${who} ${kind} / ${bname} / ${JSON.stringify(extra)}\n        want ${JSON.stringify(expected)}\n        got  ${JSON.stringify(viaNotifyPath?.message ?? null)}`,
            );
          }
        }
      }
    }
  }
  check(
    mismatches.length === 0,
    `with nothing stored, every message is byte for byte what ${LEGACY_REF} sent (${compared} compared)`,
    mismatches.length ? mismatches.slice(0, 4).join("\n      ") : `${skipped} never-raised combinations left out`,
  );

  // The two amendments really are in the output, not merely tolerated.
  const tok = customerMessage("booking.created", BOOKINGS.rental, { token: "AbC-123_xyz" })!.text;
  check(tok.includes("/booking/VVH-7K2M?k=AbC-123_xyz") && !tok.includes("?t="), "the first message's link uses ?k=, the key /booking/[code] reads");
  const conf = customerMessage("booking.confirmed", BOOKINGS.rental, { token: "AbC-123_xyz" })!.text;
  check(!conf.includes("AbC-123_xyz"), "and the raw token goes in the first message only, even if handed to another");
  const cc = customerMessage("booking.cancelled_customer", BOOKINGS.mixed)!.text;
  check(cc.includes(SHOP.phone), "the cancelled-by-her message now carries the shop's number like every other");
}

// ================================================================== coherence
{
  const bad = SLOTS.map((s) => [s.id, validate(s.builtIn, s)] as const).filter(([, e]) => Object.keys(e).length);
  check(bad.length === 0, "every built-in message passes the rules the owner's wording is held to", JSON.stringify(bad));

  check(
    SLOTS.length === 16 && SLOTS.filter((s) => s.who === "customer").length === KINDS.length,
    "sixteen messages: one to her for each of the twelve events, four to the shop",
    `${SLOTS.length} slots`,
  );

  // Every placeholder that can come out empty is declared as able to, because
  // that declaration is what keeps a required one off a line that can vanish.
  const undeclared: string[] = [];
  for (const [bname, b] of Object.entries(BOOKINGS)) {
    for (const s of SLOTS) {
      if (!raised(s.kind, b)) continue;
      for (const extra of EXTRAS[s.kind] ?? [{}]) {
        const v = fill(s.who, s.kind, b, extra);
        for (const n of s.uses) if (v[n] === "" && !(n in s.optional)) undeclared.push(`${s.id} {${n}} / ${bname}`);
      }
    }
  }
  check(undeclared.length === 0, "every placeholder that can be empty is declared so", undeclared.slice(0, 5).join("; "));

  const phones = SLOTS.filter((s) => s.who === "customer").every((s) => s.required.includes("shop_phone"));
  const links = SLOTS.filter((s) => s.who === "customer" && s.builtIn.text.includes("{status_link}")).every((s) =>
    s.required.includes("status_link"),
  );
  const admin = SLOTS.filter((s) => s.who === "owner").every((s) => s.required.includes("admin_link"));
  check(phones && links && admin, "required: the phone in every message to her, her link where the built-in has it, the panel link to the shop");
}

// ================================================================== 2. save rules
{
  const slot = (id: string) => SLOTS.find((s) => s.id === id)!;
  const created = slot("customer:booking.created");
  const declined = slot("customer:booking.declined");
  const lapsed = slot("customer:booking.lapsed");
  const owner = slot("owner:booking.created");
  const edit = (s: typeof created, p: Partial<Template>) => validate({ ...s.builtIn, ...p }, s);

  const refusals: [string, { subject?: string; text?: string }, "subject" | "text", RegExp][] = [
    ["an unknown placeholder, by name", edit(created, { text: created.builtIn.text.replace("Namaste {name}", "Namaste {nmae}") }), "text", /\{nmae\}/],
    ["a placeholder this message cannot use, by name", edit(created, { text: `${created.builtIn.text}\n{admin_link}` }), "text", /\{admin_link\}/],
    ["a spaced-out placeholder, by name", edit(created, { subject: "Hello { name }" }), "subject", /\{ name \}/],
    ["a stray brace", edit(created, { text: `Hello {name\n${created.builtIn.text}` }), "text", /\{ or \}/],
    ["an empty subject", edit(created, { subject: "   " }), "subject", /cannot be empty/],
    ["a subject over two lines", edit(created, { subject: "We have it\n{name}" }), "subject", /one line/],
    ["a placeholder that can be empty, in the subject", edit(declined, { subject: "{reason}" }), "subject", /\{reason\} can be empty/],
    ["a long dash in the subject", edit(created, { subject: "We have it \u2014 {name}" }), "subject", /long dashes/],
    ["a long dash in the message", edit(created, { text: created.builtIn.text.replace("Namaste {name},", "Namaste {name} \u2014") }), "text", /long dashes/],
    ["her message without the shop's phone", edit(lapsed, { text: lapsed.builtIn.text.replaceAll("{shop_phone}", "the shop") }), "text", /\{shop_phone\}/],
    ["the first message without her link", edit(created, { text: created.builtIn.text.replace("{status_link}", "your page") }), "text", /\{status_link\}/],
    ["a shop alert without the panel link", edit(owner, { text: "{contact}\n{items}" }), "text", /\{admin_link\}/],
    [
      "the phone on a line that can vanish",
      edit(declined, { text: "Namaste {name},\n\n{reason} Call us on {shop_phone}.\n\n{shop_name}" }),
      "text",
      /\{shop_phone\} shares a line with \{reason\}/,
    ],
    ["an empty message", edit(created, { text: "\n\n  " }), "text", /cannot be empty/],
  ];
  for (const [label, errors, field, re] of refusals) {
    check(re.test(errors[field] ?? ""), `refused: ${label}`, JSON.stringify(errors));
  }

  check(
    Object.keys(edit(declined, { text: declined.builtIn.text.replace("There may well be", "There could be") })).length === 0,
    "accepted: a declined message needs no link, because the built-in never gave one",
  );
  check(
    Object.keys(edit(created, { text: created.builtIn.text.replace("Namaste {name},", "Hello {name},") })).length === 0,
    "accepted: an ordinary edit",
  );
}

// ================================================================== 3a. fallback, pure
{
  const b = BOOKINGS.rental;
  const builtIn = customerMessage("booking.declined", b)!;
  const cases: [string, unknown][] = [
    ["an unknown placeholder", { subject: "About {code}", text: "Hi {nmae}. Call {shop_phone}." }],
    ["a missing phone", { subject: "About {code}", text: "Sorry." }],
    ["a subject that is not text", { subject: 5, text: "Call {shop_phone}." }],
    ["a row that is not an object", "just a string"],
  ];
  for (const [label, own] of cases) {
    const r = compose("customer", "booking.declined", b, {}, { overrides: { "customer:booking.declined": own } })!;
    check(
      r.message.subject === builtIn.subject && r.message.text === builtIn.text && !!r.fallback,
      `a stored override with ${label} sends the built-in wording and says why`,
      r.fallback ?? "no fallback recorded",
    );
  }
  const failed = compose("customer", "booking.declined", b, {}, { error: "connection refused" })!;
  check(
    failed.message.text === builtIn.text && /template read failed/.test(failed.fallback ?? ""),
    "a failed read of the stored wording sends the built-in wording and says so",
    failed.fallback ?? "",
  );

  const own = { subject: "About {code}", text: "Hello {name},\n\n{reason}\n\nRing us on {shop_phone}." };
  const good = compose("customer", "booking.declined", b, {}, { overrides: { "customer:booking.declined": own } })!;
  check(
    good.fallback === null && good.message.text === `Hello ${b.name},\n\nRing us on ${SHOP.phone}.`,
    "a good override is used, and a line whose placeholder is empty is left out of it",
    JSON.stringify(good.message.text),
  );
  const odd = compose("customer", "booking.lapsed", BOOKINGS["braces in her name"], {}, { overrides: {} })!;
  check(odd.message.text.startsWith("Namaste Anu {shop_phone},"), "a value with braces in it is printed as written, never expanded");
}

// ================================================================== 3b + 4. against Neon and the panel
const run = Math.random().toString(36).slice(2, 7);
const SLUG = `zz-verify-tpl-${run}`;
const KEY = "comms.templates";
type Row = { value: unknown; is_public: boolean };
let snapshot: Row | null | undefined; // undefined = not taken yet
const templatesRow = async () =>
  ((await sql`select value, is_public from settings where key = ${KEY}`) as Row[])[0] ?? null;
const logFor = async (id: string) =>
  (await sql`select recipient, status, detail from comms_log where booking_id = ${id} order by recipient`) as {
    recipient: string;
    status: string;
    detail: string | null;
  }[];

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
try {
  snapshot = await templatesRow();

  // ---- a real booking, so notify has something to load
  await sql`insert into products (type, name, slug, rental_price, prebook_charge, is_active)
            values ('rental', 'Verify Template Lehenga', ${SLUG}, 1000, 0, true)`;
  let pickup = addDays(T, 75);
  while (weekday(pickup) !== 2) pickup = addDays(pickup, 1);
  const made = await createBooking({
    items: [SLUG], pickup, ret: addDays(pickup, 2), time: "11:00",
    name: "Verify Template", phone: `97${String(Date.now()).slice(-8)}`, email: null, note: null,
  });
  if (!made.ok) throw new Error(`setup booking refused: ${JSON.stringify(made)}`);
  await sql`delete from comms_log where booking_id = ${made.id}`;

  // A broken override for her, written straight into the row as anything other
  // than the panel might, and a good one for the shop.
  await storeTemplate("customer:booking.created", { subject: "Hi {name}", text: "Namaste {nmae}. Call {shop_phone}. {status_link}" });
  await storeTemplate("owner:booking.created", { subject: "New: {code}", text: "{contact}\n{when}\n\n{admin_link}" });
  const sent = await notify("booking.created", made.id, { token: made.token });
  const rows = await logFor(made.id);
  const her = rows.find((r) => r.recipient === "customer");
  const shop = rows.find((r) => r.recipient === "owner");
  check(
    sent.length === 2 && rows.length === 2,
    "notify still sends both messages when one stored override is broken",
    rows.map((r) => `${r.recipient}: ${r.status} (${r.detail})`).join(" | "),
  );
  check(
    /built-in wording used, saved wording refused: \{nmae\}/.test(her?.detail ?? ""),
    "comms_log says her message fell back, and why",
    her?.detail ?? "no row",
  );
  check(
    her?.status === sent.find((s) => s.recipient === "customer")?.result.status && her?.status !== "failed",
    "and the fallback did not turn the send into a failure",
    `status ${her?.status}`,
  );
  check(!/built-in wording used/.test(shop?.detail ?? ""), "the shop's good override was used, with nothing to report", shop?.detail ?? "no row");

  await clearTemplate("customer:booking.created");
  await clearTemplate("owner:booking.created");
  await sql`delete from comms_log where booking_id = ${made.id}`;
  await notify("booking.created", made.id, { token: made.token });
  const clean = await logFor(made.id);
  check(
    clean.length === 2 && clean.every((r) => !/built-in wording used/.test(r.detail ?? "")),
    "with nothing stored, nothing is reported",
    clean.map((r) => `${r.recipient}: ${r.detail}`).join(" | "),
  );

  // ---- the link in her first message opens her booking
  const withK = await (await fetch(`${BASE}/booking/${made.code}?k=${made.token}`)).text();
  const withT = await (await fetch(`${BASE}/booking/${made.code}?t=${made.token}`)).text();
  check(
    !withK.includes("Open your booking.") && withT.includes("Open your booking."),
    "the ?k= link opens her booking; the old ?t= link only reached the lookup form",
  );

  // ---- the panel
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addCookies([{ name: SESSION_COOKIE, value: await createSession(), url: BASE, httpOnly: true, sameSite: "Lax" }]);
  const page = await ctx.newPage();

  await page.goto(`${BASE}/admin/messages`, { waitUntil: "load", timeout: 120000 });
  const rowsShown = await page.locator('main a[href^="/admin/messages/"], section a[href^="/admin/messages/"]').count();
  check(rowsShown >= 16, "the list shows all sixteen messages", `${rowsShown} links`);
  check(
    (await page.getByRole("link", { name: "Messages", exact: true }).first().getAttribute("aria-current")) === "page",
    "Messages is in the admin nav, and marked as the current page",
  );

  const slug = "customer-booking-declined";
  const id = "customer:booking.declined";
  const declined = slotFor("customer", "booking.declined")!;
  await page.goto(`${BASE}/admin/messages/${slug}`, { waitUntil: "load", timeout: 120000 });
  const previewText = () => page.locator("[data-preview-text]").innerText();
  const first = await previewText();
  check(
    first.includes("Priya Sharma") && first.includes(SHOP.phone) && !first.includes("{"),
    "the preview renders the built-in wording against a sample booking",
    first.slice(0, 80),
  );
  await page.fill("#subject", "Sorry about {code}");
  check(
    (await page.locator("[data-preview-subject]").innerText()) === "Sorry about VVH-7K2M",
    "the preview follows what she types",
  );

  // Rejected: nothing may reach the row, and what she typed must survive.
  const before = JSON.stringify(await templatesRow());
  const badText = declined.builtIn.text.replace("Call us on {shop_phone}", "Call us");
  await page.fill("#subject", "");
  await page.fill("#text", badText);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const marked = await page
    .waitForFunction(() => document.getElementById("subject")?.getAttribute("aria-invalid") === "true", undefined, { timeout: 60000 })
    .then(() => true)
    .catch(() => false);
  check(marked, "an empty subject and a message without the phone are refused");
  check(JSON.stringify(await templatesRow()) === before, "and nothing was saved");
  check((await page.inputValue("#text")) === badText, "and what she typed is still there");

  // Accepted.
  const goodText = declined.builtIn.text.replace("There may well be", "There could be");
  await page.fill("#subject", "About {code}, {name}");
  await page.fill("#text", goodText);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Saved.", { exact: true }).waitFor({ timeout: 60000 });
  const stored = ((await templatesRow())?.value as { en?: Record<string, Template> } | null)?.en?.[id];
  check(
    stored?.subject === "About {code}, {name}" && stored?.text === goodText,
    "a good save is stored, as typed",
    JSON.stringify(stored),
  );
  check((await templatesRow())?.is_public === false, "in a settings row the storefront cannot read");

  await page.goto(`${BASE}/admin/messages`, { waitUntil: "load", timeout: 120000 });
  const rowText = await page.locator(`a[href="/admin/messages/${slug}"]`).innerText();
  check(/Your wording/.test(rowText), "the list shows the message is in her wording", rowText.replace(/\s+/g, " "));

  // Go back.
  await page.goto(`${BASE}/admin/messages/${slug}`, { waitUntil: "load", timeout: 120000 });
  await page.getByRole("button", { name: "Go back to the built-in wording" }).click();
  await page.getByText("Back to the built-in wording.", { exact: true }).waitFor({ timeout: 60000 });
  const afterRevert = ((await templatesRow())?.value as { en?: Record<string, unknown> } | null)?.en ?? {};
  check(!(id in afterRevert), "going back removes her wording from the row");
  check(
    (await page.inputValue("#text")) === declined.builtIn.text && (await page.inputValue("#subject")) === declined.builtIn.subject,
    "and the fields show the built-in wording again",
  );

  // Saving the built-in wording unchanged stores nothing, so a later
  // improvement to the built-in copy is not frozen out.
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Saved.", { exact: true }).waitFor({ timeout: 60000 });
  const afterSame = ((await templatesRow())?.value as { en?: Record<string, unknown> } | null)?.en ?? {};
  check(!(id in afterSame), "saving the built-in wording unchanged stores no override");

  await ctx.close();
} catch (e) {
  check(false, "the run itself", e instanceof Error ? (e.stack ?? e.message) : String(e));
} finally {
  await browser.close();
  // Put the row back exactly as it was, including not existing.
  if (snapshot === null) await sql`delete from settings where key = ${KEY}`;
  else if (snapshot) await sql`update settings set value = ${JSON.stringify(snapshot.value)}::jsonb where key = ${KEY}`;
  await sql`delete from bookings where id in (
              select bi.booking_id from booking_items bi join products p on p.id = bi.product_id where p.slug = ${SLUG})`;
  await sql`delete from products where slug = ${SLUG}`;
  rmSync(legacyDir, { recursive: true, force: true });
  if (snapshot !== undefined) {
    check(JSON.stringify(await templatesRow()) === JSON.stringify(snapshot), "cleanup: the templates row is exactly as it was found");
  }
  const left = (await sql`select count(*)::int as n from products where slug like 'zz-verify-tpl-%'`) as { n: number }[];
  check(left[0].n === 0, "cleanup: no throwaway product or booking left behind", `remaining: ${left[0].n}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("FAILED:\n" + failed.map((f) => `  ${f.label}`).join("\n"));
  process.exit(1);
}
