"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

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

// --- Booking rules: three jsonb-number settings ------------------------------
export async function saveBookingRules(
  _prev: SettingsState,
  form: FormData,
): Promise<SettingsState> {
  await requireAdmin();
  const errors: Record<string, string> = {};
  const buffer = readInt(form, "buffer_days", "Buffer days", errors);
  const expiry = readInt(form, "booking_expiry_minutes", "Hold expiry (minutes)", errors);
  const quota = readInt(form, "sms_daily_quota", "SMS daily quota", errors);

  if (buffer !== null && buffer > 14) {
    errors.buffer_days = "Buffer days cannot exceed 14 (per booking rules).";
  }
  if (Object.keys(errors).length > 0) return { fieldErrors: errors };

  // to_jsonb(int) keeps these as jsonb *numbers*, not strings.
  await sql`update settings set value = to_jsonb(${buffer}::int) where key = 'buffer_days'`;
  await sql`update settings set value = to_jsonb(${expiry}::int) where key = 'booking_expiry_minutes'`;
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

// --- Payments (UPI) ----------------------------------------------------------
export async function savePayments(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const patch = {
    id: String(form.get("id") ?? "").trim(),
    number: String(form.get("number") ?? "").trim(),
    qr_path: String(form.get("qr_path") ?? "").trim(),
  };
  // The QR path becomes an img src. It is a local asset, so it starts with a
  // slash; a bare scheme would let a saved value point anywhere.
  if (patch.qr_path !== "" && !patch.qr_path.startsWith("/")) {
    return { fieldErrors: { qr_path: "Must start with a slash." } };
  }
  await sql`
    update settings set value = value || ${JSON.stringify(patch)}::jsonb
    where key = 'upi'
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
