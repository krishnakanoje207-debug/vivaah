import Link from "next/link";
import { sql } from "@/lib/db";
import {
  STATUS_META,
  formatINR,
  formatDateRange,
  type BookingStatus,
} from "./bookings/format";

export const dynamic = "force-dynamic";

type Stats = {
  pending_verify: number;
  awaiting_utr: number;
  pickups_today: number;
  returns_today: number;
  active_products: number;
};

type RecentBooking = {
  id: string;
  code: string;
  customer_name: string;
  pickup: string;
  return_day: string;
  status: BookingStatus;
  amount_due: string;
};

async function loadStats(): Promise<Stats> {
  // booked_range is a [pickup, return+1) daterange: the pickup day is lower(),
  // the inclusive return day is upper() - 1.
  const [row] = await sql<Stats>`
    select
      count(*) filter (where b.status = 'pending' and b.payment_ref is not null)                            as pending_verify,
      count(*) filter (where b.status = 'pending' and b.payment_ref is null)                                as awaiting_utr,
      count(*) filter (where b.status = 'confirmed' and lower(b.booked_range) = current_date)               as pickups_today,
      count(*) filter (where b.status = 'picked_up' and (upper(b.booked_range) - 1) = current_date)         as returns_today,
      (select count(*) from products where is_active)                                                        as active_products
    from bookings b
  `;
  return row;
}

async function loadRecent(): Promise<RecentBooking[]> {
  return sql<RecentBooking>`
    select
      id,
      code,
      customer_name,
      to_char(lower(booked_range), 'YYYY-MM-DD')       as pickup,
      to_char(upper(booked_range) - 1, 'YYYY-MM-DD')   as return_day,
      status,
      amount_due
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
  const [stats, recent] = await Promise.all([loadStats(), loadRecent()]);

  const cards: StatCard[] = [
    {
      label: "Payments to verify",
      value: stats.pending_verify,
      href: "/admin/bookings?tab=pending",
      hint: "UTR submitted, awaiting your check",
      accent: stats.pending_verify > 0,
    },
    {
      label: "Holds awaiting UTR",
      value: stats.awaiting_utr,
      href: "/admin/bookings?tab=pending",
      hint: "Reserved, payment not yet sent",
    },
    {
      label: "Pickups today",
      value: stats.pickups_today,
      href: "/admin/bookings?tab=confirmed",
      hint: "Confirmed bookings starting today",
    },
    {
      label: "Returns today",
      value: stats.returns_today,
      href: "/admin/bookings?tab=picked_up",
      hint: "Garments due back today",
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
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-caption text-ink-600">
                        {b.customer_name} · {formatDateRange(b.pickup, b.return_day)}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-body font-medium text-ink-900">
                      {formatINR(b.amount_due)}
                    </span>
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
