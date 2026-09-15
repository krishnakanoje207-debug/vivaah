// Shared display helpers + status config for the bookings inbox, detail page and
// dashboard. Pure formatting — no DB access. Lives under bookings/ so it stays
// inside the admin panel's allowed file set.

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "picked_up"
  | "returned"
  | "cancelled";

export type CancelledBy = "customer" | "shop" | "lapsed" | null;

// Inbox tabs. `status: null` = no status filter; `extensions` narrows to bookings
// with an extension request still waiting on her.
export const TABS = [
  { key: "pending", label: "Awaiting confirmation", status: "pending" as const, extensions: false },
  { key: "confirmed", label: "Confirmed", status: "confirmed" as const, extensions: false },
  { key: "picked_up", label: "Picked up", status: "picked_up" as const, extensions: false },
  { key: "returned", label: "Returned", status: "returned" as const, extensions: false },
  { key: "cancelled", label: "Cancelled", status: "cancelled" as const, extensions: false },
  { key: "extensions", label: "Extension requests", status: null, extensions: true },
  { key: "all", label: "All", status: null, extensions: false },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

export function resolveTab(raw: string | undefined): (typeof TABS)[number] {
  return TABS.find((t) => t.key === raw) ?? TABS[0];
}

// Per-status label + badge styling (design tokens only).
export const STATUS_META: Record<BookingStatus, { label: string; badge: string }> = {
  pending: { label: "Awaiting confirmation", badge: "bg-gold-100 text-warning" },
  confirmed: { label: "Confirmed", badge: "bg-violet-100 text-violet-800" },
  picked_up: { label: "Picked up", badge: "bg-violet-800 text-porcelain-50" },
  returned: { label: "Returned", badge: "bg-success/10 text-success" },
  cancelled: { label: "Cancelled", badge: "bg-porcelain-200 text-ink-600" },
};

// Who ended it. A shop cancellation of a booking she had already confirmed is
// not a decline, and `verified_at` is what tells the two apart. Rows cancelled
// before `cancelled_by` existed stay plain "Cancelled".
export function statusLabel(
  status: BookingStatus,
  cancelledBy: CancelledBy,
  wasConfirmed: boolean,
): string {
  if (status !== "cancelled") return STATUS_META[status].label;
  if (cancelledBy === "customer") return "Customer cancelled";
  if (cancelledBy === "lapsed") return "Lapsed";
  if (cancelledBy === "shop") return wasConfirmed ? "Cancelled by shop" : "Declined";
  return "Cancelled";
}

export const formatINR = (n: number | string | null | undefined): string => {
  const value = typeof n === "string" ? Number(n) : (n ?? 0);
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
};

// expires_at arrives as epoch milliseconds (extract(epoch ...)*1000). Rendered
// once on the server; no live ticking (a soft refresh re-reads it).
export function lapsesLabel(expiresMs: number | string | null | undefined): string {
  if (expiresMs == null) return "";
  const ms = typeof expiresMs === "string" ? Number(expiresMs) : expiresMs;
  const diff = ms - Date.now();
  if (diff <= 0) return "lapsing now";
  const totalMin = Math.floor(diff / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `lapses in ${d}d ${h}h`;
  return h > 0 ? `lapses in ${h}h ${m}m` : `lapses in ${m}m`;
}

// Digits-only for wa.me deep links (spec §comms manual fallback).
export function waDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

// tel: keeps the leading + so "+91 98765 43210" dials as an international number.
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
