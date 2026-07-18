import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { BookingActions } from "../BookingActions";
import {
  STATUS_META,
  formatINR,
  formatDateRange,
  expiresLabel,
  waDigits,
  type BookingStatus,
} from "../format";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Booking = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  email: string | null;
  status: BookingStatus;
  amount_due: string;
  payment_ref: string | null;
  pickup: string;
  ret: string;
  expires_ms: string | null;
  notes: string | null;
  payment_submitted: string | null;
  verified: string | null;
  created: string | null;
  updated: string | null;
};

type Item = {
  id: string;
  name: string;
  price: string;
  images: { path: string; alt: string }[];
};

async function loadBooking(id: string): Promise<Booking | null> {
  const rows = await sql<Booking>`
    select
      b.id, b.code, b.customer_name, b.phone, b.email, b.status, b.amount_due, b.payment_ref,
      to_char(lower(b.booked_range), 'YYYY-MM-DD')       as pickup,
      to_char(upper(b.booked_range) - 1, 'YYYY-MM-DD')   as ret,
      extract(epoch from b.expires_at) * 1000            as expires_ms,
      b.notes,
      to_char(b.payment_ref_submitted_at, 'DD Mon YYYY, HH24:MI') as payment_submitted,
      to_char(b.verified_at,               'DD Mon YYYY, HH24:MI') as verified,
      to_char(b.created_at,                'DD Mon YYYY, HH24:MI') as created,
      to_char(b.updated_at,                'DD Mon YYYY, HH24:MI') as updated
    from bookings b
    where b.id = ${id}`;
  return rows[0] ?? null;
}

async function loadItems(id: string): Promise<Item[]> {
  return sql<Item>`
    select bi.id, bi.price, p.name, p.images
    from booking_items bi join products p on p.id = bi.product_id
    where bi.booking_id = ${id}
    order by p.name`;
}

function Thumb({ item }: { item: Item }) {
  const img = item.images?.[0];
  if (!img?.path) {
    return (
      <div className="flex size-16 shrink-0 items-center justify-center rounded-control bg-stage text-caption text-ink-400">
        No photo
      </div>
    );
  }
  // Plain <img>: these are static public/ assets; no next/image config needed.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={img.path}
      alt={img.alt || item.name}
      className="size-16 shrink-0 rounded-control object-cover"
    />
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-ink-900/10 bg-white p-5 shadow-card">
      <h2 className="eyebrow mb-3">{title}</h2>
      {children}
    </section>
  );
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const booking = await loadBooking(id);
  if (!booking) notFound();
  const items = await loadItems(id);

  const meta = STATUS_META[booking.status];
  const wa = `https://wa.me/${waDigits(booking.phone)}?text=${encodeURIComponent(
    `Namaste ${booking.customer_name}, regarding your Vivaah booking ${booking.code}.`,
  )}`;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <Link href="/admin/bookings" className="text-caption text-gold-600 hover:text-gold-500">
        ← All bookings
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-h2 text-ink-900">{booking.customer_name}</h1>
          <p className="tabular mt-0.5 text-caption text-ink-400">{booking.code}</p>
        </div>
        <span className={`inline-block rounded-full px-3 py-1 text-caption ${meta.badge}`}>
          {meta.label}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {/* Payment verification — the heart of a pending booking. */}
        {booking.status === "pending" && (
          <section className="rounded-card border border-gold-600/30 bg-gold-100/50 p-5 shadow-card">
            <h2 className="eyebrow mb-3">Payment</h2>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-caption text-ink-600">Amount due</p>
                <p className="tabular font-display text-h2 text-ink-900">
                  {formatINR(booking.amount_due)}
                </p>
              </div>
              <div className="text-right">
                {booking.payment_ref ? (
                  <>
                    <p className="text-caption text-ink-600">UTR submitted</p>
                    <p className="tabular text-body text-ink-900">{booking.payment_ref}</p>
                    {booking.payment_submitted && (
                      <p className="text-caption text-ink-400">{booking.payment_submitted}</p>
                    )}
                  </>
                ) : (
                  <p className="text-caption text-warning">Awaiting UTR from customer</p>
                )}
              </div>
            </div>
            <p className="mt-3 text-caption text-ink-400">{expiresLabel(booking.expires_ms)}</p>
            <div className="mt-4 border-t border-gold-600/20 pt-4">
              <BookingActions id={booking.id} status={booking.status} />
            </div>
          </section>
        )}

        {/* Forward actions for confirmed / picked_up. */}
        {(booking.status === "confirmed" || booking.status === "picked_up") && (
          <Card title="Next step">
            <BookingActions id={booking.id} status={booking.status} />
          </Card>
        )}

        {/* Cancelled bookings can be revived (DB re-checks the dates are free). */}
        {booking.status === "cancelled" && (
          <Card title="Cancelled">
            <p className="mb-3 text-caption text-ink-600">
              Reviving restores this booking to confirmed — only if its dates are still free.
            </p>
            <BookingActions id={booking.id} status={booking.status} />
          </Card>
        )}

        {/* Customer */}
        <Card title="Customer">
          <p className="text-body text-ink-900">{booking.customer_name}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body">
            <a href={`tel:${waDigits(booking.phone)}`} className="text-violet-800 hover:text-violet-700">
              {booking.phone}
            </a>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="text-gold-600 hover:text-gold-500">
              WhatsApp
            </a>
            {booking.email && <span className="text-ink-600">{booking.email}</span>}
          </div>
        </Card>

        {/* Dates */}
        <Card title="Rental dates">
          <p className="tabular text-body text-ink-900">
            {formatDateRange(booking.pickup, booking.ret)}
          </p>
        </Card>

        {/* Items */}
        <Card title="Outfit & jewellery">
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <Thumb item={item} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body text-ink-900">{item.name}</p>
                </div>
                <span className="tabular text-body text-ink-600">{formatINR(item.price)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-ink-900/10 pt-3">
            <span className="text-caption text-ink-600">Total</span>
            <span className="tabular font-display text-h3 text-ink-900">
              {formatINR(booking.amount_due)}
            </span>
          </div>
        </Card>

        {/* Notes (only if present) */}
        {booking.notes && (
          <Card title="Notes">
            <p className="whitespace-pre-wrap text-body text-ink-600">{booking.notes}</p>
          </Card>
        )}

        {/* Timeline */}
        <Card title="Timeline">
          <dl className="grid grid-cols-2 gap-y-1 text-caption">
            <dt className="text-ink-400">Created</dt>
            <dd className="tabular text-right text-ink-600">{booking.created ?? "—"}</dd>
            {booking.payment_submitted && (
              <>
                <dt className="text-ink-400">UTR submitted</dt>
                <dd className="tabular text-right text-ink-600">{booking.payment_submitted}</dd>
              </>
            )}
            {booking.verified && (
              <>
                <dt className="text-ink-400">Verified</dt>
                <dd className="tabular text-right text-ink-600">{booking.verified}</dd>
              </>
            )}
            <dt className="text-ink-400">Last updated</dt>
            <dd className="tabular text-right text-ink-600">{booking.updated ?? "—"}</dd>
          </dl>
        </Card>
      </div>
    </div>
  );
}
