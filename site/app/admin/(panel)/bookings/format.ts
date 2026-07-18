// Shared display helpers + status config for the bookings inbox, detail page and
// dashboard. Pure formatting — no DB access. Lives under bookings/ so it stays
// inside the admin panel's allowed file set.

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "picked_up"
  | "returned"
  | "cancelled";

// Inbox status tabs. `status: null` = the "All" view (no filter).
export const TABS = [
  { key: "pending", label: "Needs verification", status: "pending" as const },
  { key: "confirmed", label: "Confirmed", status: "confirmed" as const },
  { key: "picked_up", label: "Picked up", status: "picked_up" as const },
  { key: "returned", label: "Returned", status: "returned" as const },
  { key: "cancelled", label: "Cancelled", status: "cancelled" as const },
  { key: "all", label: "All", status: null },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

export function resolveTab(raw: string | undefined): (typeof TABS)[number] {
  return TABS.find((t) => t.key === raw) ?? TABS[0];
}

// Per-status label + badge styling (design tokens only).
export const STATUS_META: Record<BookingStatus, { label: string; badge: string }> = {
  pending: { label: "Needs verification", badge: "bg-gold-100 text-warning" },
  confirmed: { label: "Confirmed", badge: "bg-violet-100 text-violet-800" },
  picked_up: { label: "Picked up", badge: "bg-violet-800 text-porcelain-50" },
  returned: { label: "Returned", badge: "bg-success/10 text-success" },
  cancelled: { label: "Cancelled", badge: "bg-porcelain-200 text-ink-400" },
};

export const formatINR = (n: number | string | null | undefined): string => {
  const value = typeof n === "string" ? Number(n) : (n ?? 0);
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// SQL hands us date-only fields pre-cast to 'YYYY-MM-DD' text (via to_char) so
// there is no timezone ambiguity to reason about here.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// pickup → return, compact.
export function formatDateRange(
  pickup: string | null | undefined,
  ret: string | null | undefined,
): string {
  return `${formatDate(pickup)} – ${formatDate(ret)}`;
}

// expires_at arrives as epoch milliseconds (extract(epoch ...)*1000). Rendered
// once on the server; no live ticking (a soft refresh re-reads it).
export function expiresLabel(expiresMs: number | string | null | undefined): string {
  if (expiresMs == null) return "";
  const ms = typeof expiresMs === "string" ? Number(expiresMs) : expiresMs;
  const diff = ms - Date.now();
  if (diff <= 0) return "hold expired";
  const totalMin = Math.floor(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `expires in ${h}h ${m}m` : `expires in ${m}m`;
}

// Digits-only for wa.me deep links (spec §comms manual fallback).
export function waDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}
