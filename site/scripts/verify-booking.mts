/**
 * Booking engine gate — the invariants of specs/BOOKING_ENGINE_SPEC.md §5 and
 * BOOKING_ENGINE_SPEC_V2.md §7, proved against the live Neon database.
 *
 *   cd site && npx tsx --env-file=.env.local scripts/verify-booking.mts
 *
 * WRITES to the database: it creates three throwaway products (slugs starting
 * `zz-verify-`) and bookings on them, far in the future, and deletes all of it in
 * `finally`, including after a failure. The products are active for the seconds
 * the run takes, because the engine refuses to book an inactive piece.
 *
 * Exits non-zero if any check fails.
 */
import { neon } from "@neondatabase/serverless";
import {
  cancelByCustomer,
  createBooking,
  getBookingByPhone,
  getBookingByToken,
  getBookingSettings,
  lapseExpired,
  quoteExtension,
  requestExtension,
  approveExtension,
  type CreateResult,
} from "../lib/booking.ts";
import { addDays, todayIST, weekday } from "../lib/bookingRules.ts";

const sql = neon(process.env.DATABASE_URL!);
const results: { ok: boolean; label: string; detail: string }[] = [];
const check = (ok: boolean, label: string, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

const run = Math.random().toString(36).slice(2, 7);
const slug = (s: string) => `zz-verify-${s}-${run}`;
const A = slug("a");
const B = slug("b");
const J = slug("j");
const R = slug("r"); // retail
let variantId = "";

// A Monday about ten weeks out, so no real booking and no closed day interferes.
let base = addDays(todayIST(), 70);
while (weekday(base) !== 1) base = addDays(base, 1);
const day = (n: number) => addDays(base, n);

let phoneSeq = 0;
// Distinct numbers per booking keep the per-phone rate limit out of the checks
// that are not about it.
const nextPhone = () => `9${String(800000000 + run.charCodeAt(0) * 1000 + phoneSeq++).padStart(9, "0")}`;

const book = (items: string[], pickup: string, ret: string, extra: Partial<Record<string, unknown>> = {}) =>
  createBooking({
    items,
    pickup,
    ret,
    time: "11:00",
    name: "Verify Script",
    phone: nextPhone(),
    email: null,
    note: null,
    ...extra,
  });

/** A retail line: the slug plus the colour and size its count is keyed on. */
const buy = (size: string) => ({ slug: R, variant: variantId, size });

const ok = (r: CreateResult): r is Extract<CreateResult, { ok: true }> => r.ok;
const describe = (r: CreateResult) => (r.ok ? `ok ${r.code}` : JSON.stringify(r));

async function setup() {
  await sql`
    insert into products (type, name, slug, rental_price, prebook_charge, is_active)
    values ('rental', 'Verify A', ${A}, 1000, 0, true),
           ('rental', 'Verify B', ${B}, 1000, 0, true),
           ('jewellery', 'Verify J', ${J}, 300, 0, true)`;
  await sql`insert into products (type, name, slug, price, is_active) values ('retail', 'Verify R', ${R}, 500, true)`;
  // Retail: one colour, two of it in M and one in S, so the count can be
  // proved to run out in one size without touching the other (RETAIL_SPEC §5).
  const [v] = await sql<{ id: string }>`
    insert into product_variants (product_id, colour_name, colour_hex)
    select id, 'Verify colour', '#abcdef' from products where slug = ${R}
    returning id`;
  variantId = v.id;
  await sql`insert into variant_stock (variant_id, size, quantity) values (${v.id}, 'M', 2), (${v.id}, 'S', 1)`;
}

async function cleanup() {
  const slugs = [A, B, J, R];
  await sql`
    delete from bookings where id in (
      select bi.booking_id from booking_items bi join products p on p.id = bi.product_id
       where p.slug = any(${slugs}::text[]))`;
  await sql`delete from bookings where customer_name = 'Verify Script'`;
  await sql`delete from products where slug = any(${slugs}::text[])`;
}

async function main() {
  const settings = await getBookingSettings();
  console.log(`Booking engine gate. buffer=${settings.bufferDays}d, window=${settings.expiryMinutes}min, cutoff=${settings.cancelCutoffHours}h, base=${base}\n`);
  await setup();

  // 1. basic create
  const first = await book([A, J], day(0), day(2));
  check(ok(first), "create: rental + jewellery in one booking", describe(first));
  if (!ok(first)) return;

  // 2. concurrent creates for the same dates: exactly one wins
  const race = await Promise.all([book([B], day(0), day(1)), book([B], day(1), day(3)), book([B], day(0), day(4))]);
  const winners = race.filter(ok).length;
  const losers = race.filter((r) => !r.ok && r.error === "dates_taken").length;
  check(winners === 1 && losers === 2, "race: three overlapping creates, exactly one succeeds", race.map(describe).join(" | "));

  // 3. buffer honoured. A returns day(2); blocked through day(2)+buffer.
  const insideBuffer = await book([A], day(2 + settings.bufferDays), day(2 + settings.bufferDays + 1));
  check(!insideBuffer.ok && insideBuffer.error === "dates_taken", `buffer: start on return+${settings.bufferDays} refused`, describe(insideBuffer));
  const afterBuffer = await book([A], day(3 + settings.bufferDays), day(3 + settings.bufferDays));
  check(ok(afterBuffer), `buffer: start on return+${settings.bufferDays + 1} accepted`, describe(afterBuffer));

  // jewellery in a booking is exclusive too
  const jewelTaken = await book([J], day(1), day(1));
  check(!jewelTaken.ok && jewelTaken.error === "dates_taken", "jewellery booked with an outfit is refused to others for those dates", describe(jewelTaken));

  // 4. every expires_at is no later than pickup_at
  const late = await sql`
    select count(*)::int as n from bookings
     where customer_name = 'Verify Script' and status = 'pending'
       and expires_at > (lower(booked_range) + pickup_time) at time zone 'Asia/Kolkata'`;
  check(late[0].n === 0, "expires_at never later than pickup", `violations: ${late[0].n}`);

  // 5. lapse frees dates without the cron
  await sql`update bookings set expires_at = now() - interval '1 minute' where code = ${first.code}`;
  const afterLapse = await book([A], day(0), day(1));
  const lapsed = await sql`select status, cancelled_by from bookings where code = ${first.code}`;
  check(
    ok(afterLapse) && lapsed[0].status === "cancelled" && lapsed[0].cancelled_by === "lapsed",
    "lapse: a passed window frees the dates on the next create",
    `${describe(afterLapse)}; old booking ${JSON.stringify(lapsed[0])}`,
  );

  // 6. revive after a competing booking fails at the database
  let reviveErr = "";
  try {
    await sql`update bookings set status = 'confirmed', expires_at = null, cancelled_by = null where code = ${first.code}`;
  } catch (e) {
    reviveErr = (e as { code?: string }).code ?? String(e);
  }
  check(reviveErr === "23P01", "revive: refused by the exclusion constraint once dates are taken", `error ${reviveErr || "none"}`);

  // 7. access: token and phone open the booking; wrong proofs do not
  if (ok(afterLapse)) {
    const byToken = await getBookingByToken(afterLapse.code, afterLapse.token);
    const wrongToken = await getBookingByToken(afterLapse.code, "A".repeat(43));
    const row = await sql`select phone from bookings where code = ${afterLapse.code}`;
    const byPhone = await getBookingByPhone(afterLapse.code, row[0].phone);
    const wrongPhone = await getBookingByPhone(afterLapse.code, "9000000000");
    check(byToken?.code === afterLapse.code && wrongToken === null, "access: right token opens, wrong token does not");
    check(byPhone?.code === afterLapse.code && wrongPhone === null, "access: code + right phone opens, wrong phone does not");
    check(!("access_hash" in (byToken ?? {})) && byToken?.items.length === 1, "access: response carries items and no hash");

    // 8. customer cancel before cutoff frees dates
    const cancelled = byToken ? await cancelByCustomer(byToken.id) : false;
    const again = await book([A], day(0), day(1));
    check(cancelled && ok(again), "cancel: before the cutoff succeeds and frees the dates", describe(again));
  }

  // 9. cancel inside the cutoff is refused, row unchanged
  const soon = await book([B], day(19), day(19));
  if (ok(soon)) {
    // Move it to pickup one hour from now, IST, well inside any cutoff >= 2h.
    await sql`
      update bookings
         set booked_range = daterange((now() at time zone 'Asia/Kolkata')::date, (now() at time zone 'Asia/Kolkata')::date + 1, '[)'),
             pickup_time = ((now() + interval '1 hour') at time zone 'Asia/Kolkata')::time,
             expires_at = now() + interval '30 minutes'
       where code = ${soon.code}`;
    const b = await getBookingByToken(soon.code, soon.token);
    const refused = b ? !(await cancelByCustomer(b.id)) : false;
    const still = await sql`select status from bookings where code = ${soon.code}`;
    check(
      refused && still[0].status === "pending" && b?.canCancel === false,
      "cancel: inside the cutoff is refused and the page agrees",
      `status ${still[0].status}, canCancel ${b?.canCancel}`,
    );
  } else {
    check(false, "cancel: inside the cutoff (setup booking)", describe(soon));
  }

  // 10. bad input writes nothing
  const before = await sql`select count(*)::int as n from bookings where customer_name = 'Verify Script'`;
  const retail = await book([R], day(30), day(30)); // named, but no colour or size
  const dup = await book([A, A], day(30), day(30));
  const offGrid = await book([A], day(30), day(30), { time: "11:10" });
  const sunday = await book([A], day(6), day(6));
  const tooLong = await book([A], day(30), day(70));
  const badPhone = await book([A], day(30), day(30), { phone: "12345" });
  const after = await sql`select count(*)::int as n from bookings where customer_name = 'Verify Script'`;
  check(!retail.ok && retail.error === "invalid", "reject: retail piece with no size named", describe(retail));
  check(!dup.ok && dup.error === "invalid", "reject: same piece twice", describe(dup));
  check(!offGrid.ok && offGrid.error === "range" && offGrid.problem === "bad_time", "reject: pickup time off the grid", describe(offGrid));
  check(!sunday.ok && sunday.error === "range" && sunday.problem === "closed_day", "reject: pickup on a closed day", describe(sunday));
  check(!tooLong.ok && tooLong.error === "range" && tooLong.problem === "too_long", "reject: longer than the maximum", describe(tooLong));
  check(!badPhone.ok && badPhone.error === "invalid", "reject: not a mobile number", describe(badPhone));
  check(before[0].n === after[0].n, "reject: nothing written for any refused request", `${before[0].n} -> ${after[0].n}`);

  // 11. rate limit: the fourth booking from one phone inside an hour is refused
  const phone = nextPhone();
  const limited: CreateResult[] = [];
  for (let i = 0; i < 4; i++) limited.push(await book([B], day(40 + i * 7), day(40 + i * 7), { phone }));
  check(
    limited.slice(0, 3).every(ok) && !limited[3].ok && limited[3].error === "rate_limited",
    "rate limit: fourth booking from one phone in an hour refused",
    limited.map(describe).join(" | "),
  );

  // 12. items mirror the parent: status + range follow a booking update
  const mirror = await sql`
    select bool_and(bi.status = b.status) as same_status,
           bool_and(lower(bi.blocked_range) = lower(b.booked_range)
                    and upper(bi.blocked_range) = upper(b.booked_range) + bi.buffer_days) as same_range
      from bookings b join booking_items bi on bi.booking_id = b.id
     where b.customer_name = 'Verify Script'`;
  check(mirror[0].same_status && mirror[0].same_range, "items mirror their booking's status and range", JSON.stringify(mirror[0]));

  // 13. extensions: non-colliding approve widens; colliding approve is rejected by the DB
  const ext = await book([J], day(56), day(57));
  const next = await book([J], day(63), day(63)); // blocked from day(63); ext may reach day(60) with buffer 2
  if (ok(ext) && ok(next)) {
    const extRow = await sql`update bookings set status = 'confirmed', expires_at = null where code = ${ext.code} returning id`;
    const id = extRow[0].id as string;
    const pendingRefused = await quoteExtension((await sql`select id from bookings where code = ${next.code}`)[0].id, day(64));
    check(!pendingRefused.ok && pendingRefused.error === "not_extendable", "extension: a pending booking cannot be extended", JSON.stringify(pendingRefused));

    const clashQuote = await quoteExtension(id, day(61));
    check(!clashQuote.ok && clashQuote.error === "dates_taken", "extension: quote sees the next booking's hold", JSON.stringify(clashQuote));

    const good = await requestExtension(id, day(60));
    const dupe = await requestExtension(id, day(59));
    check(good.ok && good.extraDays === 3 && !dupe.ok && dupe.error === "open_request", "extension: request recorded, second open request refused", `${JSON.stringify(good)} | ${JSON.stringify(dupe)}`);
    const reqId = (await sql`select id from extension_requests where booking_id = ${id} and status = 'pending'`)[0].id as string;
    const approved = await approveExtension(reqId);
    const widened = await sql`select to_char(upper(booked_range) - 1, 'YYYY-MM-DD') as ret from bookings where id = ${id}`;
    const items = await sql`select to_char(upper(blocked_range), 'YYYY-MM-DD') as e from booking_items where booking_id = ${id}`;
    check(
      approved.ok && widened[0].ret === day(60) && items[0].e === day(61 + settings.bufferDays),
      "extension: approval widens the booking and its items",
      `${JSON.stringify(approved)} ret=${widened[0].ret} itemEnd=${items[0].e}`,
    );

    // A request for a date the booking already ends after: stale, and NOT approved.
    await sql`insert into extension_requests (booking_id, requested_return) values (${id}, ${day(58)}::date)`;
    const staleReq = (await sql`select id from extension_requests where booking_id = ${id} and status = 'pending'`)[0].id as string;
    const staleRes = await approveExtension(staleReq);
    const staleState = await sql`select status from extension_requests where id = ${staleReq}`;
    check(
      !staleRes.ok && staleRes.error === "stale" && staleState[0].status === "pending",
      "extension: approval that cannot widen the booking leaves the request pending",
      `${JSON.stringify(staleRes)} request=${staleState[0].status}`,
    );
    await sql`update extension_requests set status = 'rejected' where id = ${staleReq}`;

    // Bypass the quote, as a race would: a request straight into the table.
    await sql`insert into extension_requests (booking_id, requested_return) values (${id}, ${day(62)}::date)`;
    const raceReq = (await sql`select id from extension_requests where booking_id = ${id} and status = 'pending'`)[0].id as string;
    const raced = await approveExtension(raceReq);
    const unchanged = await sql`select to_char(upper(booked_range) - 1, 'YYYY-MM-DD') as ret from bookings where id = ${id}`;
    const reqState = await sql`select status from extension_requests where id = ${raceReq}`;
    check(
      !raced.ok && raced.error === "dates_taken" && unchanged[0].ret === day(60) && reqState[0].status === "rejected",
      "extension: colliding approval refused by the constraint, booking unchanged, request rejected",
      `${JSON.stringify(raced)} ret=${unchanged[0].ret} request=${reqState[0].status}`,
    );
  } else {
    check(false, "extension: setup bookings", `${describe(ext)} | ${describe(next)}`);
  }

  // ---- retail (specs/RETAIL_SPEC.md §5) --------------------------------
  // 14. the count, not the calendar. The shop owns two in M; two customers get
  // one each on the same day, and the third is refused — by the database, in
  // the same statement that moved the count, not by a number read beforehand.
  const m1 = await book([buy("M")], day(75), day(75));
  const m2 = await book([buy("M")], day(75), day(75));
  const m3 = await book([buy("M")], day(75), day(75));
  check(
    ok(m1) && ok(m2) && !m3.ok && m3.error === "out_of_stock",
    "retail: two of a size both commit on one day, the third is refused",
    [m1, m2, m3].map(describe).join(" | "),
  );

  // 15. the count is keyed on the size, so M running out says nothing about S.
  const sizeS = await book([buy("S")], day(75), day(75));
  check(ok(sizeS), "retail: reserving M never blocks S of the same piece", describe(sizeS));

  // 16. a retail hold is not a date. The rental guarantee still is.
  const together = await book([A, buy("M")], day(80), day(81));
  check(
    !together.ok && together.error === "out_of_stock",
    "retail: a piece with none left refuses the whole request, rental included",
    describe(together),
  );
  // The whole transaction rolled back, so the rental it was asked for is still
  // free — and once taken, it is held against everyone, exactly as before.
  const alone = await book([A], day(80), day(81));
  const clash = await book([A], day(80), day(80));
  check(
    ok(alone) && !clash.ok && clash.error === "dates_taken",
    "retail: a refused basket leaves its rental free, and the rental then holds its dates",
    `${describe(alone)} | ${describe(clash)}`,
  );

  // 17. cancelling gives the count back, and `held` never passes `quantity`.
  if (ok(m1)) {
    const heldBefore = await sql<{ held: number }>`
      select held from variant_stock where variant_id = ${variantId} and size = 'M'`;
    const byToken = await getBookingByToken(m1.code, m1.token);
    const cancelled = byToken ? await cancelByCustomer(byToken.id) : false;
    const heldAfter = await sql<{ held: number; quantity: number }>`
      select held, quantity from variant_stock where variant_id = ${variantId} and size = 'M'`;
    const again = await book([buy("M")], day(77), day(77));
    check(
      cancelled && heldAfter[0].held === heldBefore[0].held - 1 && heldAfter[0].held <= heldAfter[0].quantity && ok(again),
      "retail: cancelling releases the count, and the piece can be reserved again",
      `held ${heldBefore[0].held} -> ${heldAfter[0].held} of ${heldAfter[0].quantity}; ${describe(again)}`,
    );
  } else {
    check(false, "retail: cancelling releases the count (setup booking)", describe(m1));
  }

  // 18. no buffer, and collection takes the piece off the rail for good.
  if (ok(m2)) {
    const id = (await sql<{ id: string }>`select id from bookings where code = ${m2.code}`)[0].id;
    await sql`update bookings set status = 'confirmed', expires_at = null where id = ${id}`;
    await sql`update bookings set status = 'picked_up' where id = ${id}`;
    const stock = await sql<{ held: number; quantity: number }>`
      select held, quantity from variant_stock where variant_id = ${variantId} and size = 'M'`;
    const item = await sql<{ buffer_days: number; holds_dates: boolean; blocked: string }>`
      select bi.buffer_days, bi.holds_dates, bi.blocked_range::text as blocked
        from booking_items bi join products p on p.id = bi.product_id
       where bi.booking_id = ${id} and p.slug = ${R}`;
    check(
      item[0].buffer_days === 0 && item[0].holds_dates === false && stock[0].quantity === 1,
      "retail: no buffer days, no date hold, and collection takes it off the rail",
      `buffer ${item[0].buffer_days}, holdsDates ${item[0].holds_dates}, quantity ${stock[0].quantity}`,
    );
  } else {
    check(false, "retail: collection takes it off the rail (setup booking)", describe(m2));
  }

  await lapseExpired();
}

try {
  await main();
} catch (e) {
  check(false, "gate errored", (e as Error).stack ?? String(e));
} finally {
  await cleanup();
  const left = await sql`select count(*)::int as n from products where slug like 'zz-verify-%'`;
  check(left[0].n === 0, "cleanup: no verify products left behind", `remaining: ${left[0].n}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed${failed.length ? `\nFAILED: ${failed.map((f) => f.label).join("; ")}` : ""}`);
process.exit(failed.length ? 1 : 0);
