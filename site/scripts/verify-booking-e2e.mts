/**
 * Booking engine, end to end through the real browser.
 *
 *   cd site && npx tsx --env-file=.env.local scripts/verify-booking-e2e.mts
 *
 * verify-booking.mts proves the library against Neon. This proves the layer above
 * it that the library gate cannot see: the form, the API routes, the redirect that
 * carries the access token, the status page, and the cancel control.
 *
 * Requires the dev server on :3000.
 *
 * WRITES to the database: one booking on a real catalogue piece, for dates far
 * enough ahead that holding them for the seconds this takes blocks nobody. The
 * row is deleted in `finally`, including after a failure. It never touches a
 * booking it did not create.
 */
import { chromium } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const BASE = "http://localhost:3000";

const results: { ok: boolean; label: string; detail: string }[] = [];
const check = (ok: boolean, label: string, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

let code: string | null = null;

// Real Chrome, as the other harnesses use: this project installs no Playwright
// browser binaries.
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
try {
  const [piece] = (await sql`
    select slug, name from products
     where type in ('rental','jewellery') and is_active = true
     order by created_at limit 1`) as { slug: string; name: string }[];
  if (!piece) throw new Error("no active rental or jewellery piece to book");

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));

  await page.goto(`${BASE}/reserve?items=${piece.slug}`, { waitUntil: "load" });

  // --- dates ---
  // Page to the last month the 180-day window allows and book there, so the hold
  // this places on a real piece is as far from a real customer's dates as the
  // engine permits. The first two open days in that month will do.
  const later = page.getByLabel("Later month");
  for (let i = 0; i < 24 && (await later.isEnabled()); i++) {
    await later.click();
    await page.waitForTimeout(120);
  }
  const open = page.locator('button[data-day][aria-disabled="false"]');
  const PICKUP = (await open.first().getAttribute("data-day"))!;
  check(!!PICKUP, "the calendar offers an open day in the last bookable month", PICKUP);
  await open.first().click();

  // Choosing a pickup re-computes which days can close the range.
  await page.waitForTimeout(250);
  const ends = page.locator('button[data-day][aria-disabled="false"]');
  const RETURN = (await ends.evaluateAll(
    (els, p) => els.map((e) => e.getAttribute("data-day")!).filter((d) => d > p).sort()[0],
    PICKUP
  ))!;
  check(!!RETURN, "and a day to return it", RETURN);
  await page.locator(`button[data-day="${RETURN}"]`).click();
  console.log(`\nbooking ${piece.name} (${piece.slug}) for ${PICKUP} → ${RETURN}\n`);

  // --- pickup time: the grid appears only once a pickup day is chosen ---
  await page.locator("#rv-time input[name=time]").first().waitFor({ timeout: 5000 });
  const slots = await page.locator("#rv-time input[name=time]").count();
  check(slots > 0, "pickup times appear for the chosen day", `${slots} slots`);
  await page.locator("#rv-time input[name=time]").first().check({ force: true });

  // --- details ---
  await page.fill("#rv-name", "Verify Run");
  await page.fill("#rv-phone", "9876543210");
  await page.fill("#rv-note", "Automated end-to-end check. Delete me.");

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/booking\/VVH-/, { timeout: 20000 });

  const url = new URL(page.url());
  code = url.pathname.split("/").pop()!;
  check(/^VVH-[0-9A-Z]{4}$/.test(code), "form posts and lands on the booking", code);
  check(url.searchParams.get("k")!.length > 20, "the redirect carries the access token");

  // --- the row the site actually wrote ---
  const [row] = (await sql`
    select b.status, b.pickup_time, b.customer_note,
           to_char(lower(b.booked_range), 'YYYY-MM-DD') as pickup,
           b.expires_at <= ((lower(b.booked_range) + b.pickup_time) at time zone 'Asia/Kolkata')
             as expiry_ok,
           b.access_hash is not null as has_hash,
           (select count(*)::int from booking_items where booking_id = b.id) as items
      from bookings b where b.code = ${code}`) as {
    status: string; pickup_time: string; customer_note: string; pickup: string;
    expiry_ok: boolean; has_hash: boolean; items: number;
  }[];
  check(row?.status === "pending", "the booking is written as a pending request", row?.status);
  check(row?.items === 1, "its piece is written with it", `${row?.items} item(s)`);
  check(row?.pickup === PICKUP, "on the day she picked", `${row?.pickup} vs ${PICKUP}`);
  check(!!row?.pickup_time, "at the time she picked", row?.pickup_time);
  check(!!row?.customer_note, "with what she typed", row?.customer_note);
  check(row?.has_hash, "only the hash of the access token is stored");
  // V2 §7 invariant 12.
  check(row?.expiry_ok, "the hold never outlives the pickup moment");

  // --- the status page tells her where she stands ---
  // Wait for the server component itself: app/loading.tsx stands in front of it
  // for a moment, and its text is not the page's.
  await page.getByText(code, { exact: false }).first().waitFor({ timeout: 15000 });
  const body = await page.locator("body").innerText();
  check(body.includes(code), "the status page names the booking code");
  check(/Requested/.test(body), "and says the shop has still to confirm it");
  check(/paid at the shop|pay at the shop|nothing is paid/i.test(body), "and that payment happens at the shop");
  check(!/UPI|UTR|advance/i.test(body), "it promises no payment step", "no UPI/UTR/advance on the page");

  // --- the phone-only route to the same page (no token) ---
  const fresh = await browser.newPage();
  await fresh.goto(`${BASE}/booking/${code}`, { waitUntil: "load" });
  const guarded = await fresh.locator("body").innerText();
  check(!guarded.includes("Verify Run"), "without the token the page withholds the booking");
  await fresh.close();

  // --- cancel, from the page, as a customer would: ask, then confirm ---
  const ask = page.getByRole("button", { name: "Cancel this booking" });
  check(await ask.count() > 0, "a cancel control is offered before the cutoff");
  await ask.click();
  const keep = page.getByRole("button", { name: "Keep the booking" });
  await keep.waitFor({ timeout: 5000 });
  check(await keep.evaluate((el) => el === document.activeElement), "the confirm step defaults to keeping it");
  await page.getByRole("button", { name: "Yes, cancel it" }).click();
  await page.waitForTimeout(3000);
  // CancelBooking's own error, if it refused. (Not every role=alert on the page:
  // Next's route announcer is one too, and it only ever holds the page title.)
  const refusal = page.locator('[role="alert"].text-danger');
  const said = (await refusal.count()) ? ` — said: ${await refusal.first().innerText()}` : "";

  const [after] = (await sql`
    select status, cancelled_by from bookings where code = ${code}`) as
    { status: string; cancelled_by: string }[];
  check(
    after?.status === "cancelled" && after?.cancelled_by === "customer",
    "cancelling from the page cancels it as the customer",
    JSON.stringify(after) + said
  );

  const [free] = (await sql`
    select count(*)::int as n from booking_items bi
      join bookings b on b.id = bi.booking_id
     where b.code = ${code} and bi.status <> 'cancelled'`) as { n: number }[];
  check(free.n === 0, "the dates are released with it", `${free.n} live item(s) left`);

  check(errors.length === 0, "no console or page errors through the whole flow", errors.slice(0, 3).join(" | "));
} finally {
  if (code) {
    await sql`delete from booking_items where booking_id in (select id from bookings where code = ${code})`;
    await sql`delete from bookings where code = ${code}`;
    const [left] = (await sql`select count(*)::int as n from bookings where code = ${code}`) as { n: number }[];
    check(left.n === 0, "cleanup: the verify booking is gone", `remaining: ${left.n}`);
  }
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("FAILED:\n" + failed.map((f) => `  ${f.label}${f.detail ? ` — ${f.detail}` : ""}`).join("\n"));
  process.exit(1);
}
