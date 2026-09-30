/**
 * Reminders gate — COMMS_FLOW_SPEC_V2 E10 (pickup day) and E11 (return day),
 * driven through the same route the Worker's cron calls.
 *
 *   cd site && npx tsx --env-file=.env.local scripts/verify-reminders.mts
 *   BASE=http://localhost:8787 npx tsx --env-file=.env.local scripts/verify-reminders.mts
 *
 * Needs a running site (the dev server, or the built Worker under `wrangler dev`).
 *
 * WRITES to the live database: throwaway products (slugs `zz-verify-rem-*`) and
 * bookings on a day about eleven weeks out that no real booking holds, the day
 * passed to the route as `day`. All of it is deleted in `finally`, and the
 * comms_log rows go with the bookings (on delete cascade).
 *
 * Exits non-zero if any check fails.
 */
import { neon } from "@neondatabase/serverless";
import { addDays, todayIST, weekday } from "../lib/bookingRules.ts";
import { cronKey } from "../lib/cronKey.ts";
import { customerMessage, ownerMessage } from "../lib/comms/messages.ts";
import type { CommsBooking } from "../lib/comms/types.ts";
import { SHOP } from "../lib/site.ts";

const BASE = process.env.BASE ?? "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL!);
const results: boolean[] = [];
const check = (ok: boolean, label: string, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

const run = Math.random().toString(36).slice(2, 7);
const slug = (s: string) => `zz-verify-rem-${s}-${run}`;
const NAME = "Verify Reminders";

// A Wednesday about eleven weeks out: clear of real bookings, and of verify-booking's Mondays.
let D = addDays(todayIST(), 77);
while (weekday(D) !== 3) D = addDays(D, 1);

let variant = "";
let seq = 0;

async function setup() {
  await sql`
    insert into products (type, name, slug, rental_price, prebook_charge, is_active)
    select 'rental', 'Verify ' || upper(k), 'zz-verify-rem-' || k || '-' || ${run}, 1000, 0, true
      from unnest(array['a','b','c','e','f','g']) k`;
  await sql`
    insert into products (type, name, slug, rental_price, prebook_charge, is_active)
    values ('jewellery', 'Verify J', ${slug("j")}, 300, 0, true)`;
  await sql`insert into products (type, name, slug, price, is_active) values ('retail', 'Verify R', ${slug("r")}, 500, true)`;
  const [v] = await sql`
    insert into product_variants (product_id, colour_name, colour_hex)
    select id, 'Verify colour', '#abcdef' from products where slug = ${slug("r")}
    returning id`;
  variant = v.id;
  await sql`insert into variant_stock (variant_id, size, quantity) values (${variant}, 'M', 2)`;
}

/** Inserts a booking directly: the engine's lead-time rules are not what is under test. */
async function booking(status: string, from: string, to: string, items: string[]): Promise<string> {
  const [b] = await sql`
    insert into bookings (code, customer_name, phone, email, booked_range, status, expires_at, pickup_time, cancelled_by)
    values (${`ZR${run}${seq++}`.toUpperCase()}, ${NAME}, '9800000000', 'verify@example.invalid',
            daterange(${from}::date, ${to}::date, '[)'), ${status}::booking_status,
            ${status === "pending" ? new Date(Date.now() + 86400000).toISOString() : null},
            '11:00', ${status === "cancelled" ? "shop" : null})
    returning id`;
  for (const k of items) {
    const retail = k === "r";
    await sql`
      insert into booking_items (booking_id, product_id, variant_id, size)
      select ${b.id}, id, ${retail ? variant : null}, ${retail ? "M" : null} from products where slug = ${slug(k)}`;
  }
  return b.id;
}

async function cleanup() {
  await sql`delete from bookings where customer_name = ${NAME}`;
  await sql`delete from products where slug like ${`zz-verify-rem-%-${run}`}`;
}

async function call(auth: string | null, day?: string) {
  const res = await fetch(`${BASE}/api/cron/reminders`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify(day ? { day } : {}),
  });
  return { status: res.status, body: res.status === 200 ? ((await res.json()) as { pickup: string[]; ret: string[] }) : null };
}

const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

try {
  await setup();
  const ids = {
    rentalPickup: await booking("confirmed", D, addDays(D, 3), ["a"]),
    pendingPickup: await booking("pending", D, addDays(D, 3), ["b"]),
    rentalReturn: await booking("picked_up", addDays(D, -3), addDays(D, 1), ["c"]),
    collection: await booking("confirmed", D, addDays(D, 1), ["r"]),
    mixedReturn: await booking("confirmed", addDays(D, -2), addDays(D, 1), ["e", "r"]),
    jewelleryReturn: await booking("picked_up", addDays(D, -2), addDays(D, 1), ["j"]),
    cancelled: await booking("cancelled", D, addDays(D, 3), ["f"]),
    alreadyReminded: await booking("confirmed", D, addDays(D, 2), ["g"]),
  };
  await sql`
    insert into comms_log (booking_id, event, channel, recipient, status, detail)
    values (${ids.alreadyReminded}, 'reminder.pickup', 'email', 'customer', 'skipped', 'seeded by verify-reminders')`;

  const key = `Bearer ${await cronKey(process.env.SESSION_SECRET!)}`;
  const none = await call(null, D);
  check(none.status === 404, "no key: 404, the same as a route that does not exist", `got ${none.status}`);
  const wrong = await call("Bearer " + "0".repeat(64), D);
  check(wrong.status === 404, "wrong key: 404", `got ${wrong.status}`);

  const first = await call(key, D);
  check(first.status === 200, "the cron's key: 200", `got ${first.status}`);
  const mine = new Set(Object.values(ids));
  const pickup = (first.body?.pickup ?? []).filter((id) => mine.has(id));
  const ret = (first.body?.ret ?? []).filter((id) => mine.has(id));
  check(
    same(pickup, [ids.rentalPickup, ids.collection]),
    "E10 goes to confirmed pickups only: a rental and a one-day collection",
    `got ${JSON.stringify(pickup)}`
  );
  check(!pickup.includes(ids.pendingPickup), "E10 skips a request the shop has not confirmed");
  check(!pickup.includes(ids.cancelled), "E10 skips a cancelled booking");
  check(!pickup.includes(ids.alreadyReminded), "E10 skips a booking already reminded that day");
  check(
    same(ret, [ids.rentalReturn, ids.mixedReturn, ids.jewelleryReturn]),
    "E11 goes to the rental, the mixed basket and the jewellery due back",
    `got ${JSON.stringify(ret)}`
  );
  check(!ret.includes(ids.collection), "E11 skips a collection: a bought piece never returns");

  const logged = await sql`
    select booking_id, event, recipient from comms_log
     where booking_id = any(${Object.values(ids)}::uuid[]) and detail is distinct from 'seeded by verify-reminders'`;
  const expected = [...pickup.map((id) => `${id}:reminder.pickup`), ...ret.map((id) => `${id}:reminder.return`)];
  check(
    same(logged.map((r) => `${r.booking_id}:${r.event}`), expected),
    "every reminder is recorded in comms_log, once, including the skips",
    `${logged.length} rows for ${expected.length} reminders`
  );
  check(logged.every((r) => r.recipient === "customer"), "reminders go to her only, never to the owner");

  const second = await call(key, D);
  const again = [...(second.body?.pickup ?? []), ...(second.body?.ret ?? [])].filter((id) => mine.has(id));
  check(second.status === 200 && again.length === 0, "a second firing the same day sends nothing", `got ${JSON.stringify(again)}`);

  // The copy. Built from a CommsBooking directly, since which items the text
  // names is the one thing here the database does not decide.
  const b = (pickup: string, ret: string, items: CommsBooking["items"]): CommsBooking => ({
    id: "x", code: "ZR00", name: "Verify", phone: "9800000000", email: null,
    pickup, ret, time: "11:00", expiresAt: null, createdAt: new Date().toISOString(), items,
  });
  const E = { name: "Verify E", type: "rental" as const, colour: null, size: null };
  const R = { name: "Verify R", type: "retail" as const, colour: "Verify colour", size: "M" };
  const J = { name: "Verify J", type: "jewellery" as const, colour: null, size: null };
  const mixed = customerMessage("reminder.return", b(addDays(D, -2), D, [E, R]))?.text ?? "";
  check(mixed.includes("Verify E") && !mixed.includes("Verify R"), "E11 names what goes back and not what was bought");
  const jewel = customerMessage("reminder.return", b(addDays(D, -2), D, [J]))?.text ?? "";
  check(jewel.includes("Verify J is due back"), "E11 names rented jewellery");
  const collect = customerMessage("reminder.pickup", b(D, D, [R]))?.text ?? "";
  const rent = customerMessage("reminder.pickup", b(D, addDays(D, 2), [E]))?.text ?? "";
  check(!collect.includes("return day") && rent.includes("Your return day is"), "E10 mentions a return day for a rental only");
  check(
    [mixed, jewel, collect, rent].every((t) => !t.includes("2014") && t.includes(SHOP.phone) && t.includes("/booking/")),
    "every reminder carries the booking page and the shop's phone, and no em dash"
  );
  check(
    ownerMessage("reminder.pickup", b(D, D, [R])) === null && ownerMessage("reminder.return", b(D, D, [E])) === null,
    "the owner is told nothing"
  );
} catch (e) {
  check(false, "the run itself", e instanceof Error ? e.message : String(e));
} finally {
  await cleanup();
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
