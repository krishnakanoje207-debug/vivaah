"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { revokeAllSessions } from "@/lib/adminSessions";
import { SESSION_COOKIE } from "@/lib/adminAuth";
import { isTime, type PickupHours } from "@/lib/bookingRules";

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

// --- Shop info: merge so lat/lng (untouched here) survive --------------------
export async function saveShop(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const patch = {
    name: String(form.get("name") ?? "").trim(),
    address: String(form.get("address") ?? "").trim(),
    maps_url: String(form.get("maps_url") ?? "").trim(),
    hours: String(form.get("hours") ?? "").trim(),
    phone: String(form.get("phone") ?? "").trim(),
  };
  if (patch.name === "") {
    return { fieldErrors: { name: "Shop name is required." } };
  }
  // The map link lands in an href on /visit, so anything that is not an https
  // URL is refused rather than stored.
  if (patch.maps_url !== "" && !patch.maps_url.startsWith("https://")) {
    return { fieldErrors: { maps_url: "Must be an https:// link." } };
  }

  // `||` merges top-level keys; lat/lng absent from the patch are preserved.
  await sql`
    update settings set value = value || ${JSON.stringify(patch)}::jsonb
    where key = 'shop_info'
  `;
  revalidatePath("/admin/settings");
  return { ok: true };
}

// --- Charges copy (EN + HI) --------------------------------------------------
export async function saveCharges(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const patch = {
    en: String(form.get("en") ?? ""),
    hi: String(form.get("hi") ?? ""),
  };
  await sql`
    update settings set value = value || ${JSON.stringify(patch)}::jsonb
    where key = 'charges_copy'
  `;
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
