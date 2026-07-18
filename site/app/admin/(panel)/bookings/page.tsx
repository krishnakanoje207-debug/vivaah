import Link from "next/link";
import { sql } from "@/lib/db";
import {
  TABS,
  STATUS_META,
  formatINR,
  formatDateRange,
  expiresLabel,
  resolveTab,
  type BookingStatus,
} from "./format";

// The inbox is a server component — reads run on the owner connection. Rows link
// to the detail page. Pending sorts by soonest-expiring hold first (the owner's
// most time-sensitive work); everything else by most-recently-touched.
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  status: BookingStatus;
  amount_due: string;
  payment_ref: string | null;
  pickup: string;
  ret: string;
  expires_ms: string | null;
  item_names: string | null;
};

async function loadRows(status: BookingStatus | null): Promise<Row[]> {
  return sql<Row>`
    select
      b.id, b.code, b.customer_name, b.phone, b.status, b.amount_due, b.payment_ref,
      to_char(lower(b.booked_range), 'YYYY-MM-DD')       as pickup,
      to_char(upper(b.booked_range) - 1, 'YYYY-MM-DD')   as ret,
      extract(epoch from b.expires_at) * 1000            as expires_ms,
      (select string_agg(p.name, ', ' order by p.name)
         from booking_items bi join products p on p.id = bi.product_id
        where bi.booking_id = b.id)                      as item_names
    from bookings b
    where ${status}::text is null or b.status = ${status}::booking_status
    order by
      (b.status = 'pending') desc,
      case when b.status = 'pending' then b.expires_at end asc,
      b.updated_at desc`;
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-caption ${meta.badge}`}>
      {meta.label}
    </span>
  );
}

function BookingRow({ row }: { row: Row }) {
  return (
    <Link
      href={`/admin/bookings/${row.id}`}
      className="block rounded-card border border-ink-900/10 bg-white p-4 shadow-card transition-colors hover:border-violet-300 md:grid md:grid-cols-[1.5fr_1.6fr_1.3fr_auto] md:items-center md:gap-4"
    >
      {/* Code + customer */}
      <div className="min-w-0">
        <p className="font-display text-h3 text-ink-900">{row.customer_name}</p>
        <p className="tabular mt-0.5 text-caption text-ink-400">
          {row.code} · {row.phone}
        </p>
      </div>

      {/* Items */}
      <p className="mt-2 truncate text-body text-ink-600 md:mt-0">
        {row.item_names ?? "—"}
      </p>

      {/* Dates + (for pending) hold + UTR state */}
      <div className="mt-2 md:mt-0">
        <p className="tabular text-caption text-ink-600">{formatDateRange(row.pickup, row.ret)}</p>
        {row.status === "pending" && (
          <p className="mt-0.5 text-caption text-warning">
            {expiresLabel(row.expires_ms)}
            {" · "}
            {row.payment_ref ? "UTR received" : "awaiting UTR"}
          </p>
        )}
      </div>

      {/* Amount + status */}
      <div className="mt-3 flex items-center justify-between gap-3 md:mt-0 md:flex-col md:items-end">
        <span className="tabular text-body text-ink-900">{formatINR(row.amount_due)}</span>
        <StatusBadge status={row.status} />
      </div>
    </Link>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-card border border-dashed border-ink-900/15 bg-white/50 px-6 py-16 text-center">
      <p className="font-display text-h3 text-ink-600">Nothing here yet</p>
      <p className="mt-1 text-caption text-ink-400">
        No bookings in “{label}”. New requests will appear here.
      </p>
    </div>
  );
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const active = resolveTab(tab);
  const rows = await loadRows(active.status);

  return (
    <div>
      <h1 className="font-display text-h2 text-ink-900">Bookings</h1>
      <p className="mt-1 text-body text-ink-600">Verify payments and track each rental.</p>

      {/* Tab bar */}
      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const isActive = t.key === active.key;
          return (
            <Link
              key={t.key}
              href={t.key === "pending" ? "/admin/bookings" : `/admin/bookings?tab=${t.key}`}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-control px-3 py-1.5 text-caption transition-colors ${
                isActive
                  ? "bg-violet-800 text-porcelain-50"
                  : "border border-ink-900/15 text-ink-600 hover:border-ink-900/30 hover:text-ink-900"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex flex-col gap-3">
        {rows.length === 0 ? (
          <EmptyState label={active.label} />
        ) : (
          rows.map((row) => <BookingRow key={row.id} row={row} />)
        )}
      </div>
    </div>
  );
}
