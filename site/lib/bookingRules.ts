// Booking rules that both the booking form and the server apply — PURE, no DB,
// no secrets, safe in client components. The server re-runs every one of these;
// on the client they only decide what to offer (specs/BOOKING_ENGINE_SPEC_V2.md).
//
// Every date here is an Asia/Kolkata calendar date held as "YYYY-MM-DD". The shop
// is in one timezone and so are its customers; a Date object would drag the
// visitor's own offset into a question that has nothing to do with it.

export const TZ = "Asia/Kolkata";
export const MAX_ITEMS = 12; // matches the selection tray
export const MAX_DAYS = 30; // inclusive pickup-to-return length
export const HORIZON_DAYS = 180; // furthest pickup date offered
export const MIN_LEAD_MINUTES = 120; // pickup must leave the shop time to confirm
export const NOTE_MAX = 500;

export type PickupHours = {
  open: string; // "HH:MM"
  close: string; // "HH:MM", last slot is strictly before this
  step_minutes: number;
  closed_weekdays: number[]; // 0 = Sunday
};

export const DEFAULT_PICKUP_HOURS: PickupHours = {
  open: "11:00",
  close: "20:00",
  step_minutes: 30,
  closed_weekdays: [0],
};

/** A blocked range from product_unavailable_ranges: [start, end) as dates. */
export type Blocked = { start: string; end: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isDate = (s: unknown): s is string =>
  typeof s === "string" && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const isTime = (s: unknown): s is string => typeof s === "string" && TIME_RE.test(s);

// Date arithmetic in UTC on purpose: a calendar date has no offset, and UTC has
// no daylight saving to shift a day under us.
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Today's date in the shop's timezone. */
export function todayIST(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fromMinutes = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Epoch ms of a date + time in IST. IST is a fixed +05:30 with no DST. */
export function istToEpoch(date: string, time: string): number {
  return Date.parse(`${date}T${time}:00+05:30`);
}

/** Every pickup slot the shop offers on a given date, ignoring lead time. */
export function slotsFor(date: string, hours: PickupHours): string[] {
  if (hours.closed_weekdays.includes(weekday(date))) return [];
  const step = Math.max(5, hours.step_minutes);
  const out: string[] = [];
  for (let m = toMinutes(hours.open); m < toMinutes(hours.close); m += step) {
    out.push(fromMinutes(m));
  }
  return out;
}

/** Slots still bookable: on the grid and at least MIN_LEAD_MINUTES away. */
export function openSlots(date: string, hours: PickupHours, now = Date.now()): string[] {
  return slotsFor(date, hours).filter(
    (t) => istToEpoch(date, t) - now >= MIN_LEAD_MINUTES * 60_000,
  );
}

/**
 * The dates a new booking would block: pickup through return, plus the buffer
 * after it, as [start, end). Mirrors booking_items_derive() in the schema, so the
 * calendar and the exclusion constraint agree about what "free" means.
 */
export function wouldBlock(pickup: string, ret: string, bufferDays: number): Blocked {
  return { start: pickup, end: addDays(ret, 1 + bufferDays) };
}

export const overlaps = (a: Blocked, b: Blocked) => a.start < b.end && b.start < a.end;

/** Whether one calendar day is inside any blocked range. */
export function isBlockedDay(date: string, blocked: Blocked[]): boolean {
  return blocked.some((r) => r.start <= date && date < r.end);
}

export type RangeProblem =
  | "bad_date"
  | "past"
  | "too_far"
  | "return_before_pickup"
  | "too_long"
  | "closed_day"
  | "bad_time"
  | "too_soon";

/** Validates dates + pickup time. Returns the first problem, or null. */
export function checkRange(
  input: { pickup: string; ret: string; time: string },
  hours: PickupHours,
  now = Date.now(),
): RangeProblem | null {
  const { pickup, ret, time } = input;
  if (!isDate(pickup) || !isDate(ret)) return "bad_date";
  const today = todayIST(new Date(now));
  if (pickup < today) return "past";
  if (daysBetween(today, pickup) > HORIZON_DAYS) return "too_far";
  if (ret < pickup) return "return_before_pickup";
  if (daysBetween(pickup, ret) + 1 > MAX_DAYS) return "too_long";
  if (hours.closed_weekdays.includes(weekday(pickup))) return "closed_day";
  if (!isTime(time) || !slotsFor(pickup, hours).includes(time)) return "bad_time";
  if (istToEpoch(pickup, time) - now < MIN_LEAD_MINUTES * 60_000) return "too_soon";
  return null;
}

export const RANGE_MESSAGES: Record<RangeProblem, string> = {
  bad_date: "Choose a pickup and a return date.",
  past: "The pickup date has already passed.",
  too_far: `We take bookings up to ${HORIZON_DAYS} days ahead.`,
  return_before_pickup: "The return date comes before the pickup date.",
  too_long: `A booking can run for up to ${MAX_DAYS} days.`,
  closed_day: "The shop is closed on that day. Choose another pickup date.",
  bad_time: "Choose a pickup time from the list.",
  too_soon: "Pickup needs to be at least two hours from now, so we can confirm first.",
};

/**
 * Indian mobile number to the stored form "+91 98765 43210", or null. Accepts
 * spaces, dashes, a leading 0, and +91 / 91 prefixes.
 */
export function normalisePhone(raw: string): string | null {
  let d = raw.replace(/[^\d]/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) return null;
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

/** "98•••••210" — enough for her to recognise her own number, no more. */
export function maskPhone(stored: string): string {
  const d = stored.replace(/[^\d]/g, "").slice(-10);
  return `${d.slice(0, 2)}•••••${d.slice(7)}`;
}

export const CODE_RE = /^VVH-[0-9A-HJKMNP-TV-Z]{4}$/;

/** Human date, e.g. "Sat 14 Nov 2026". */
export function formatDay(date: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** "11:30" → "11:30 am". */
export function formatTime(time: string): string {
  const h = Number(time.slice(0, 2));
  const m = time.slice(3, 5);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${h < 12 ? "am" : "pm"}`;
}
