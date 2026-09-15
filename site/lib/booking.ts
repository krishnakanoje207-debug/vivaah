// The booking engine — SERVER CODE ONLY (owner connection via lib/db, secrets).
// Implements specs/BOOKING_ENGINE_SPEC_V2.md over specs/schema.sql + migration 0006.
//
// The exclusion constraint on booking_items is the only authority on whether
// dates are free. Nothing in this file checks availability before writing and
// then trusts that check: it writes, and reads the database's answer (23P01).
import { neon } from "@neondatabase/serverless";
import { sql } from "@/lib/db";
import { sqlPublic } from "@/lib/dbPublic";
import { verifyAccess } from "@/lib/bookingAccess";
import {
  CODE_RE,
  DEFAULT_PICKUP_HOURS,
  MAX_ITEMS,
  NOTE_MAX,
  checkRange,
  normalisePhone,
  type Blocked,
  type PickupHours,
  type RangeProblem,
} from "@/lib/bookingRules";

// ---------------------------------------------------------------------------
// settings

export type BookingSettings = {
  bufferDays: number;
  expiryMinutes: number;
  cancelCutoffHours: number;
  pickupHours: PickupHours;
};

function toPickupHours(v: unknown): PickupHours {
  const o = (v && typeof v === "object" ? v : {}) as Partial<PickupHours>;
  const time = (t: unknown, d: string) => (typeof t === "string" && /^\d{2}:\d{2}$/.test(t) ? t : d);
  return {
    open: time(o.open, DEFAULT_PICKUP_HOURS.open),
    close: time(o.close, DEFAULT_PICKUP_HOURS.close),
    step_minutes:
      Number.isInteger(o.step_minutes) && o.step_minutes! >= 5 ? o.step_minutes! : DEFAULT_PICKUP_HOURS.step_minutes,
    closed_weekdays: Array.isArray(o.closed_weekdays)
      ? o.closed_weekdays.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
      : DEFAULT_PICKUP_HOURS.closed_weekdays,
  };
}

const intOr = (v: unknown, d: number) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : d);

export async function getBookingSettings(): Promise<BookingSettings> {
  const rows = await sql<{ key: string; value: unknown }>`
    select key, value from settings
     where key in ('buffer_days','booking_expiry_minutes','cancel_cutoff_hours','pickup_hours')`;
  const m = new Map(rows.map((r) => [r.key, r.value]));
  return {
    bufferDays: Math.min(14, intOr(m.get("buffer_days"), 2)),
    expiryMinutes: Math.max(15, intOr(m.get("booking_expiry_minutes"), 1440)),
    cancelCutoffHours: intOr(m.get("cancel_cutoff_hours"), 6),
    pickupHours: toPickupHours(m.get("pickup_hours")),
  };
}

/** The public subset, read on the storefront connection (is_public rows). */
export async function getPublicBookingSettings(): Promise<Omit<BookingSettings, "expiryMinutes">> {
  const rows = await sqlPublic<{ key: string; value: unknown }>`
    select key, value from settings
     where key in ('buffer_days','cancel_cutoff_hours','pickup_hours')`;
  const m = new Map(rows.map((r) => [r.key, r.value]));
  return {
    bufferDays: Math.min(14, intOr(m.get("buffer_days"), 2)),
    cancelCutoffHours: intOr(m.get("cancel_cutoff_hours"), 6),
    pickupHours: toPickupHours(m.get("pickup_hours")),
  };
}

// ---------------------------------------------------------------------------
// lapse (V2 §2.4)

/** Cancels every pending booking whose confirm-within window has passed. */
export async function lapseExpired(): Promise<number> {
  const rows = await sql`
    update bookings set status = 'cancelled', cancelled_by = 'lapsed'
     where status = 'pending' and expires_at < now()
    returning id`;
  return rows.length;
}

// ---------------------------------------------------------------------------
// bookable products + availability

export type Bookable = {
  id: string;
  slug: string;
  name: string;
  type: "rental" | "jewellery";
  pricePerDay: number | null;
  category: string | null;
  images: unknown;
  spin: unknown;
};

/** Active rental/jewellery products for the given slugs, in the order given. */
export async function getBookables(slugs: string[]): Promise<Bookable[]> {
  if (slugs.length === 0) return [];
  const rows = await sqlPublic<{
    id: string;
    slug: string;
    name: string;
    type: "rental" | "jewellery";
    rental_price: string | null;
    category_slug: string | null;
    images: unknown;
    spin: unknown;
  }>`
    select p.id, p.slug, p.name, p.type, p.rental_price, p.images, p.spin,
           c.slug as category_slug
      from products p left join categories c on c.id = p.category_id
     where p.slug = any(${slugs}::text[]) and p.is_active
       and p.type in ('rental', 'jewellery')`;
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs.flatMap((s) => {
    const r = bySlug.get(s);
    return r
      ? [{
          id: r.id,
          slug: r.slug,
          name: r.name,
          type: r.type,
          pricePerDay: r.rental_price == null ? null : Number(r.rental_price),
          category: r.category_slug,
          images: r.images,
          spin: r.spin,
        }]
      : [];
  });
}

/**
 * Blocked date ranges per product slug, from product_unavailable_ranges() — the
 * one sanctioned public view of the calendar. Dates only; nothing about anyone.
 */
export async function getBlockedRanges(productIds: string[]): Promise<Map<string, Blocked[]>> {
  const out = new Map<string, Blocked[]>(productIds.map((id) => [id, []]));
  if (productIds.length === 0) return out;
  const rows = await sqlPublic<{ id: string; start: string; end: string }>`
    select p.id,
           to_char(lower(r.blocked), 'YYYY-MM-DD') as start,
           to_char(upper(r.blocked), 'YYYY-MM-DD') as "end"
      from products p
      cross join lateral product_unavailable_ranges(p.id) r
     where p.id = any(${productIds}::uuid[])
     order by 2`;
  for (const r of rows) out.get(r.id)?.push({ start: r.start, end: r.end });
  return out;
}

// ---------------------------------------------------------------------------
// crypto helpers (WebCrypto: runs on Workers and in Node)

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `VVH-${Array.from(bytes, (b) => CROCKFORD[b % 32]).join("")}`;
}

function toB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/; // 32 bytes, base64url, unpadded
export const isToken = (t: unknown): t is string => typeof t === "string" && TOKEN_RE.test(t);

// ---------------------------------------------------------------------------
// create (V2 §2.1)

export type CreateInput = {
  items: unknown;
  pickup: unknown;
  ret: unknown;
  time: unknown;
  name: unknown;
  phone: unknown;
  email: unknown;
  note: unknown;
};

export type CreateResult =
  | { ok: true; code: string; token: string }
  | { ok: false; status: 400; error: "invalid"; field: string; message: string }
  | { ok: false; status: 400; error: "range"; problem: RangeProblem }
  | { ok: false; status: 409; error: "dates_taken"; slugs: string[] }
  | { ok: false; status: 429; error: "rate_limited" };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_RE = /^[a-z0-9-]{1,120}$/;

const invalid = (field: string, message: string): CreateResult => ({
  ok: false, status: 400, error: "invalid", field, message,
});

export async function createBooking(input: CreateInput): Promise<CreateResult> {
  // ---- shape --------------------------------------------------------------
  const slugs = Array.isArray(input.items) ? input.items.map(str) : [];
  if (slugs.length === 0) return invalid("items", "Choose at least one piece.");
  if (slugs.length > MAX_ITEMS) return invalid("items", `A booking can hold up to ${MAX_ITEMS} pieces.`);
  if (!slugs.every((s) => SLUG_RE.test(s))) return invalid("items", "One of the pieces is not recognised.");
  if (new Set(slugs).size !== slugs.length) return invalid("items", "The same piece is listed twice.");

  const name = str(input.name);
  if (name.length < 2 || name.length > 80) return invalid("name", "Tell us your name.");
  const phone = normalisePhone(str(input.phone));
  if (!phone) return invalid("phone", "Enter a 10-digit Indian mobile number.");
  const email = str(input.email) || null;
  if (email && (email.length > 120 || !EMAIL_RE.test(email))) return invalid("email", "That email address does not look right.");
  const note = str(input.note) || null;
  if (note && note.length > NOTE_MAX) return invalid("note", `Keep the note under ${NOTE_MAX} characters.`);

  const pickup = str(input.pickup);
  const ret = str(input.ret);
  const time = str(input.time);

  // Lapse first, so a hold whose window has passed cannot refuse this request
  // just because the cron has not run yet (V2 invariant 11).
  const [settings] = await Promise.all([getBookingSettings(), lapseExpired()]);
  const problem = checkRange({ pickup, ret, time }, settings.pickupHours);
  if (problem) return { ok: false, status: 400, error: "range", problem };

  const products = await getBookables(slugs);
  if (products.length !== slugs.length) {
    return invalid("items", "One of the pieces is no longer available to book.");
  }

  // ---- rate limit: bookings per phone, counted from the table itself (V2 §5)
  const recent = await sql<{ n: number }>`
    select count(*)::int as n from bookings
     where phone = ${phone} and created_at > now() - interval '1 hour'`;
  if ((recent[0]?.n ?? 0) >= 3) return { ok: false, status: 429, error: "rate_limited" };

  // ---- write --------------------------------------------------------------
  const token = toB64url(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await hashToken(token);
  const ids = products.map((p) => p.id);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const id = crypto.randomUUID();
    try {
      // Two statements in one transaction. The booking id is generated here so
      // the items can reference it without a round-trip in between; the item
      // trigger derives each item's blocked range and status from the booking.
      await transaction((tx) => [
        tx`
          insert into bookings
            (id, code, customer_name, phone, email, booked_range, status, amount_due,
             expires_at, pickup_time, customer_note, access_hash)
          values
            (${id}, ${code}, ${name}, ${phone}, ${email},
             daterange(${pickup}::date, ${ret}::date + 1, '[)'), 'pending', 0,
             least(now() + make_interval(mins => ${settings.expiryMinutes}),
                   (${pickup}::date + ${time}::time) at time zone 'Asia/Kolkata'),
             ${time}::time, ${note}, decode(${hash}, 'hex'))`,
        tx`
          insert into booking_items (booking_id, product_id, price, buffer_days)
          select ${id}, p.id, coalesce(p.rental_price, 0), ${settings.bufferDays}
            from products p
           where p.id = any(${ids}::uuid[])`,
      ]);
      return { ok: true, code, token };
    } catch (err) {
      const e = err as { code?: string; constraint?: string };
      if (e.code === "23505" && /code/.test(e.constraint ?? "")) continue; // code collision
      if (e.code === "23P01") {
        return { ok: false, status: 409, error: "dates_taken", slugs: await collidingSlugs(products, pickup, ret, settings.bufferDays) };
      }
      throw err;
    }
  }
  throw new Error("Could not allocate a booking code after 5 attempts.");
}

// A transaction on the owner connection. lib/db exposes only the tagged
// template, so the client is built here the same way.
let txClient: ReturnType<typeof neon> | null = null;
function transaction(build: (tx: ReturnType<typeof neon>) => ReturnType<ReturnType<typeof neon>>[]) {
  if (!txClient) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set.");
    txClient = neon(url);
  }
  return txClient.transaction(build(txClient));
}

/** Which of the requested pieces are blocked for the range — for the 409 message. */
async function collidingSlugs(products: Bookable[], pickup: string, ret: string, buffer: number): Promise<string[]> {
  const rows = await sql<{ id: string }>`
    select distinct bi.product_id as id from booking_items bi
     where bi.product_id = any(${products.map((p) => p.id)}::uuid[])
       and bi.status not in ('cancelled','returned')
       and bi.blocked_range && daterange(${pickup}::date, ${ret}::date + 1 + ${buffer}::int, '[)')`;
  const hit = new Set(rows.map((r) => r.id));
  return products.filter((p) => hit.has(p.id)).map((p) => p.slug);
}

// ---------------------------------------------------------------------------
// customer access (V2 §3)

export type CustomerBooking = {
  id: string;
  code: string;
  status: "pending" | "confirmed" | "picked_up" | "returned" | "cancelled";
  cancelledBy: "customer" | "shop" | "lapsed" | null;
  name: string;
  phone: string; // stored form; mask before rendering
  pickup: string;
  ret: string;
  time: string | null;
  expiresAt: string | null;
  createdAt: string;
  canCancel: boolean;
  cancelDeadline: string | null; // ISO
  items: { slug: string; name: string; type: string; price: number; category: string | null; images: unknown; spin: unknown }[];
};

type Row = {
  id: string;
  code: string;
  status: CustomerBooking["status"];
  cancelled_by: CustomerBooking["cancelledBy"];
  customer_name: string;
  phone: string;
  pickup: string;
  ret: string;
  time: string | null;
  expires_at: string | null;
  created_at: string;
  can_cancel: boolean;
  cancel_deadline: string | null;
};

// The cancel deadline, computed in SQL so the page and the UPDATE use one rule.
// Rows from before pickup_time existed fall back to the shop's opening time.
// `verified` means the caller has already checked a signed access cookie for this
// exact code (lib/bookingAccess); it is never reachable from request input alone.
async function loadBooking(where: "token" | "phone" | "verified", code: string, secret: string): Promise<CustomerBooking | null> {
  if (!CODE_RE.test(code)) return null;
  const s = await getBookingSettings();
  const open = s.pickupHours.open;
  // At most one of these is set, so the WHERE matches on one proof only.
  const hash = where === "token" ? await hashToken(secret) : null;
  const phone = where === "phone" ? secret : null;
  const verified = where === "verified";
  const rows = await sql<Row>`
    with b as (
      select *,
             (lower(booked_range) + coalesce(pickup_time, ${open}::time)) at time zone 'Asia/Kolkata'
               - make_interval(hours => ${s.cancelCutoffHours}) as deadline
        from bookings
       where code = ${code}
         and ((${hash}::text is not null and access_hash = decode(${hash}, 'hex'))
           or (${phone}::text is not null and phone = ${phone})
           or ${verified}::boolean)
    )
    select id, code, status, cancelled_by, customer_name, phone,
           to_char(lower(booked_range), 'YYYY-MM-DD') as pickup,
           to_char(upper(booked_range) - 1, 'YYYY-MM-DD') as ret,
           to_char(pickup_time, 'HH24:MI') as time,
           to_char(expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as expires_at,
           to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
           to_char(deadline at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cancel_deadline,
           (status in ('pending','confirmed') and now() < deadline) as can_cancel
      from b`;
  const r = rows[0];
  if (!r) return null;
  const items = await sql<{
    slug: string; name: string; type: string; price: string; category: string | null; images: unknown; spin: unknown;
  }>`
    select p.slug, p.name, p.type::text as type, bi.price, c.slug as category, p.images, p.spin
      from booking_items bi
      join products p on p.id = bi.product_id
      left join categories c on c.id = p.category_id
     where bi.booking_id = ${r.id}
     order by (p.type = 'jewellery'), p.name`;
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    cancelledBy: r.cancelled_by,
    name: r.customer_name,
    phone: r.phone,
    pickup: r.pickup,
    ret: r.ret,
    time: r.time,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    canCancel: r.can_cancel,
    cancelDeadline: r.cancel_deadline,
    items: items.map((i) => ({ ...i, price: Number(i.price) })),
  };
}

export async function getBookingByToken(code: string, token: string): Promise<CustomerBooking | null> {
  if (!isToken(token)) return null;
  await lapseExpired();
  return loadBooking("token", code, token);
}

export async function getBookingByPhone(code: string, rawPhone: string): Promise<CustomerBooking | null> {
  const phone = normalisePhone(rawPhone);
  if (!phone) return null;
  await lapseExpired();
  return loadBooking("phone", code, phone);
}

/** Only after verifyAccess(code, cookie) has returned true for this code. */
export async function getBookingByVerifiedCode(code: string): Promise<CustomerBooking | null> {
  await lapseExpired();
  return loadBooking("verified", code, "");
}

/**
 * Resolves whichever proof the request carries: the link token first, then the
 * signed cookie. Null means "show the code + phone form", identically whether or
 * not the code exists.
 */
export async function getBookingForVisitor(
  code: string,
  token: string | null | undefined,
  cookie: string | undefined,
): Promise<CustomerBooking | null> {
  if (!CODE_RE.test(code)) return null;
  if (token && isToken(token)) {
    const b = await getBookingByToken(code, token);
    if (b) return b;
  }
  if (await verifyAccess(code, cookie)) return getBookingByVerifiedCode(code);
  return null;
}

// ---------------------------------------------------------------------------
// customer cancellation (V2 §2.6)

/**
 * Cancels if, and only if, the booking is still cancellable at the moment of
 * the UPDATE: the status and the cutoff are both in its WHERE clause, so there is
 * no gap between checking and writing. `bookingId` comes from a prior
 * authenticated load (token or code + phone), never from the request.
 */
export async function cancelByCustomer(bookingId: string): Promise<boolean> {
  const s = await getBookingSettings();
  const rows = await sql`
    update bookings
       set status = 'cancelled', cancelled_by = 'customer', expires_at = null
     where id = ${bookingId}
       and status in ('pending','confirmed')
       and now() < (lower(booked_range) + coalesce(pickup_time, ${s.pickupHours.open}::time))
                     at time zone 'Asia/Kolkata' - make_interval(hours => ${s.cancelCutoffHours})
    returning id`;
  return rows.length === 1;
}

// ---------------------------------------------------------------------------
// extensions (v1.0 §2.5; charge recorded, paid at the shop per V2 §2.5)

export type ExtensionQuote =
  | { ok: true; extraDays: number; charge: number; newReturn: string }
  | { ok: false; error: "not_extendable" | "bad_date" | "too_long" | "open_request" | "dates_taken"; message: string };

const EXT_MESSAGES = {
  not_extendable: "Only a confirmed booking, or one already picked up, can be extended.",
  bad_date: "Choose a return date after the current one.",
  too_long: "That would take the booking past the longest we allow. Please call the shop.",
  open_request: "There is already a request to extend this booking. The shop will reply to it first.",
  dates_taken: "One of your pieces is booked by someone else soon after your dates, so it cannot be kept longer.",
} as const;

const extFail = (error: keyof typeof EXT_MESSAGES): ExtensionQuote => ({ ok: false, error, message: EXT_MESSAGES[error] });

/**
 * What an extension to `newReturn` would cost and whether it looks possible.
 * A pre-check for the customer's benefit only: approval re-runs the range change
 * through the exclusion constraint, which is the authority.
 */
export async function quoteExtension(bookingId: string, newReturn: string): Promise<ExtensionQuote> {
  const rows = await sql<{ status: string; pickup: string; ret: string; open: number }>`
    select b.status,
           to_char(lower(b.booked_range), 'YYYY-MM-DD') as pickup,
           to_char(upper(b.booked_range) - 1, 'YYYY-MM-DD') as ret,
           (select count(*)::int from extension_requests e where e.booking_id = b.id and e.status = 'pending') as open
      from bookings b where b.id = ${bookingId}`;
  const b = rows[0];
  if (!b || !["confirmed", "picked_up"].includes(b.status)) return extFail("not_extendable");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newReturn) || newReturn <= b.ret) return extFail("bad_date");
  const days = (a: string, z: string) => Math.round((Date.parse(`${z}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
  if (days(b.pickup, newReturn) + 1 > 30) return extFail("too_long");
  if (b.open > 0) return extFail("open_request");

  // Another booking's hold overlapping this booking's widened block, per item.
  const clash = await sql<{ n: number }>`
    select count(*)::int as n
      from booking_items mine
      join booking_items other
        on other.product_id = mine.product_id
       and other.booking_id <> mine.booking_id
       and other.status not in ('cancelled','returned')
       and other.blocked_range && daterange(upper(mine.blocked_range)::date,
                                            ${newReturn}::date + 1 + mine.buffer_days, '[)')
     where mine.booking_id = ${bookingId}`;
  if ((clash[0]?.n ?? 0) > 0) return extFail("dates_taken");

  const rate = await sql<{ total: string }>`
    select coalesce(sum(p.extension_rate), 0)::text as total
      from booking_items bi join products p on p.id = bi.product_id
     where bi.booking_id = ${bookingId}`;
  const extraDays = days(b.ret, newReturn);
  return { ok: true, extraDays, charge: Number(rate[0].total) * extraDays, newReturn };
}

/** Records a pending extension request after a successful quote. */
export async function requestExtension(bookingId: string, newReturn: string): Promise<ExtensionQuote> {
  const q = await quoteExtension(bookingId, newReturn);
  if (!q.ok) return q;
  // The NOT EXISTS keeps "one open request per booking" true under a double submit.
  const rows = await sql`
    insert into extension_requests (booking_id, requested_return, charge_amount)
    select ${bookingId}, ${newReturn}::date, ${q.charge}
     where not exists (select 1 from extension_requests where booking_id = ${bookingId} and status = 'pending')
    returning id`;
  return rows.length === 1 ? q : extFail("open_request");
}

export type ExtensionDecision = { ok: true } | { ok: false; error: "stale" | "dates_taken" };

/**
 * Admin approval. Widening booked_range re-fires the exclusion constraint through
 * the item sync trigger; a collision (23P01) rolls the whole transaction back and
 * the request is marked rejected (v1.0 §2.5 step 3). Callers must requireAdmin().
 */
export async function approveExtension(requestId: string): Promise<ExtensionDecision> {
  const req = await sql<{ booking_id: string; requested_return: string; charge_amount: string }>`
    select booking_id, to_char(requested_return, 'YYYY-MM-DD') as requested_return, charge_amount
      from extension_requests where id = ${requestId} and status = 'pending'`;
  const r = req[0];
  if (!r) return { ok: false, error: "stale" };
  try {
    const [widened] = await transaction((tx) => [
      tx`
        update bookings
           set booked_range = daterange(lower(booked_range), ${r.requested_return}::date + 1, '[)'),
               amount_due = amount_due + ${r.charge_amount}::numeric
         where id = ${r.booking_id} and status in ('confirmed','picked_up')
           and upper(booked_range) <= ${r.requested_return}::date
        returning id`,
      tx`
        update extension_requests set status = 'approved', decided_at = now()
         where id = ${requestId} and status = 'pending'
           -- Same transaction, so this sees the widened range: the request is
           -- approved only if the booking really now ends on the requested day.
           and exists (select 1 from bookings where id = ${r.booking_id}
                         and status in ('confirmed','picked_up')
                         and upper(booked_range) = ${r.requested_return}::date + 1)
        returning id`,
    ]);
    if ((widened as unknown[]).length === 0) return { ok: false, error: "stale" };
    return { ok: true };
  } catch (err) {
    if ((err as { code?: string }).code === "23P01") {
      await sql`update extension_requests set status = 'rejected', decided_at = now() where id = ${requestId} and status = 'pending'`;
      return { ok: false, error: "dates_taken" };
    }
    throw err;
  }
}

/** Admin rejection. Callers must requireAdmin(). */
export async function rejectExtension(requestId: string): Promise<ExtensionDecision> {
  const rows = await sql`
    update extension_requests set status = 'rejected', decided_at = now()
     where id = ${requestId} and status = 'pending' returning id`;
  return rows.length === 1 ? { ok: true } : { ok: false, error: "stale" };
}
