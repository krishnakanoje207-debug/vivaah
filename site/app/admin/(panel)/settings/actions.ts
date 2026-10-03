"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { revokeAllSessions } from "@/lib/adminSessions";
import { SESSION_COOKIE } from "@/lib/adminAuth";
import { isTime, type PickupHours } from "@/lib/bookingRules";
import { mirror } from "@/lib/shopInfo";

export type SettingsState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Parse a non-negative integer from a form field; collects a friendly error.
function readInt(
  form: FormData,
  name: string,
  label: string,
  errors: Record<string, string>,
): number | null {
  const raw = String(form.get(name) ?? "").trim();
  if (raw === "") {
    errors[name] = `${label} is required.`;
    return null;
  }
  if (!/^\d+$/.test(raw)) {
    errors[name] = `${label} must be a whole number (0 or more).`;
    return null;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(n) || n < 0) {
    errors[name] = `${label} must be a whole number (0 or more).`;
    return null;
  }
  return n;
}

const STEP_CHOICES = [15, 30, 60];

// --- Booking rules: jsonb-number settings plus the pickup_hours object --------
export async function saveBookingRules(
  _prev: SettingsState,
  form: FormData,
): Promise<SettingsState> {
  await requireAdmin();
  const errors: Record<string, string> = {};
  const buffer = readInt(form, "buffer_days", "Buffer days", errors);
  const confirmHours = readInt(form, "confirm_within_hours", "Confirm within", errors);
  const cutoff = readInt(form, "cancel_cutoff_hours", "Cancel cutoff", errors);
  const step = readInt(form, "step_minutes", "Slot length", errors);
  const quota = readInt(form, "sms_daily_quota", "SMS daily quota", errors);
  const open = String(form.get("open") ?? "").trim();
  const close = String(form.get("close") ?? "").trim();
  const closed = [...new Set(form.getAll("closed_weekdays").map((v) => Number(v)))]
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);

  if (buffer !== null && buffer > 14) {
    errors.buffer_days = "Buffer days cannot exceed 14 (per booking rules).";
  }
  // A week is already longer than any pickup lead; a request lapses at its pickup
  // time regardless (V2 §2.1).
  if (confirmHours !== null && (confirmHours < 1 || confirmHours > 168)) {
    errors.confirm_within_hours = "Confirm within must be between 1 and 168 hours.";
  }
  if (cutoff !== null && cutoff > 72) {
    errors.cancel_cutoff_hours = "Cancel cutoff cannot exceed 72 hours.";
  }
  if (step !== null && !STEP_CHOICES.includes(step)) {
    errors.step_minutes = "Slot length must be 15, 30 or 60 minutes.";
  }
  if (!isTime(open)) errors.open = "Opening time must be HH:MM.";
  if (!isTime(close)) errors.close = "Closing time must be HH:MM.";
  // Zero-padded HH:MM compares correctly as a string.
  if (isTime(open) && isTime(close) && open >= close) {
    errors.close = "Closing time must be after opening time.";
  }
  if (closed.length === 7) {
    errors.closed_weekdays = "The shop has to be open for pickups on at least one day.";
  }
  if (Object.keys(errors).length > 0) return { fieldErrors: errors };

  const pickupHours: PickupHours = { open, close, step_minutes: step!, closed_weekdays: closed };

  // to_jsonb(int) keeps these as jsonb *numbers*, not strings.
  await sql`update settings set value = to_jsonb(${buffer}::int) where key = 'buffer_days'`;
  await sql`update settings set value = to_jsonb(${confirmHours! * 60}::int) where key = 'booking_expiry_minutes'`;
  await sql`update settings set value = to_jsonb(${cutoff}::int) where key = 'cancel_cutoff_hours'`;
  await sql`update settings set value = ${JSON.stringify(pickupHours)}::jsonb where key = 'pickup_hours'`;
  await sql`update settings set value = to_jsonb(${quota}::int) where key = 'sms_daily_quota'`;

  revalidatePath("/admin/settings");
  return { ok: true };
}

// --- Shop details: what customers read about the shop -----------------------
// Every field here reaches a page (lib/shopInfo.ts says which and how). An empty
// field means "not given": the address, map link and hours fall back to the
// built-in values and every other row is hidden rather than printed as a gap.

// The longest each may be, so a paste cannot break a layout built for a line.
const SHOP_TEXT: Record<string, { label: string; max: number }> = {
  address: { label: "The address", max: 200 },
  hours: { label: "The hours", max: 100 },
  town: { label: "The town", max: 80 },
  getting_here: { label: "Getting here", max: 400 },
  why_back: { label: "Why people come back", max: 300 },
  retention: { label: "How long a booking is kept", max: 80 },
};

export async function saveShop(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const errors: Record<string, string> = {};
  const patch: Record<string, string | number | null> = {};

  for (const [name, { label, max }] of Object.entries(SHOP_TEXT)) {
    const v = String(form.get(name) ?? "").replace(/\s+/g, " ").trim();
    if (v.length > max) errors[name] = `${label} has to be under ${max} characters.`;
    // The site's copy never uses long dashes (house style), and this is copy.
    else if (v.includes("—")) errors[name] = "The site does not use long dashes. Use a comma or a full stop instead.";
    patch[name] = v;
  }

  // The map link lands in an href on several pages, so anything that is not an
  // https URL is refused rather than stored.
  const maps = String(form.get("maps_url") ?? "").trim();
  if (maps !== "" && !/^https:\/\/\S+$/.test(maps)) errors.maps_url = "Paste the whole link, starting https://";
  patch.maps_url = maps;

  // Empty means the built-in market figure; otherwise whole rupees.
  const rawPrice = String(form.get("purchase_price") ?? "").replace(/[,\s₹]/g, "");
  if (rawPrice === "") patch.purchase_price = null;
  else if (!/^\d+$/.test(rawPrice) || +rawPrice < 1000 || +rawPrice > 10_000_000) {
    errors.purchase_price = "Give the price in whole rupees, between 1,000 and 1,00,00,000.";
  } else patch.purchase_price = Number.parseInt(rawPrice, 10);

  if (Object.keys(errors).length > 0) return { fieldErrors: errors };

  // `||` merges top-level keys, so lat/lng and anything else stored survive.
  const rows = await sql<{ value: Record<string, unknown> }>`
    update settings set value = value || ${JSON.stringify(patch)}::jsonb
    where key = 'shop_info'
    returning value
  `;
  if (rows[0]) await mirror(rows[0].value);
  revalidatePath("/admin/settings");
  return { ok: true };
}

// --- Rental terms: /policies in the shop's own words --------------------------
// Replaced the "Charges copy" form, which saved text no page ever showed. Kept
// beside the shop details in `shop_info` so /policies reads them from the same
// KV copy and still touches no database.
const TERMS_FIELDS: Record<string, string> = {
  terms_extensions: "Extensions",
  terms_damage: "Damage and care",
  terms_pickup: "Pickup and return",
  terms_charges: "Charges",
};
const TERMS_MAX = 1200;

export async function saveTerms(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const errors: Record<string, string> = {};
  const patch: Record<string, string> = {};
  for (const [name, label] of Object.entries(TERMS_FIELDS)) {
    // Paragraph breaks are kept; runs of spaces inside a line are not.
    const v = String(form.get(name) ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (v.length > TERMS_MAX) errors[name] = `${label} has to be under ${TERMS_MAX} characters.`;
    else if (v.includes("—")) errors[name] = "The site does not use long dashes. Use a comma or a full stop instead.";
    patch[name] = v;
  }
  if (Object.keys(errors).length > 0) return { fieldErrors: errors };

  const rows = await sql<{ value: Record<string, unknown> }>`
    update settings set value = value || ${JSON.stringify(patch)}::jsonb
    where key = 'shop_info'
    returning value
  `;
  if (rows[0]) await mirror(rows[0].value);
  revalidatePath("/admin/settings");
  return { ok: true };
}

// --- Sessions ----------------------------------------------------------------

/**
 * End every admin session, including this one (SECURITY_HARDENING_SPEC S2).
 *
 * The session token carries an issued-at and is refused once that is older than
 * the stored floor, so moving the floor to now invalidates every token that has
 * ever been handed out. This is the answer to a browser left logged in at the
 * shop, a borrowed phone, or a cookie copied off a machine — none of which the
 * ordinary "Log out" can reach, because that only clears the cookie in front of
 * it.
 *
 * It deliberately signs the caller out too. Anything else would need a session
 * identity to exclude, and this system has one admin and no session identities;
 * being asked to log in again is also the honest confirmation that it worked.
 */
export async function signOutEverywhere(): Promise<void> {
  await requireAdmin();
  await revokeAllSessions();
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login?revoked=1");
}
