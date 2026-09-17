import { sql } from "@/lib/db";
import { getBookingSettings } from "@/lib/booking";
import {
  BookingRulesForm,
  ShopForm,
  ChargesForm,
  SessionsForm,
} from "./SettingsForms";

export const dynamic = "force-dynamic";

type SettingRow = { key: string; value: unknown };

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" ? v : fallback;
}
function obj<T extends Record<string, unknown>>(v: unknown, fallback: T): T {
  return v && typeof v === "object" && !Array.isArray(v) ? { ...fallback, ...(v as T) } : fallback;
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export default async function AdminSettingsPage() {
  const [rows, rules] = await Promise.all([
    sql<SettingRow>`select key, value from settings`,
    getBookingSettings(),
  ]);
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const shop = obj(map.get("shop_info"), {
    name: "",
    address: "",
    maps_url: "",
    hours: "",
    phone: "",
  });
  const charges = obj(map.get("charges_copy"), { en: "", hi: "" });

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <p className="eyebrow">Vivaah</p>
        <h1 className="mt-1 font-display text-h2 text-ink-900">Settings</h1>
        <p className="mt-2 text-body text-ink-600">
          Shop details and booking rules.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-6">
        <BookingRulesForm
          initial={{
            buffer_days: rules.bufferDays,
            // Stored as minutes; she thinks in hours.
            confirm_within_hours: Math.max(1, Math.round(rules.expiryMinutes / 60)),
            cancel_cutoff_hours: rules.cancelCutoffHours,
            pickup_hours: rules.pickupHours,
            sms_daily_quota: num(map.get("sms_daily_quota"), 100),
          }}
        />
        <ShopForm
          initial={{
            name: str(shop.name),
            address: str(shop.address),
            maps_url: str(shop.maps_url),
            hours: str(shop.hours),
            phone: str(shop.phone),
          }}
        />
        <ChargesForm initial={{ en: str(charges.en), hi: str(charges.hi) }} />
        <SessionsForm />
      </div>
    </div>
  );
}
