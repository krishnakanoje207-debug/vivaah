import Link from "next/link";
import { sql } from "@/lib/db";
import { CallList, type DueSoon } from "./CallList";
import { after } from "next/server";
import { lapseExpired } from "@/lib/booking";
import { notifyLapsed } from "@/lib/comms";
import { formatDay, formatTime } from "@/lib/bookingRules";
import {
  STATUS_META,
  lapsesLabel,
  statusLabel,
  type BookingStatus,
  type CancelledBy,
} from "./bookings/format";

export const dynamic = "force-dynamic";

type Stats = {
  awaiting: number;
  next_lapse_ms: string | null;
  pickups_today: number;
  returns_today: number;
  overdue_returns: number;
  open_extensions: number;
  active_products: number;
};

type RecentBooking = {
  id: string;
  code: string;
  customer_name: string;
  pickup: string;
  pickup_time: string | null;
  return_day: string;
  status: BookingStatus;
  cancelled_by: CancelledBy;
  was_confirmed: boolean;
};

async function loadStats(): Promise<Stats> {
  // booked_range is a [pickup, return+1) daterange: the pickup day is lower(),
  // the inclusive return day is upper() - 1. "Today" is the shop's day, not the
  // database session's (which runs on GMT).
  const [row] = await sql<Stats>`
    select
      count(*) filter (where b.status = 'pending')::int                                              as awaiting,
      extract(epoch from min(b.expires_at) filter (where b.status = 'pending')) * 1000                as next_lapse_ms,
      count(*) filter (where b.status = 'confirmed' and lower(b.booked_range) = t.today)::int        as pickups_today,
      count(*) filter (where b.status = 'picked_up' and (upper(b.booked_range) - 1) = t.today)::int  as returns_today,
      count(*) filter (where b.status = 'picked_up' and (upper(b.booked_range) - 1) < t.today)::int  as overdue_returns,
      (select count(*)::int from extension_requests where status = 'pending')                         as open_extensions,
      (select count(*)::int from products where is_active)                                            as active_products
    from (select (now() at time zone 'Asia/Kolkata')::date as today) t
    left join bookings b on true
    group by t.today
  `;
  return row;
}

/**
 * The call list (specs/RETAIL_SPEC.md R2). The owner's process for a collection
 * is to ring about two hours before the appointment, and nobody answering means
 * the reservation is off. Nothing in the software does that on a timer — what
 * the software owes her is the list and the number.
 *
 * Confirmed bookings collecting today, from now until the end of the shop's
 * day. Rentals appear too: the call is about a person coming in at a time, and
 * which half of the shop the piece belongs to does not change that.
 */
async function loadDueSoon(): Promise<DueSoon[]> {
  return sql<DueSoon>`
    select b.id, b.code, b.customer_name, b.phone,
           to_char(b.pickup_time, 'HH24:MI') as pickup_time,
           bool_or(p.type = 'retail') as has_retail,
           bool_or(p.type <> 'retail') as has_rental
      from bookings b
      join booking_items bi on bi.booking_id = b.id
      join products p on p.id = bi.product_id
     where b.status = 'confirmed'
       and lower(b.booked_range) = (now() at time zone 'Asia/Kolkata')::date
     group by b.id
     order by b.pickup_time nulls last
     limit 12`;
}

async function loadRecent(): Promise<RecentBooking[]> {
  return sql<RecentBooking>`
    select
      id,
      code,
      customer_name,
      to_char(lower(booked_range), 'YYYY-MM-DD')       as pickup,
      to_char(pickup_time, 'HH24:MI')                  as pickup_time,
      to_char(upper(booked_range) - 1, 'YYYY-MM-DD')   as return_day,
      status,
      cancelled_by,
      verified_at is not null                          as was_confirmed
    from bookings
    order by created_at desc
    limit 5
  `;
}

type StatCard = {
  label: string;
  value: number;
  href: string;
  hint: string;
  accent?: boolean;
};

function StatCard({ label, value, href, hint, accent }: StatCard) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-card border bg-white p-5 shadow-card transition-colors ${
        accent ? "border-gold-500/60" : "border-ink-900/10 hover:border-violet-300"
      }`}
    >
      <span className="flex items-center gap-2 text-caption text-ink-600">
        {accent && <span className="inline-block h-2 w-2 rounded-full bg-gold-600" aria-hidden />}
        {label}
      </span>
      <span
        className={`tabular mt-3 font-display text-h2 leading-none ${
          accent && value > 0 ? "text-gold-600" : "text-ink-900"
        }`}
      >
        {value}
      </span>
      <span className="mt-2 text-caption text-ink-400">{hint}</span>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  // Lapse first, so the request count never includes one whose window has passed.
  // The sweep is lazy, so this fires wherever a reader happened to be. `after`
  // keeps it off the render's critical path (COMMS_FLOW_SPEC_V2 E4).
  const lapsed = await lapseExpired();
  if (lapsed.length) after(() => notifyLapsed(lapsed));
  const [stats, recent, dueSoon] = await Promise.all([loadStats(), loadRecent(), loadDueSoon()]);

  const cards: StatCard[] = [
    {
      label: "Requests to confirm",
      value: stats.awaiting,
      href: "/admin/bookings",
      hint: stats.awaiting > 0 ? `Call the customer · next ${lapsesLabel(stats.next_lapse_ms)}` : "No requests waiting",
      accent: stats.awaiting > 0,
    },
    {
      label: "Pickups today",
      value: stats.pickups_today,
      href: "/admin/bookings?tab=confirmed",
      hint: "Confirmed bookings collecting today",
    },
    {
      label: "Returns due today",
      value: stats.returns_today,
      href: "/admin/bookings?tab=picked_up",
      hint:
        stats.overdue_returns > 0
          ? `Plus ${stats.overdue_returns} overdue from earlier days`
          : "Garments due back today",
      accent: stats.overdue_returns > 0,
    },
    {
      label: "Extension requests",
      value: stats.open_extensions,
      href: "/admin/bookings?tab=extensions",
      hint: "Customers asking to keep a piece longer",
      accent: stats.open_extensions > 0,
    },
    {
      label: "Active products",
      value: stats.active_products,
      href: "/admin/products",
      hint: "Listed across rental & retail",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <p className="eyebrow">Vivaah</p>
        <h1 className="mt-1 font-display text-h2 text-ink-900">Dashboard</h1>
        <p className="mt-2 text-body text-ink-600">
          A calm view of what needs your attention today.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </section>

      <CallList items={dueSoon} />

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-h3 text-ink-900">Recent bookings</h2>
          <Link href="/admin/bookings" className="text-caption text-gold-600 hover:text-gold-500">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="mt-4 rounded-card border border-dashed border-ink-900/15 bg-white/60 p-10 text-center">
            <p className="font-display text-h3 text-ink-900">No bookings yet</p>
            <p className="mx-auto mt-2 max-w-sm text-body text-ink-600">
              When a customer reserves a garment, it will appear here — newest first.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-ink-900/10 overflow-hidden rounded-card border border-ink-900/10 bg-white shadow-card">
            {recent.map((b) => {
              const meta = STATUS_META[b.status];
              return (
                <li key={b.id}>
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-porcelain-50 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="tabular font-medium text-ink-900">{b.code}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-eyebrow font-medium uppercase tracking-wide ${meta.badge}`}
                        >
                          {statusLabel(b.status, b.cancelled_by, b.was_confirmed)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-caption text-ink-600">
                        {b.customer_name} · Pickup {formatDay(b.pickup)}
                        {b.pickup_time && `, ${formatTime(b.pickup_time)}`} · Return {formatDay(b.return_day)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
