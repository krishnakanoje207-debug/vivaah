// The comms layer — SERVER CODE ONLY. specs/COMMS_FLOW_SPEC_V2.md §4.
//
// Callers raise an event and never name a channel:
//
//     after(() => notify("booking.created", id, { token }));
//
// That indirection is the whole point. WhatsApp and SMS are specified (v1.0 §2
// and §3) and dark, waiting on a SIM and on the owner's Android gateway; when
// they light up they are added here and `lib/booking.ts` does not change.
//
// Three rules this module keeps:
//   1. It never throws at its caller. A booking is the row in Postgres; the
//      message is a courtesy, and a courtesy must not be able to fail a booking.
//   2. A dark channel is `skipped`, not `failed`. Both are recorded.
//   3. Nothing paid is ever sent. Email is free; the one paid channel is the
//      WhatsApp template, and it is not wired.

import { sql } from "@/lib/db";
import { compose, type Extra, type Stored } from "@/lib/comms/messages";
import { readTemplates } from "@/lib/comms/templates";
import { ownerAddress, sendEmail } from "@/lib/comms/email";
import type { CommsBooking, Channel, EventKind, Recipient, SendResult } from "@/lib/comms/types";

export type { EventKind } from "@/lib/comms/types";

export type NotifyExtra = Extra;

/**
 * Tell whoever needs telling about `kind`, and record every attempt.
 * Returns what was logged, which is what the tests assert on.
 */
export async function notify(
  kind: EventKind,
  bookingId: string,
  extra: NotifyExtra = {}
): Promise<{ channel: Channel; recipient: Recipient; result: SendResult }[]> {
  const logged: { channel: Channel; recipient: Recipient; result: SendResult }[] = [];
  try {
    const booking = await load(bookingId);
    if (!booking) return logged;

    // The shop's own wording, if she has saved any. A failed read is not a
    // reason to stay silent: both messages go out in the built-in wording and
    // say so in the log (specs/COMMS_TEMPLATES_SPEC.md §5).
    let stored: Stored;
    try {
      stored = { overrides: await readTemplates() };
    } catch (e) {
      stored = { error: e instanceof Error ? e.message.slice(0, 120) : "unknown" };
    }
    const forCustomer = compose("customer", kind, booking, extra, stored);
    const forOwner = compose("owner", kind, booking, extra, stored);

    // Email is the only live channel. The ladder's other rungs are specified and
    // unbuilt; when one lands it is another entry in this list, walked in the
    // order of v1.0 §1 with the same skip-and-log contract.
    if (forOwner) {
      const r = await sendEmail("owner", ownerAddress(), forOwner.message.subject, forOwner.message.text);
      logged.push({ channel: "email", recipient: "owner", result: noted(r, forOwner.fallback) });
    }
    if (forCustomer) {
      const r = await sendEmail("customer", booking.email, forCustomer.message.subject, forCustomer.message.text);
      logged.push({ channel: "email", recipient: "customer", result: noted(r, forCustomer.fallback) });
    }

    for (const l of logged) await record(bookingId, kind, l.channel, l.recipient, l.result);
  } catch (e) {
    // Swallowed on purpose: see rule 1. Recorded so the silence is visible.
    try {
      await record(bookingId, kind, "email", "owner", {
        status: "failed",
        address: null,
        detail: e instanceof Error ? e.message.slice(0, 200) : "notify failed",
      });
    } catch {
      /* the database itself is unreachable; there is nowhere left to write */
    }
  }
  return logged;
}

/**
 * Tell everyone whose request just died of silence. `lapseExpired()` returns the
 * ids it lapsed and is called by every reader, so this runs wherever the sweep
 * happened to fire — always after the response, never in front of it.
 */
export async function notifyLapsed(ids: string[]): Promise<void> {
  for (const id of ids) await notify("booking.lapsed", id);
}

/**
 * The channel's own detail, plus the reason the shop's wording was not used
 * when it was not. The send still happened in the built-in wording; this is
 * what makes that findable in comms_log instead of silent.
 */
function noted(r: SendResult, fallback: string | null): SendResult {
  if (!fallback) return r;
  const note = `built-in wording used, ${fallback}`;
  return { ...r, detail: r.detail ? `${r.detail} | ${note}` : note };
}

async function record(
  bookingId: string,
  event: EventKind,
  channel: Channel,
  recipient: Recipient,
  r: SendResult
): Promise<void> {
  await sql`
    insert into comms_log (booking_id, event, channel, recipient, address, status, detail)
    values (${bookingId}, ${event}, ${channel}, ${recipient}, ${r.address}, ${r.status}, ${r.detail})`;
}

/** Everything the copy needs, in the two queries the status page already uses. */
async function load(bookingId: string): Promise<CommsBooking | null> {
  const rows = await sql<{
    id: string; code: string; customer_name: string; phone: string; email: string | null;
    pickup: string; ret: string; time: string | null; expires_at: string | null; created_at: string;
  }>`
    select id, code, customer_name, phone, email,
           to_char(lower(booked_range), 'YYYY-MM-DD') as pickup,
           to_char(upper(booked_range) - 1, 'YYYY-MM-DD') as ret,
           to_char(pickup_time, 'HH24:MI') as time,
           to_char(expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as expires_at,
           to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
      from bookings where id = ${bookingId}`;
  const r = rows[0];
  if (!r) return null;

  const items = await sql<CommsBooking["items"][number]>`
    select p.name, p.type, v.colour_name as colour, bi.size
      from booking_items bi
      join products p on p.id = bi.product_id
      left join product_variants v on v.id = bi.variant_id
     where bi.booking_id = ${r.id}
     order by (case p.type when 'rental' then 0 when 'retail' then 1 else 2 end), p.name`;

  return {
    id: r.id,
    code: r.code,
    name: r.customer_name,
    phone: r.phone,
    email: r.email,
    pickup: r.pickup,
    ret: r.ret,
    time: r.time,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    items,
  };
}
