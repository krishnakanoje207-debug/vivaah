import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { lapseExpired } from "@/lib/booking";
import { daysBetween, formatDay, formatTime } from "@/lib/bookingRules";
import { BookingActions, ExtensionDecision } from "../BookingActions";
import {
  STATUS_META,
  formatINR,
  lapsesLabel,
  statusLabel,
  telHref,
  waDigits,
  type BookingStatus,
  type CancelledBy,
} from "../format";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Timestamps are shown in the shop's time, whatever the database session's zone.
type Booking = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  email: string | null;
  status: BookingStatus;
  cancelled_by: CancelledBy;
  amount_due: string;
  pickup: string;
  ret: string;
  pickup_time: string | null;
  expires_ms: string | null;
  expires: string | null;
  customer_note: string | null;
  notes: string | null;
  verified: string | null;
  created: string;
  updated: string;
};

type Item = {
  id: string;
  name: string;
  price: string;
  images: { path: string; alt: string }[];
};

type Extension = {
  id: string;
  requested_return: string;
  charge_amount: string;
  status: "pending" | "approved" | "rejected";
  created: string;
  decided: string | null;
};

async function loadBooking(id: string): Promise<Booking | null> {
  const rows = await sql<Booking>`
    select
      b.id, b.code, b.customer_name, b.phone, b.email, b.status, b.cancelled_by, b.amount_due,
      to_char(lower(b.booked_range), 'YYYY-MM-DD')       as pickup,
      to_char(upper(b.booked_range) - 1, 'YYYY-MM-DD')   as ret,
      to_char(b.pickup_time, 'HH24:MI')                  as pickup_time,
      extract(epoch from b.expires_at) * 1000            as expires_ms,
      to_char(b.expires_at  at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH24:MI') as expires,
      b.customer_note, b.notes,
      to_char(b.verified_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH24:MI') as verified,
      to_char(b.created_at  at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH24:MI') as created,
      to_char(b.updated_at  at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH24:MI') as updated
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

async function loadExtensions(id: string): Promise<Extension[]> {
  return sql<Extension>`
    select e.id, e.charge_amount, e.status::text as status,
           to_char(e.requested_return, 'YYYY-MM-DD') as requested_return,
           to_char(e.created_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH24:MI') as created,
           to_char(e.decided_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH24:MI') as decided
    from extension_requests e
    where e.booking_id = ${id}
    order by e.created_at desc`;
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

const EXTENSION_BADGE: Record<Extension["status"], string> = {
  pending: "bg-gold-100 text-gold-700",
  approved: "bg-success/10 text-success",
  rejected: "bg-porcelain-200 text-ink-600",
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  // Lapse first, so a request whose window has passed reads as lapsed here.
  await lapseExpired();
  const booking = await loadBooking(id);
  if (!booking) notFound();
  const [items, extensions] = await Promise.all([loadItems(id), loadExtensions(id)]);

  const meta = STATUS_META[booking.status];
  const label = statusLabel(booking.status, booking.cancelled_by, booking.verified !== null);
  const pickupWhen = `${formatDay(booking.pickup)}${
    booking.pickup_time ? `, ${formatTime(booking.pickup_time)}` : ""
  }`;
  const wa = `https://wa.me/${waDigits(booking.phone)}?text=${encodeURIComponent(
    booking.status === "pending"
      ? `Namaste ${booking.customer_name}, this is Vivaah Dresses and Suits about your booking request ${booking.code} for pickup on ${pickupWhen}.`
      : `Namaste ${booking.customer_name}, regarding your Vivaah booking ${booking.code}.`,
  )}`;
  const listedTotal = items.reduce((sum, item) => sum + Number(item.price), 0);
  const extensionCharges = Number(booking.amount_due);
  // A lapse happens at expires_at, which the sweep leaves in place; the other
  // endings are the booking's last update.
  const endedAt = booking.cancelled_by === "lapsed" ? booking.expires : booking.updated;

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
          {label}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {/* Confirmation — the heart of a request. She confirms by talking to the
            customer, so the ways to reach her come first. */}
        {booking.status === "pending" && (
          <section className="rounded-card border border-gold-600/30 bg-gold-100/50 p-5 shadow-card">
            <h2 className="eyebrow mb-3">Confirm this booking</h2>
            <p className="text-body text-ink-900">
              Call or message {booking.customer_name} to agree the booking, then confirm it here.
            </p>
            <p className="tabular mt-1 text-caption text-ink-600">
              Pickup {pickupWhen} · Return {formatDay(booking.ret)} · {items.length}{" "}
              {items.length === 1 ? "piece" : "pieces"}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={telHref(booking.phone)}
                className="rounded-control border border-violet-800 px-4 py-2.5 text-center text-body text-violet-800 transition-colors hover:bg-violet-100"
              >
                Call
              </a>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-control border border-violet-800 px-4 py-2.5 text-center text-body text-violet-800 transition-colors hover:bg-violet-100"
              >
                WhatsApp
              </a>
            </div>
            <p className="tabular mt-2 text-center text-caption text-ink-600">{booking.phone}</p>
            <p className="mt-3 text-caption text-warning">
              Unconfirmed, it {lapsesLabel(booking.expires_ms)}
              {booking.expires && `, at ${booking.expires}`}
            </p>
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
          <Card title={label}>
            <p className="mb-3 text-caption text-ink-600">
              Reviving confirms this booking, but only if its dates are still free.
            </p>
            <BookingActions id={booking.id} status={booking.status} />
          </Card>
        )}

        {/* The customer's own words from the booking form. */}
        {booking.customer_note && (
          <Card title="Customer’s note">
            <p className="whitespace-pre-wrap text-body text-ink-900">{booking.customer_note}</p>
          </Card>
        )}

        {/* Customer */}
        <Card title="Customer">
          <p className="text-body text-ink-900">{booking.customer_name}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body">
            <a href={telHref(booking.phone)} className="text-violet-800 hover:text-violet-700">
              {booking.phone}
            </a>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="text-gold-600 hover:text-gold-500">
              WhatsApp
            </a>
            {booking.email && <span className="text-ink-600">{booking.email}</span>}
          </div>
        </Card>

        {/* Dates */}
        <Card title="Pickup and return">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body">
            <dt className="text-ink-400">Pickup</dt>
            <dd className="tabular text-ink-900">{pickupWhen}</dd>
            <dt className="text-ink-400">Return</dt>
            <dd className="tabular text-ink-900">{formatDay(booking.ret)}</dd>
          </dl>
        </Card>

        {/* Pieces, with listed prices for reference: nothing is paid online. */}
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
          <div className="mt-4 border-t border-ink-900/10 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-caption text-ink-600">Listed total, paid at the shop</span>
              <span className="tabular font-display text-h3 text-ink-900">{formatINR(listedTotal)}</span>
            </div>
            {extensionCharges > 0 && (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-caption text-ink-600">Approved extension charges to collect</span>
                <span className="tabular text-body text-ink-900">{formatINR(extensionCharges)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Extension requests, newest first. */}
        {extensions.length > 0 && (
          <Card title="Extension requests">
            <ul className="flex flex-col divide-y divide-ink-900/10">
              {extensions.map((ext) => (
                <li key={ext.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="tabular text-body text-ink-900">
                        Return on {formatDay(ext.requested_return)}
                      </p>
                      {ext.status === "pending" && ext.requested_return > booking.ret && (
                        <p className="tabular text-caption text-ink-600">
                          {daysBetween(booking.ret, ext.requested_return)} more{" "}
                          {daysBetween(booking.ret, ext.requested_return) === 1 ? "day" : "days"} than the
                          current return, {formatDay(booking.ret)}
                        </p>
                      )}
                      <p className="tabular text-caption text-ink-600">
                        Extra charge {formatINR(ext.charge_amount)}, collected at the shop · asked {ext.created}
                      </p>
                      {ext.decided && (
                        <p className="tabular text-caption text-ink-600">Decided {ext.decided}</p>
                      )}
                    </div>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-caption capitalize ${EXTENSION_BADGE[ext.status]}`}>
                      {ext.status}
                    </span>
                  </div>
                  {ext.status === "pending" && (
                    <div className="mt-3">
                      <ExtensionDecision id={booking.id} request={ext.id} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* The owner's own notes (only if present) */}
        {booking.notes && (
          <Card title="Notes">
            <p className="whitespace-pre-wrap text-body text-ink-600">{booking.notes}</p>
          </Card>
        )}

        {/* Timeline */}
        <Card title="Timeline">
          <dl className="grid grid-cols-2 gap-y-1 text-caption">
            <dt className="text-ink-400">Requested</dt>
            <dd className="tabular text-right text-ink-600">{booking.created}</dd>
            {booking.verified && (
              <>
                <dt className="text-ink-400">Confirmed</dt>
                <dd className="tabular text-right text-ink-600">{booking.verified}</dd>
              </>
            )}
            {booking.status === "cancelled" ? (
              <>
                <dt className="text-ink-400">{label}</dt>
                <dd className="tabular text-right text-ink-600">{endedAt ?? "—"}</dd>
              </>
            ) : (
              <>
                <dt className="text-ink-400">Last updated</dt>
                <dd className="tabular text-right text-ink-600">{booking.updated}</dd>
              </>
            )}
          </dl>
        </Card>
      </div>
    </div>
  );
}
