/**
 * Shop details gate: the owner's Settings reach every page that shows them.
 *
 *   cd site && npx tsx --env-file=.env.local scripts/verify-shop-info.mts
 *
 * Needs the dev server on :3000. WRITES to the database: the `shop_info`
 * settings row, snapshotted first and put back exactly in `finally` (through
 * the panel too, so the KV copy is put back with it).
 *
 *   1. With nothing set, no page prints a placeholder, the owner-only rows are
 *      hidden, and the built-in address, hours and price are shown.
 *   2. A save in the panel reaches each page that uses each field.
 *   3. Bad input is refused by name, nothing is saved, and what she typed stays.
 *   4. The rental terms reach /policies, and a long dash is refused there too.
 *   5. Pages read the KV copy, not Neon: the row is changed behind the panel's
 *      back and the page does not follow it.
 */
import { neon } from "@neondatabase/serverless";
import { chromium, type Page } from "@playwright/test";
import { SESSION_COOKIE, createSession } from "../lib/adminAuth.ts";
import { SHOP } from "../lib/site.ts";

const BASE = "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL!);
const results: { ok: boolean; label: string; detail: string }[] = [];
const check = (ok: boolean, label: string, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

type Row = Record<string, unknown>;
const row = async () => ((await sql`select value from settings where key = 'shop_info'`) as { value: Row }[])[0].value;
const FIELDS = ["address", "maps_url", "hours", "town", "getting_here", "why_back", "purchase_price", "retention"] as const;

const TERMS = ["terms_extensions", "terms_damage", "terms_pickup", "terms_charges"] as const;
const OWN_TERMS = {
  terms_extensions: "Ask before your return day and we add the days if they are free.",
  terms_damage: "Small marks are cleaned by us.\n\nTears are charged at the cost of the repair.",
  terms_pickup: "Collect the day before and bring it back the day after.",
  terms_charges: "A refundable deposit is taken at pickup.",
};

const OWN = {
  address: "12 Verify Lane, Probe Bazaar",
  maps_url: "https://maps.app.goo.gl/verifyProbe123",
  hours: "Tue to Sun, 10am to 9pm",
  town: "Probetown",
  getting_here: "Opposite the clock tower, park in the lane behind",
  why_back: "They come back because the fittings are done while they wait",
  purchase_price: "1,23,456",
  retention: "eighteen months",
};

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
await ctx.addCookies([{ name: SESSION_COOKIE, value: await createSession(), url: BASE, httpOnly: true, sameSite: "Lax" }]);
const page = await ctx.newPage();

const text = async (route: string) => {
  const p = await ctx.newPage();
  await p.goto(BASE + route, { waitUntil: "load", timeout: 180000 });
  const t = await p.locator("body").innerText();
  const html = await p.content();
  await p.close();
  return { t, html };
};

async function fillShop(p: Page, values: Record<string, string>) {
  await p.goto(`${BASE}/admin/settings`, { waitUntil: "load", timeout: 180000 });
  for (const f of FIELDS) await p.fill(`#${f}`, values[f] ?? "");
  await p.locator("form:has(#address) button[type=submit]").click();
}
const saved = (p: Page) =>
  p.locator("form:has(#address) [role=status]").filter({ hasText: "Saved." }).waitFor({ timeout: 60000 }).then(() => true, () => false);

const snapshot = await row();
try {
  // ---------------------------------------------------------- 1. nothing set
  await sql`update settings set value = value - ${[...FIELDS, ...TERMS]}::text[] where key = 'shop_info'`;
  await fillShop(page, {}); // through the panel, so the KV copy is emptied too
  check(await saved(page), "an all-empty save is accepted");
  for (const route of ["/", "/retail", "/visit", "/rentals", "/privacy", "/policies"]) {
    const { t } = await text(route);
    check(!t.includes("TODO(owner)"), `${route}: no placeholder printed`);
    if (route === "/") check(!/Why people come back|The town/.test(t), "/: the owner-only rows are hidden while unset");
    if (route === "/retail") check(!/The town/.test(t), "/retail: the town row is hidden while unset");
    if (route === "/visit") check(!/Getting here/.test(t), "/visit: getting here is hidden while unset");
    if (route === "/rentals") check(t.includes("80,000"), "/rentals: the built-in purchase figure is shown");
    if (route === "/privacy") check(/has not set a period yet/.test(t), "/privacy: says no period is set");
    if (route === "/policies") {
      check(t.includes(SHOP.address) && t.includes(SHOP.hours), "/policies: footer falls back to the built-in address and hours");
      check(/Being finalised/.test(t) && !/Charges/.test(t), "/policies: says the terms are being set, and has no charges clause");
    }
  }

  // ---------------------------------------------------------- 3. refusals
  const before = JSON.stringify(await row());
  await fillShop(page, { ...OWN, maps_url: "http://not-secure.example", purchase_price: "lots", town: "Probe \u2014 town" });
  const marked = await page
    .waitForFunction(() => document.getElementById("maps_url")?.getAttribute("aria-invalid") === "true", undefined, { timeout: 60000 })
    .then(() => true, () => false);
  check(marked, "a non-https map link is refused and marked");
  const errs = await page.locator("form:has(#address) [role=alert]").allInnerTexts();
  check(
    errs.some((e) => /https/.test(e)) && errs.some((e) => /whole rupees/.test(e)) && errs.some((e) => /long dashes/.test(e)),
    "each refusal says what is wrong",
    JSON.stringify(errs),
  );
  check(await page.evaluate(() => document.activeElement?.id === "maps_url"), "focus moves to the first bad field in reading order");
  check(JSON.stringify(await row()) === before, "nothing was saved");
  check((await page.inputValue("#purchase_price")) === "lots", "what she typed is still there");

  // ---------------------------------------------------------- 2. a real save
  await fillShop(page, OWN);
  check(await saved(page), "a good save is accepted");
  const r = await row();
  check(r.address === OWN.address && r.purchase_price === 123456 && r.retention === OWN.retention, "and stored", JSON.stringify(r));

  const home = await text("/");
  check(home.t.includes(OWN.why_back) && home.t.includes(OWN.town), "/: why people come back, and the town");
  check(home.html.includes(encodeURIComponent(`${SHOP.name}, ${OWN.address}`)), "/: the map embed searches her address");
  check(home.html.includes(OWN.maps_url), "/: directions use her Maps link");
  check((await text("/retail")).t.includes(OWN.town), "/retail: the town");
  const visit = await text("/visit");
  check(visit.t.includes(OWN.town) && visit.t.includes(OWN.getting_here), "/visit: getting here, town and landmark");
  check(visit.t.includes(OWN.address) && visit.t.includes(OWN.hours), "/visit: address and hours");
  check((await text("/rentals")).t.includes("1,23,456"), "/rentals: her purchase figure");
  const priv = await text("/privacy");
  check(priv.t.includes(`for ${OWN.retention}`) && !/has not set a period yet/.test(priv.t), "/privacy: her retention period");
  const pol = await text("/policies");
  check(pol.t.includes(OWN.address) && pol.t.includes(OWN.hours), "/policies: the footer carries her address and hours");
  check(!pol.t.includes(SHOP.address), "and not the built-in placeholder");

  // ---------------------------------------------------------- 4. the terms
  const termsSubmit = async (values: Record<string, string>) => {
    await page.goto(`${BASE}/admin/settings`, { waitUntil: "load", timeout: 180000 });
    for (const f of TERMS) await page.fill(`#${f}`, values[f] ?? "");
    await page.locator("form:has(#terms_extensions) button[type=submit]").click();
  };
  const beforeTerms = JSON.stringify(await row());
  await termsSubmit({ ...OWN_TERMS, terms_damage: "Marks \u2014 cleaned" });
  const termMarked = await page
    .waitForFunction(() => document.getElementById("terms_damage")?.getAttribute("aria-invalid") === "true", undefined, { timeout: 60000 })
    .then(() => true, () => false);
  check(termMarked && (await page.evaluate(() => document.activeElement?.id === "terms_damage")), "terms: a long dash is refused, marked and focused");
  check(JSON.stringify(await row()) === beforeTerms, "terms: nothing was saved");
  await termsSubmit(OWN_TERMS);
  check(
    await page.locator("form:has(#terms_extensions) [role=status]").filter({ hasText: "Saved." }).waitFor({ timeout: 60000 }).then(() => true, () => false),
    "terms: a good save is accepted",
  );
  const terms = await text("/policies");
  check(
    [OWN_TERMS.terms_extensions, "Small marks are cleaned by us.", "Tears are charged", OWN_TERMS.terms_pickup, OWN_TERMS.terms_charges].every((x) => terms.t.includes(x)),
    "/policies: each term in her words, with her paragraph break kept",
  );
  check(/Set by the shop/.test(terms.t) && !/Full terms are being set/.test(terms.t), "/policies: stops saying the terms are being set");
  check(terms.html.includes('href="#charges"'), "/policies: charges is in the contents once written");
  check(terms.t.includes(OWN.address), "/policies: the terms save kept her shop details in the KV copy");

  // ---------------------------------------------------------- 5. the KV copy
  await sql`update settings set value = value || '{"address":"Changed Behind The Panel"}'::jsonb where key = 'shop_info'`;
  const behind = await text("/policies");
  check(
    behind.t.includes(OWN.address) && !behind.t.includes("Changed Behind The Panel"),
    "pages read the KV copy the panel wrote, not Neon",
    "a route with no database of its own does not wake Neon for the footer",
  );
} catch (e) {
  check(false, "the run itself", e instanceof Error ? (e.stack ?? e.message) : String(e));
} finally {
  // Put the row back exactly, then save its values through the panel so the
  // KV copy matches it again.
  await sql`update settings set value = ${JSON.stringify(snapshot)}::jsonb where key = 'shop_info'`;
  const vals = Object.fromEntries(
    FIELDS.map((f) => [f, snapshot[f] === undefined || snapshot[f] === null ? "" : String(snapshot[f])]),
  );
  await fillShop(page, vals).catch(() => {});
  await saved(page);
  await sql`update settings set value = ${JSON.stringify(snapshot)}::jsonb where key = 'shop_info'`;
  check(JSON.stringify(await row()) === JSON.stringify(snapshot), "cleanup: the shop_info row is exactly as it was found");
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("FAILED:\n" + failed.map((f) => `  ${f.label}`).join("\n"));
  process.exit(1);
}
