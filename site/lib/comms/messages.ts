// The copy for every notification, in one place.
//
// Register (specs/COMMS_FLOW_SPEC_V2.md §4.2): plain and warm, no heritage, no
// em dashes, addressed to a woman, and never a word about money moving through
// the website — a booking is a request the shop confirms, and nothing is paid
// here. Every customer message carries the status link and the shop's number,
// because the shop's real fallback when software fails is a phone call.

import { SHOP, SITE_URL } from "@/lib/site";
import { formatDay, formatTime } from "@/lib/bookingRules";
import type { CommsBooking, EventKind } from "@/lib/comms/types";

export type Message = { subject: string; text: string };

const line = (b: CommsBooking) =>
  b.items.map((i) => (i.size ? `${i.name} (${[i.colour, i.size].filter(Boolean).join(", ")})` : i.name)).join(", ");

const when = (b: CommsBooking) => {
  const day = formatDay(b.pickup);
  const time = b.time ? ` at ${formatTime(b.time)}` : "";
  // A collection has one day. A rental has a pickup and a return.
  return b.pickup === b.ret ? `${day}${time}` : `${day}${time} to ${formatDay(b.ret)}`;
};

const statusUrl = (b: CommsBooking, token?: string) =>
  `${SITE_URL}/booking/${b.code}${token ? `?t=${token}` : ""}`;

const signoff = (b: CommsBooking, token?: string) =>
  `Your booking page: ${statusUrl(b, token)}\nAny question at all, call us on ${SHOP.phone}.\n\n${SHOP.name}`;

/** What the customer is told. Null where the event is not hers to hear. */
export function customerMessage(
  kind: EventKind,
  b: CommsBooking,
  extra: { token?: string; reason?: string | null; newReturn?: string | null } = {}
): Message | null {
  const { token, reason, newReturn } = extra;
  const items = line(b);
  const hours = b.expiresAt ? Math.max(1, Math.round((Date.parse(b.expiresAt) - Date.parse(b.createdAt)) / 3600000)) : 24;

  switch (kind) {
    case "booking.created":
      return {
        subject: `We have your request, ${b.name} (${b.code})`,
        text:
          `Namaste ${b.name},\n\n` +
          `We have your request for ${items}, for ${when(b)}.\n\n` +
          `It is held for you while we check the pieces are ready. We will confirm it within ${hours} hours. ` +
          `If we have not answered by then the request releases itself, and you are welcome to ask again or simply call us.\n\n` +
          `Nothing is paid online. You settle everything at the shop when you collect.\n\n` +
          signoff(b, token),
      };
    case "booking.confirmed":
      return {
        subject: `Confirmed: ${items} for ${formatDay(b.pickup)} (${b.code})`,
        text:
          `Namaste ${b.name},\n\n` +
          `Your booking is confirmed. ${items}, for ${when(b)}.\n\n` +
          `Come to us at ${SHOP.address}. ${SHOP.mapsUrl}\n` +
          `We are open ${SHOP.hours}.\n\n` +
          signoff(b),
      };
    case "booking.declined":
      return {
        subject: `About your request ${b.code}`,
        text:
          `Namaste ${b.name},\n\n` +
          `We are sorry, we cannot hold ${items} for ${when(b)}.\n` +
          (reason ? `${reason}\n` : "") +
          `\nThere may well be something else that suits you, and we would rather show you than guess. ` +
          `Call us on ${SHOP.phone} and we will find it together.\n\n${SHOP.name}`,
      };
    case "booking.lapsed":
      return {
        subject: `Your request ${b.code} has released`,
        text:
          `Namaste ${b.name},\n\n` +
          `We did not manage to confirm your request for ${items} in time, so it has released itself and the dates are open again.\n\n` +
          `That is our fault rather than yours. Call us on ${SHOP.phone} and we will sort it out properly.\n\n${SHOP.name}`,
      };
    case "booking.cancelled_shop":
      return {
        subject: `Your booking ${b.code} has been cancelled`,
        text:
          `Namaste ${b.name},\n\n` +
          `We have had to cancel your booking for ${items}, for ${when(b)}.\n` +
          (reason ? `${reason}\n` : "") +
          `\nPlease call us on ${SHOP.phone} so we can make it right.\n\n${SHOP.name}`,
      };
    case "booking.cancelled_no_answer":
      return {
        subject: `We tried to reach you about ${b.code}`,
        text:
          `Namaste ${b.name},\n\n` +
          `We rang to confirm your collection of ${items} for ${when(b)} and could not reach you, so the booking has been released.\n\n` +
          `If the timing simply did not suit, call us on ${SHOP.phone} and we will book it again.\n\n${SHOP.name}`,
      };
    case "booking.cancelled_customer":
      return {
        subject: `Cancelled: ${b.code}`,
        text:
          `Namaste ${b.name},\n\n` +
          `Your booking for ${items} is cancelled and nothing is owed. ` +
          `We hope to dress you another time.\n\n${SHOP.name}`,
      };
    case "extension.requested":
      return {
        subject: `We have your request for more days (${b.code})`,
        text:
          `Namaste ${b.name},\n\n` +
          `We have your request to keep ${items} until ${newReturn ? formatDay(newReturn) : "the new date"}. ` +
          `We will let you know shortly whether the dates are free.\n\n` +
          signoff(b),
      };
    case "extension.approved":
      return {
        subject: `Keep them until ${formatDay(newReturn ?? b.ret)} (${b.code})`,
        text:
          `Namaste ${b.name},\n\n` +
          `That is fine. Your return day is now ${formatDay(newReturn ?? b.ret)}.\n\n` +
          signoff(b),
      };
    case "extension.rejected":
      return {
        subject: `About the extra days on ${b.code}`,
        text:
          `Namaste ${b.name},\n\n` +
          `We are sorry, ${items} is spoken for after your return day, so we cannot extend it this time. ` +
          `The return day stays ${formatDay(b.ret)}.\n\n` +
          signoff(b),
      };
    // E10 and E11 are sent by the Worker's daily cron at 09:00 IST (v1.0's hour),
    // never by the lazy sweep: see specs/COMMS_FLOW_SPEC_V2.md §2. Neither has the
    // raw token, which is only ever held at creation, so the link asks her for
    // the code and phone, the same as a confirmation.
    case "reminder.pickup":
      return {
        subject: `Today: ${items} (${b.code})`,
        text:
          `Namaste ${b.name},\n\n` +
          `A reminder that we will have ${items} ready for you today${b.time ? ` at ${formatTime(b.time)}` : ""}.\n\n` +
          (b.pickup === b.ret ? "" : `Your return day is ${formatDay(b.ret)}.\n\n`) +
          `Come to us at ${SHOP.address}. ${SHOP.mapsUrl}\n` +
          `We are open ${SHOP.hours}.\n\n` +
          signoff(b),
      };
    case "reminder.return": {
      // Only what goes back: outfits and jewellery are rented, a retail piece in
      // the same basket was bought.
      const rentals = b.items.filter((i) => i.type !== "retail");
      return {
        subject: `Your return day is today (${b.code})`,
        text:
          `Namaste ${b.name},\n\n` +
          `A gentle reminder that ${line({ ...b, items: rentals })} ${rentals.length === 1 ? "is" : "are"} due back with us today.\n\n` +
          `If you would like more days, ask from your booking page and we will tell you whether the dates are free.\n` +
          `We are open ${SHOP.hours}.\n\n` +
          signoff(b),
      };
    }
    default:
      return null;
  }
}

/** What the shop is told. Null where the event needs no owner alert. */
export function ownerMessage(
  kind: EventKind,
  b: CommsBooking,
  extra: { newReturn?: string | null } = {}
): Message | null {
  const { newReturn } = extra;
  const items = line(b);
  const admin = `${SITE_URL}/admin/bookings`;
  const contact = `${b.name}, ${b.phone}${b.email ? `, ${b.email}` : ""}`;

  switch (kind) {
    case "booking.created":
      return {
        subject: `New request: ${items} (${b.code})`,
        text:
          `${contact}\n${items}\n${when(b)}\n\n` +
          (b.expiresAt ? `Confirm it before ${formatDay(b.expiresAt.slice(0, 10))}, or it releases itself.\n\n` : "") +
          `Open the panel: ${admin}`,
      };
    case "booking.lapsed":
      return {
        subject: `Request ${b.code} lapsed unanswered`,
        text:
          `${contact}\n${items}\n${when(b)}\n\n` +
          `Nobody confirmed it in time, so it released itself and the dates are open again. ` +
          `She was told. If you still want the booking, ring her.\n\n${admin}`,
      };
    case "booking.cancelled_customer":
      return {
        subject: `Cancelled by the customer: ${b.code}`,
        text: `${contact}\n${items}\n${when(b)}\n\nThe dates are free again.\n\n${admin}`,
      };
    case "extension.requested":
      return {
        subject: `Extension asked for: ${b.code}`,
        text:
          `${contact}\n${items}\nReturn day now ${formatDay(b.ret)}, she is asking for ` +
          `${newReturn ? formatDay(newReturn) : "a later date"}.\n\nDecide it: ${admin}`,
      };
    default:
      return null;
  }
}
