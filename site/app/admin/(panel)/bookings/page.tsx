import Link from "next/link";
import { sql } from "@/lib/db";
import { lapseExpired } from "@/lib/booking";
import { formatDay, formatTime } from "@/lib/bookingRules";
import {
  TABS,
  STATUS_META,
  lapsesLabel,
  resolveTab,
  statusLabel,
  telHref,
  waDigits,
  type BookingStatus,
  type CancelledBy,
} from "./format";

// The inbox is a server component — reads run on the owner connection. Rows link
// to the detail page. Pending requests sort soonest-lapsing first (the owner's
// most time-sensitive work); everything else by most-recently-touched.
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  status: BookingStatus;
  cancelled_by: CancelledBy;
  was_confirmed: boolean;
  pickup: string;
  ret: string;
  pickup_time: string | null;
  expires_ms: string | null;
  customer_note: string | null;
  item_names: string | null;
  item_count: number;
  open_extension: boolean;
};

async function loadRows(status: BookingStatus | null, extensions: boolean): Promise<Row[]> {
  return sql<Row>`
    select
      b.id, b.code, b.customer_name, b.phone, b.status, b.cancelled_by, b.customer_note,
      b.verified_at is not null                          as was_confirmed,
      to_char(lower(b.booked_range), 'YYYY-MM-DD')       as pickup,
      to_char(upper(b.booked_range) - 1, 'YYYY-MM-DD')   as ret,
      to_char(b.pickup_time, 'HH24:MI')                  as pickup_time,
      extract(epoch from b.expires_at) * 1000            as expires_ms,
      (select string_agg(p.name, ', ' order by p.name)
         from booking_items bi join products p on p.id = bi.product_id
        where bi.booking_id = b.id)                      as item_names,
      (select count(*)::int from booking_items bi where bi.booking_id = b.id) as item_count,
      exists (select 1 from extension_requests e
               where e.booking_id = b.id and e.status = 'pending') as open_extension
    from bookings b
    where (${status}::text is null or b.status = ${status}::booking_status)
      and (not ${extensions}::boolean
           or exists (select 1 from extension_requests e
                       where e.booking_id = b.id and e.status = 'pending'))
    order by
      (b.status = 'pending') desc,
      case when b.status = 'pending' then b.expires_at end asc,
      b.updated_at desc`;
}

function StatusBadge({ row }: { row: Row }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-caption ${STATUS_META[row.status].badge}`}>
      {statusLabel(row.status, row.cancelled_by, row.was_confirmed)}
    </span>
  );
}

// The whole card opens the booking (a stretched link); the call and WhatsApp
// links on a pending request sit above it so she can reach the customer in one tap.
function BookingRow({ row }: { row: Row }) {
  const pending = row.status === "pending";
  return (
    <div className="relative rounded-card border border-ink-900/10 bg-white p-4 shadow-card transition-colors hover:border-violet-300 md:grid md:grid-cols-[1.4fr_1.6fr_1.4fr_auto] md:items-center md:gap-4">
      {/* Customer + code */}
      <div className="min-w-0">
        <Link
          href={`/admin/bookings/${row.id}`}
          className="font-display text-h3 text-ink-900 after:absolute after:inset-0 after:rounded-card"
        >
          {row.customer_name}
        </Link>
        <p className="tabular mt-0.5 text-caption text-ink-400">
          {row.code} · {row.phone}
        </p>
        {pending && (
          <p className="relative z-10 mt-2 flex gap-2 text-caption">
            <a
              href={telHref(row.phone)}
              className="rounded-control border border-violet-800/30 px-3 py-1.5 text-violet-800 hover:bg-violet-100"
            >
              Call
            </a>
            <a
              href={`https://wa.me/${waDigits(row.phone)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-control border border-violet-800/30 px-3 py-1.5 text-violet-800 hover:bg-violet-100"
            >
              WhatsApp
            </a>
          </p>
        )}
      </div>

      {/* Pieces + the customer's note */}
      <div className="mt-2 min-w-0 md:mt-0">
        <p className="truncate text-body text-ink-600">
          <span className="tabular text-ink-900">
            {row.item_count} {row.item_count === 1 ? "piece" : "pieces"}
          </span>
          {row.item_names && ` · ${row.item_names}`}
        </p>
        {row.customer_note && (
          <p className="mt-0.5 truncate text-caption text-ink-600 italic">“{row.customer_note}”</p>
        )}
      </div>

      {/* Pickup + return, and for a request, when it lapses */}
      <div className="mt-2 md:mt-0">
        <p className="tabular text-caption text-ink-900">
          Pickup {formatDay(row.pickup)}
          {row.pickup_time && `, ${formatTime(row.pickup_time)}`}
        </p>
        <p className="tabular text-caption text-ink-600">Return {formatDay(row.ret)}</p>
        {pending && <p className="mt-0.5 text-caption text-warning">{lapsesLabel(row.expires_ms)}</p>}
      </div>

      {/* Status + open extension flag */}
      <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0 md:flex-col md:items-end">
        <StatusBadge row={row} />
        {row.open_extension && (
          <span className="inline-block rounded-full bg-gold-100 px-2.5 py-0.5 text-caption text-gold-700">
            Extension requested
          </span>
        )}
      </div>
    </div>
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
  // Lapse first, so a request whose window has passed reads as lapsed here.
  await lapseExpired();
  const rows = await loadRows(active.status, active.extensions);

  return (
    <div>
      <h1 className="font-display text-h2 text-ink-900">Bookings</h1>
      <p className="mt-1 text-body text-ink-600">
        Confirm requests with the customer, then track each rental.
      </p>

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
