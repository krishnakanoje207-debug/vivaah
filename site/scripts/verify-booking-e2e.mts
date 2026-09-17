/**
 * Booking engine, end to end through the real browser.
 *
 *   cd site && npx tsx --env-file=.env.local scripts/verify-booking-e2e.mts
 *
 * verify-booking.mts proves the library against Neon. This proves the layer above
 * it that the library gate cannot see, by living one booking's whole life: she
 * fills the form, the site writes it and hands back a link, she reads her status
 * page, the shop confirms it in the admin panel, and she cancels it.
 *
 * It walks that life twice, because the shop has two trades and they promise
 * different things. The rental walk books a real catalogue piece by its dates.
 * The retail walk (RETAIL_SPEC §2) books a throwaway kurti by its size: the
 * count comes off the rail, the day stands alone, and no page may offer a
 * return date or a length for something nobody brings back.
 *
 * Requires the dev server on :3000.
 *
 * WRITES to the database: one booking on a real catalogue piece, for dates far
 * enough ahead that holding them for the seconds this takes blocks nobody, plus
 * a throwaway retail product (slug `zz-verify-retail-…`) with its variant, its
 * counts and its booking. All of it is deleted in `finally`, including after a
 * failure. It never touches a booking or a product it did not create.
 */
import { chromium, type Page } from "@playwright/test";
import { neon } from "@neondatabase/serverless";
import { SESSION_COOKIE, createSession } from "../lib/adminAuth.ts";

const sql = neon(process.env.DATABASE_URL!);
const BASE = "http://localhost:3000";

const results: { ok: boolean; label: string; detail: string }[] = [];
// A dev server compiles each route the first time it is asked for, and POST
// /api/bookings is not exercised by any other gate, so the first submit of a
// cold run can sit in the compiler for most of a minute. These waits are for a
// navigation that the run itself triggered, so a generous ceiling costs nothing
// on a warm server and is the difference between a gate that reports and a gate
// that dies with a Playwright timeout before its `finally` can tidy up.
const NAV_TIMEOUT = 90_000;

const check = (ok: boolean, label: string, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

let code: string | null = null;
let retailCode: string | null = null;
let retailSlug: string | null = null;

/**
 * Read until the answer settles, then hand back whatever the last read said so
 * a failure still reports the real row. A fixed wait cannot budget for the dev
 * server compiling a route or an action the first time it is hit, which is how
 * the cancel check came up false on a cold run.
 */
async function settled<T>(read: () => Promise<T>, done: (v: T) => boolean, ms = 25000): Promise<T> {
  const stop = Date.now() + ms;
  let v = await read();
  while (!done(v) && Date.now() < stop) {
    await new Promise((r) => setTimeout(r, 400));
    v = await read();
  }
  return v;
}

/**
 * Wait for Turnstile to issue a token, which the form will not submit without.
 *
 * The widget fetches its script from Cloudflare and calls back a few seconds
 * after load, and the steps between arriving and pressing Reserve do not
 * reliably take that long. When the click lands first the form refuses it and
 * says so ("we are still checking that this is coming from a person"), which
 * surfaces here as a navigation timeout that looks like a booking failure and
 * is nothing of the kind. A real visitor waits a second and presses it again;
 * this waits for the same thing she does, so the gate measures the booking
 * rather than the round trip to Cloudflare.
 */
async function awaitBotToken(p: Page): Promise<boolean> {
  return p
    .waitForFunction(
      () => {
        const i = document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null;
        return !!i && i.value.length > 0;
      },
      undefined,
      { timeout: 30_000 }
    )
    .then(() => true)
    .catch(() => false);
}

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

  check(await awaitBotToken(page), "the bot check issues a token before the form is sent");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/booking\/VVH-/, { timeout: NAV_TIMEOUT });

  const url = new URL(page.url());
  code = url.pathname.split("/").pop()!;
  check(/^VVH-[0-9A-Z]{4}$/.test(code), "form posts and lands on the booking", code);
  check(url.searchParams.get("k")!.length > 20, "the redirect carries the access token");

  // --- the notification the request raised (COMMS_FLOW_SPEC_V2 §5) ---
  // `after()` runs the send once the response has gone, so this reads until the
  // answer settles rather than asserting immediately. It waits for BOTH legs,
  // not merely for the table to stop being empty: `notify` records one channel
  // at a time, so a read taken between the two writes sees only the owner's row
  // and would fail a path that is working. With no RESEND_API_KEY on a dev
  // machine the honest expectation is two logged skips, which still proves the
  // whole path fired: the route reached `notify`, it loaded the booking, built
  // both messages, and wrote what each channel did.
  const comms = await settled(
    async () =>
      (await sql`
        select recipient, status, detail from comms_log
         where booking_id = (select id from bookings where code = ${code})`) as {
        recipient: string;
        status: string;
        detail: string | null;
      }[],
    (rows) => rows.length >= 2,
  );
  check(
    comms.length === 2 && comms.some((c) => c.recipient === "owner") && comms.some((c) => c.recipient === "customer"),
    "the request notifies the shop and the customer",
    comms.map((c) => `${c.recipient}: ${c.status}${c.detail ? ` (${c.detail})` : ""}`).join(" | ") || "nothing logged",
  );

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
  await page.getByText(code, { exact: false }).first().waitFor({ timeout: NAV_TIMEOUT });
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

  // --- the shop's half: the request has to be confirmable ---
  // A session is minted from SESSION_SECRET rather than typed into the login
  // form: only the password's hash is configured locally, and what is under test
  // here is the panel, not the login.
  const shop = await browser.newContext();
  await shop.addCookies([
    { name: SESSION_COOKIE, value: await createSession(), url: BASE, httpOnly: true, sameSite: "Lax" },
  ]);
  const admin = await shop.newPage();
  await admin.goto(`${BASE}/admin/bookings`, { waitUntil: "load" });
  check(!admin.url().includes("/admin/login"), "the panel opens for a signed-in shop", admin.url());
  const inbox = await admin.locator("body").innerText();
  check(inbox.includes(code), "the new request is in the inbox", code);
  check(/Verify Run/.test(inbox), "named, so she knows who to call");

  // The inbox links on her name, with the code beside it.
  await admin.getByRole("link", { name: "Verify Run" }).first().click();
  await admin.waitForURL(/\/admin\/bookings\/[0-9a-f-]{36}/, { timeout: NAV_TIMEOUT });
  const detail = await admin.locator("body").innerText();
  check(/9876543210|98765 43210/.test(detail), "the detail page carries the number to call her on");
  check(detail.includes("Automated end-to-end check"), "and the note she left");

  await admin.getByRole("button", { name: "Confirm booking" }).click();
  const confirmed = await settled(
    async () =>
      ((await sql`
        select status, verified_at is not null as stamped, expires_at
          from bookings where code = ${code}`) as
        { status: string; stamped: boolean; expires_at: string | null }[])[0],
    (r) => r?.status === "confirmed",
  );
  check(confirmed?.status === "confirmed", "one tap confirms the request", JSON.stringify(confirmed));
  check(confirmed?.stamped, "and records when the shop did it");
  check(confirmed?.expires_at === null, "a confirmed booking no longer lapses", String(confirmed?.expires_at));
  await shop.close();

  // She sees the answer on her own page.
  await page.reload({ waitUntil: "load" });
  await page.getByText(code, { exact: false }).first().waitFor({ timeout: NAV_TIMEOUT });
  check(/Confirmed/.test(await page.locator("body").innerText()), "her page says it is confirmed");

  // --- cancel, from the page, as a customer would: ask, then confirm ---
  const ask = page.getByRole("button", { name: "Cancel this booking" });
  check(await ask.count() > 0, "a cancel control is offered before the cutoff");
  await ask.click();
  const keep = page.getByRole("button", { name: "Keep the booking" });
  await keep.waitFor({ timeout: 5000 });
  check(await keep.evaluate((el) => el === document.activeElement), "the confirm step defaults to keeping it");
  await page.getByRole("button", { name: "Yes, cancel it" }).click();
  const after = await settled(
    async () =>
      ((await sql`
        select status, cancelled_by from bookings where code = ${code}`) as
        { status: string; cancelled_by: string }[])[0],
    (r) => r?.status === "cancelled",
  );
  // CancelBooking's own error, if it refused. (Not every role=alert on the page:
  // Next's route announcer is one too, and it only ever holds the page title.)
  const refusal = page.locator('[role="alert"].text-danger');
  const said = (await refusal.count()) ? ` — said: ${await refusal.first().innerText()}` : "";
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
  await page.close();

  // ==========================================================================
  // The other trade: a piece she keeps (specs/RETAIL_SPEC.md §2, §3.2, §3.3).
  //
  // The engine is the same one, so what is worth walking is what differs. The
  // hold is a count against a (colour, size) rather than a run of dates; the
  // basket of nothing but retail asks for one day; and the promises change,
  // because nothing she is buying comes back.
  //
  // It books a piece of its own rather than one of the shop's: a retail hold
  // takes a real unit off a real rail, and a run of this gate must not be able
  // to make the last kurti in M unbuyable for the seconds it takes.
  // ==========================================================================
  retailSlug = `zz-verify-retail-${Math.random().toString(36).slice(2, 7)}`;
  const [made] = (await sql`
    insert into products (type, name, slug, category_id, price, is_active)
    values ('retail', 'Verify Kurti', ${retailSlug},
            (select id from categories where slug = 'short-kurtis'), 900, true)
    returning id`) as { id: string }[];
  const [colour] = (await sql`
    insert into product_variants (product_id, colour_name, colour_hex)
    values (${made.id}, 'Verify colour', '#abcdef') returning id`) as { id: string }[];
  // Two sizes, one of each: the picker is then a real choice, so the size that
  // reaches the database is the one she pressed and not the only one there was.
  await sql`
    insert into variant_stock (variant_id, size, quantity)
    values (${colour.id}, 'M', 1), (${colour.id}, 'L', 1)`;

  const shopper = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const retailErrors: string[] = [];
  shopper.on("pageerror", (e) => retailErrors.push(`PAGEERROR ${e.message}`));
  shopper.on("console", (m) => m.type() === "error" && retailErrors.push(m.text().slice(0, 200)));

  await shopper.goto(`${BASE}/retail/${retailSlug}`, { waitUntil: "load" });
  check(
    (await shopper.locator("h1").first().innerText()).includes("Verify Kurti"),
    "the retail piece has a page of its own",
    retailSlug,
  );

  // --- the size is the question that page exists to answer ---
  const armed = shopper.getByRole("link", { name: /Reserve in size/ });
  check((await armed.count()) === 0, "with no size chosen there is nothing to reserve");
  await shopper.getByRole("button", { name: "M", exact: true }).click();
  await armed.first().waitFor({ timeout: 5000 });
  check(true, "choosing a size arms the reserve link", await armed.first().innerText());
  await armed.first().click();
  await shopper.waitForURL(/\/reserve\?/, { timeout: NAV_TIMEOUT });
  const carried = new URL(shopper.url()).searchParams;
  check(
    carried.get("size") === "M" && carried.get("variant") === colour.id,
    "the colour and the size travel to /reserve with the piece",
    shopper.url().split("?")[1],
  );

  // --- one day, not a range ---
  await shopper.locator("button[data-day]").first().waitFor({ timeout: NAV_TIMEOUT });
  const laterR = shopper.getByLabel("Later month");
  for (let i = 0; i < 24 && (await laterR.isEnabled()); i++) {
    await laterR.click();
    await shopper.waitForTimeout(120);
  }
  const openR = shopper.locator('button[data-day][aria-disabled="false"]');
  const COLLECT = (await openR.first().getAttribute("data-day"))!;
  check(!!COLLECT, "the collection calendar offers an open day", COLLECT);
  await openR.first().click();
  await shopper.waitForTimeout(250);
  console.log(`\nbuying Verify Kurti (${retailSlug}) in M, collected ${COLLECT}\n`);

  // The whole of the retail difference, on the page she is filling in: one day,
  // and nothing about giving it back.
  const slip = shopper.locator("aside");
  check(
    (await shopper.locator("dt", { hasText: "Return" }).count()) === 0,
    "a collection asks for no return date",
  );
  check(
    (await shopper.locator("dt", { hasText: "Length" }).count()) === 0,
    "and shows no length",
  );
  check(
    (await shopper.locator("dt", { hasText: "Come in" }).count()) === 1,
    "it asks when she will come in instead",
  );
  check(
    /Verify Kurti \(M\)/.test(await slip.innerText()),
    "the slip names the piece with the size she chose",
  );

  await shopper.locator("#rv-time input[name=time]").first().waitFor({ timeout: 5000 });
  await shopper.locator("#rv-time input[name=time]").first().check({ force: true });
  await shopper.fill("#rv-name", "Retail Verify");
  await shopper.fill("#rv-phone", "9876501234");
  await shopper.fill("#rv-note", "Automated end-to-end check. Delete me.");
  check(await awaitBotToken(shopper), "retail: the bot check issues a token before the form is sent");
  await shopper.click('button[type="submit"]');
  await shopper.waitForURL(/\/booking\/VVH-/, { timeout: NAV_TIMEOUT });
  retailCode = new URL(shopper.url()).pathname.split("/").pop()!;
  check(/^VVH-[0-9A-Z]{4}$/.test(retailCode), "the request posts and lands on the booking", retailCode);

  // --- the row, and the count it took ---
  const [bought] = (await sql`
    select b.status, bi.size, bi.variant_id::text as variant, bi.holds_dates, bi.buffer_days,
           (upper(b.booked_range) - lower(b.booked_range)) as days,
           to_char(lower(b.booked_range), 'YYYY-MM-DD') as collect
      from bookings b join booking_items bi on bi.booking_id = b.id
     where b.code = ${retailCode}`) as {
    status: string; size: string; variant: string; holds_dates: boolean;
    buffer_days: number; days: number; collect: string;
  }[];
  check(bought?.status === "pending", "it is written as a pending request", bought?.status);
  check(bought?.size === "M" && bought?.variant === colour.id, "naming the colour and size it took", `${bought?.size} / ${bought?.variant}`);
  check(bought?.collect === COLLECT && bought?.days === 1, "for the one day she is coming in", `${bought?.collect}, ${bought?.days} day(s)`);
  // RETAIL_SPEC §1.1: guarded by the count, so it never enters the exclusion
  // constraint and a sold kurti needs no buffer to be readied.
  check(bought?.holds_dates === false && bought?.buffer_days === 0, "held by its count, not by the calendar", `holdsDates ${bought?.holds_dates}, buffer ${bought?.buffer_days}`);
  const [taken] = (await sql`
    select quantity, held from variant_stock where variant_id = ${colour.id} and size = 'M'`) as
    { quantity: number; held: number }[];
  check(taken?.held === 1, "the database takes it off the rail in that size", `held ${taken?.held} of ${taken?.quantity}`);
  const [untouched] = (await sql`
    select held from variant_stock where variant_id = ${colour.id} and size = 'L'`) as { held: number }[];
  check(untouched?.held === 0, "and leaves the other size where it was", `L held ${untouched?.held}`);

  // --- her page says what she has, and promises nothing she will not get ---
  await shopper.getByText(retailCode, { exact: false }).first().waitFor({ timeout: NAV_TIMEOUT });
  const rbody = await shopper.locator("body").innerText();
  check(rbody.includes("Verify Kurti") && /size M/.test(rbody), "the booking page shows the piece with its size");
  check(/The day\b/.test(rbody) && !/The dates/.test(rbody), "it heads one day rather than dates");
  check((await shopper.locator("dt", { hasText: "Return" }).count()) === 0, "there is no return date on it");
  check(!/\bLength\b/.test(rbody), "and no length");
  check(!/\bReturned\b/.test(rbody), "the track stops at collected, because nothing comes back");

  // --- the shop confirms it, exactly as it confirms a rental ---
  const counter = await browser.newContext();
  await counter.addCookies([
    { name: SESSION_COOKIE, value: await createSession(), url: BASE, httpOnly: true, sameSite: "Lax" },
  ]);
  const desk = await counter.newPage();
  await desk.goto(`${BASE}/admin/bookings`, { waitUntil: "load" });
  check((await desk.locator("body").innerText()).includes(retailCode), "the retail request is in the inbox", retailCode);
  await desk.getByRole("link", { name: "Retail Verify" }).first().click();
  await desk.waitForURL(/\/admin\/bookings\/[0-9a-f-]{36}/, { timeout: NAV_TIMEOUT });
  const deskBody = await desk.locator("body").innerText();
  check(/Verify Kurti/.test(deskBody) && /M/.test(deskBody), "the detail page names the piece she is buying");
  await desk.getByRole("button", { name: "Confirm booking" }).click();
  const rConfirmed = await settled(
    async () =>
      ((await sql`select status from bookings where code = ${retailCode}`) as { status: string }[])[0],
    (r) => r?.status === "confirmed",
  );
  check(rConfirmed?.status === "confirmed", "one tap confirms the collection", JSON.stringify(rConfirmed));
  await counter.close();

  // --- and she can cancel it, which puts the piece back on the rail ---
  await shopper.reload({ waitUntil: "load" });
  await shopper.getByText(retailCode, { exact: false }).first().waitFor({ timeout: NAV_TIMEOUT });
  await shopper.getByRole("button", { name: "Cancel this booking" }).click();
  await shopper.getByRole("button", { name: "Keep the booking" }).waitFor({ timeout: 5000 });
  check(
    /back on the rail/.test(await shopper.locator("body").innerText()),
    "cancelling a collection offers the piece back, not the dates",
  );
  await shopper.getByRole("button", { name: "Yes, cancel it" }).click();
  const rAfter = await settled(
    async () =>
      ((await sql`
        select status, cancelled_by from bookings where code = ${retailCode}`) as
        { status: string; cancelled_by: string }[])[0],
    (r) => r?.status === "cancelled",
  );
  const rRefusal = shopper.locator('[role="alert"].text-danger');
  const rSaid = (await rRefusal.count()) ? ` — said: ${await rRefusal.first().innerText()}` : "";
  check(
    rAfter?.status === "cancelled" && rAfter?.cancelled_by === "customer",
    "cancelling from the page cancels the collection as the customer",
    JSON.stringify(rAfter) + rSaid,
  );
  const [freed] = (await sql`
    select quantity, held from variant_stock where variant_id = ${colour.id} and size = 'M'`) as
    { quantity: number; held: number }[];
  check(freed?.held === 0 && freed?.quantity === 1, "and the count goes back to the rail", `held ${freed?.held} of ${freed?.quantity}`);

  check(retailErrors.length === 0, "no console or page errors through the retail flow", retailErrors.slice(0, 3).join(" | "));
} finally {
  if (code) {
    await sql`delete from booking_items where booking_id in (select id from bookings where code = ${code})`;
    await sql`delete from bookings where code = ${code}`;
    const [left] = (await sql`select count(*)::int as n from bookings where code = ${code}`) as { n: number }[];
    check(left.n === 0, "cleanup: the verify booking is gone", `remaining: ${left.n}`);
  }
  if (retailCode) {
    await sql`delete from booking_items where booking_id in (select id from bookings where code = ${retailCode})`;
    await sql`delete from bookings where code = ${retailCode}`;
  }
  if (retailSlug) {
    // The booking has to go first: booking_items points at the product. The
    // variant and its counts go with the product.
    await sql`delete from products where slug = ${retailSlug}`;
    const [left] = (await sql`
      select count(*)::int as n from products where slug = ${retailSlug}`) as { n: number }[];
    check(left.n === 0, "cleanup: the verify retail piece and its counts are gone", `remaining: ${left.n}`);
  }
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("FAILED:\n" + failed.map((f) => `  ${f.label}${f.detail ? ` — ${f.detail}` : ""}`).join("\n"));
  process.exit(1);
}
