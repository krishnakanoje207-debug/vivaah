// The copy for every notification, and the rules for changing it.
//
// Register (specs/COMMS_FLOW_SPEC_V2.md §4.2): plain and warm, no heritage, no
// em dashes, addressed to a woman, and never a word about money moving through
// the website — a booking is a request the shop confirms, and nothing is paid
// here. Every customer message carries the shop's number, because the shop's
// real fallback when software fails is a phone call.
//
// The copy below is the BUILT-IN wording, written in the same placeholder
// language the owner edits in (/admin/messages), so there is one renderer and
// one set of rules for both. What she saves is an override stored in the
// `settings` table (lib/comms/templates.ts); no override means this wording.
// specs/COMMS_TEMPLATES_SPEC.md is the full account.
//
// PURE, no database: the admin editor imports this to preview as she types.

import { SHOP, SITE_URL } from "@/lib/site";
import { formatDay, formatTime } from "@/lib/bookingRules";
import type { CommsBooking, EventKind, Recipient } from "@/lib/comms/types";

export type Message = { subject: string; text: string };
/** The same shape as a message, with `{placeholders}` where the booking goes. */
export type Template = Message;

export type Extra = {
  /** Only available at creation: the raw status token, so her first mail deep-links. */
  token?: string;
  /** The shop's reason for a decline or a cancellation, shown to her as written. */
  reason?: string | null;
  /** The return day an extension asks for or was granted. */
  newReturn?: string | null;
};

/**
 * Every placeholder any message can use, and what it says. Derived from exactly
 * what the copy interpolated when it was fixed in code (3f3baed), nothing more.
 */
export const PLACEHOLDERS = {
  name: "Her name.",
  code: "The booking code, like VVH-7K2M.",
  items: "Every piece in the booking, with the colour and size where she chose them.",
  when: "The pickup day and time, and for a rental the return day. A one-day collection is just the day.",
  pickup_day: "The pickup day on its own.",
  return_day: "The return day on its own.",
  today: "“today”, or “today at 11:30 am” when she chose a pickup time.",
  hours: "How many hours the shop has to confirm, from Settings.",
  status_link:
    "Her booking page. From the first message it opens straight away; from the others she enters her code and phone number.",
  reason: "The shop's reason, when one is given.",
  new_return_day: "The return day she asked for.",
  return_items: "Only what comes back: rented outfits and jewellery, not anything she bought.",
  is_are: "“is” for one piece and “are” for more, to go with {return_items}.",
  confirm_by: "The day the request lapses if nobody confirms it.",
  contact: "Her name, phone number, and email if she gave one.",
  admin_link: "The bookings page in this panel.",
  shop_name: "The shop's name.",
  shop_phone: "The shop's phone number.",
  shop_address: "The shop's address.",
  shop_maps: "The Google Maps link to the shop.",
  shop_hours: "The shop's opening hours.",
} as const;
export type Placeholder = keyof typeof PLACEHOLDERS;

// What any message to her can say about the booking, and what any message to
// the shop can. A message also gets the few its own event supplies (`extra`).
const HER: readonly Placeholder[] = [
  "name", "code", "items", "when", "pickup_day", "return_day", "status_link",
  "shop_name", "shop_phone", "shop_address", "shop_maps", "shop_hours",
];
const SHOP_SIDE: readonly Placeholder[] = [
  "name", "code", "items", "when", "pickup_day", "return_day", "contact", "admin_link",
];

export type Slot = {
  /** `${who}:${kind}`, the key the shop's override is stored under. */
  id: string;
  who: Recipient;
  kind: EventKind;
  title: string;
  /** When it goes, in the panel's words. */
  sent: string;
  builtIn: Template;
  uses: readonly Placeholder[];
  /**
   * The placeholders that can be empty in this message, and when. A line that
   * uses an empty one is left out (see `render`).
   */
  optional: Partial<Record<Placeholder, string>>;
  /** What the shop's own wording has to keep. Derived below, not listed by hand. */
  required: readonly Placeholder[];
};

const SIGNOFF = "Your booking page: {status_link}\nAny question at all, call us on {shop_phone}.\n\n{shop_name}";
const REASON_EMPTY = "Empty when no reason is given. The panel does not ask for one yet, so for now it always is.";

type Draft = Omit<Slot, "id" | "required" | "uses" | "optional"> & {
  extra?: readonly Placeholder[];
  optional?: Slot["optional"];
};

const DRAFTS: Draft[] = [
  {
    who: "customer",
    kind: "booking.created",
    title: "Request received",
    sent: "When she sends a request.",
    extra: ["hours"],
    builtIn: {
      subject: "We have your request, {name} ({code})",
      text:
        "Namaste {name},\n\n" +
        "We have your request for {items}, for {when}.\n\n" +
        "It is held for you while we check the pieces are ready. We will confirm it within {hours} hours. " +
        "If we have not answered by then the request releases itself, and you are welcome to ask again or simply call us.\n\n" +
        "Nothing is paid online. You settle everything at the shop when you collect.\n\n" +
        SIGNOFF,
    },
  },
  {
    who: "customer",
    kind: "booking.confirmed",
    title: "Booking confirmed",
    sent: "When you confirm her request.",
    builtIn: {
      subject: "Confirmed: {items} for {pickup_day} ({code})",
      text:
        "Namaste {name},\n\n" +
        "Your booking is confirmed. {items}, for {when}.\n\n" +
        "Come to us at {shop_address}. {shop_maps}\n" +
        "We are open {shop_hours}.\n\n" +
        SIGNOFF,
    },
  },
  {
    who: "customer",
    kind: "booking.declined",
    title: "Request declined",
    sent: "When you decline her request.",
    extra: ["reason"],
    optional: { reason: REASON_EMPTY },
    builtIn: {
      subject: "About your request {code}",
      text:
        "Namaste {name},\n\n" +
        "We are sorry, we cannot hold {items} for {when}.\n" +
        "{reason}\n\n" +
        "There may well be something else that suits you, and we would rather show you than guess. " +
        "Call us on {shop_phone} and we will find it together.\n\n{shop_name}",
    },
  },
  {
    who: "customer",
    kind: "booking.lapsed",
    title: "Request lapsed",
    sent: "When nobody confirms her request in time and it releases itself.",
    builtIn: {
      subject: "Your request {code} has released",
      text:
        "Namaste {name},\n\n" +
        "We did not manage to confirm your request for {items} in time, so it has released itself and the dates are open again.\n\n" +
        "That is our fault rather than yours. Call us on {shop_phone} and we will sort it out properly.\n\n{shop_name}",
    },
  },
  {
    who: "customer",
    kind: "booking.cancelled_shop",
    title: "Cancelled by the shop",
    sent: "When you cancel a confirmed booking.",
    extra: ["reason"],
    optional: { reason: REASON_EMPTY },
    builtIn: {
      subject: "Your booking {code} has been cancelled",
      text:
        "Namaste {name},\n\n" +
        "We have had to cancel your booking for {items}, for {when}.\n" +
        "{reason}\n\n" +
        "Please call us on {shop_phone} so we can make it right.\n\n{shop_name}",
    },
  },
  {
    who: "customer",
    kind: "booking.cancelled_no_answer",
    title: "Cancelled, no answer",
    sent: "When you cancel because she did not answer the call.",
    builtIn: {
      subject: "We tried to reach you about {code}",
      text:
        "Namaste {name},\n\n" +
        "We rang to confirm your collection of {items} for {when} and could not reach you, so the booking has been released.\n\n" +
        "If the timing simply did not suit, call us on {shop_phone} and we will book it again.\n\n{shop_name}",
    },
  },
  {
    // The one built-in that did not carry the shop's number before templates,
    // against this file's own rule. Every customer message must keep it now, so
    // the built-in wording had to as well: a default the editor would refuse is
    // not a default.
    who: "customer",
    kind: "booking.cancelled_customer",
    title: "Cancelled by her",
    sent: "When she cancels from her booking page.",
    builtIn: {
      subject: "Cancelled: {code}",
      text:
        "Namaste {name},\n\n" +
        "Your booking for {items} is cancelled and nothing is owed. " +
        "We hope to dress you another time.\n\n" +
        "If you change your mind, call us on {shop_phone} and we will see what we can do.\n\n{shop_name}",
    },
  },
  {
    who: "customer",
    kind: "extension.requested",
    title: "More days asked for",
    sent: "When she asks to keep a rental longer.",
    extra: ["new_return_day"],
    builtIn: {
      subject: "We have your request for more days ({code})",
      text:
        "Namaste {name},\n\n" +
        "We have your request to keep {items} until {new_return_day}. " +
        "We will let you know shortly whether the dates are free.\n\n" +
        SIGNOFF,
    },
  },
  {
    who: "customer",
    kind: "extension.approved",
    title: "More days agreed",
    sent: "When you approve the extra days.",
    extra: ["new_return_day"],
    builtIn: {
      subject: "Keep them until {new_return_day} ({code})",
      text: "Namaste {name},\n\n" + "That is fine. Your return day is now {new_return_day}.\n\n" + SIGNOFF,
    },
  },
  {
    who: "customer",
    kind: "extension.rejected",
    title: "More days turned down",
    sent: "When you turn the extra days down.",
    builtIn: {
      subject: "About the extra days on {code}",
      text:
        "Namaste {name},\n\n" +
        "We are sorry, {items} is spoken for after your return day, so we cannot extend it this time. " +
        "The return day stays {return_day}.\n\n" +
        SIGNOFF,
    },
  },
  // E10 and E11 are sent by the Worker's daily cron at 09:00 IST (v1.0's hour),
  // never by the lazy sweep: see specs/COMMS_FLOW_SPEC_V2.md §2. Neither has the
  // raw token, which is only ever held at creation, so the link asks her for
  // the code and phone, the same as a confirmation.
  {
    who: "customer",
    kind: "reminder.pickup",
    title: "Pickup day reminder",
    sent: "On the morning of the day she collects.",
    extra: ["today"],
    optional: { return_day: "Empty when she collects and brings it back on the same day." },
    builtIn: {
      subject: "Today: {items} ({code})",
      text:
        "Namaste {name},\n\n" +
        "A reminder that we will have {items} ready for you {today}.\n\n" +
        "Your return day is {return_day}.\n\n" +
        "Come to us at {shop_address}. {shop_maps}\n" +
        "We are open {shop_hours}.\n\n" +
        SIGNOFF,
    },
  },
  {
    who: "customer",
    kind: "reminder.return",
    title: "Return day reminder",
    sent: "On the morning a rental is due back.",
    extra: ["return_items", "is_are"],
    builtIn: {
      subject: "Your return day is today ({code})",
      text:
        "Namaste {name},\n\n" +
        "A gentle reminder that {return_items} {is_are} due back with us today.\n\n" +
        "If you would like more days, ask from your booking page and we will tell you whether the dates are free.\n" +
        "We are open {shop_hours}.\n\n" +
        SIGNOFF,
    },
  },
  {
    who: "owner",
    kind: "booking.created",
    title: "New request",
    sent: "When a request comes in. It lapses unless you confirm it in time.",
    extra: ["confirm_by"],
    optional: { confirm_by: "Empty only if the request has no deadline." },
    builtIn: {
      subject: "New request: {items} ({code})",
      text:
        "{contact}\n{items}\n{when}\n\n" +
        "Confirm it before {confirm_by}, or it releases itself.\n\n" +
        "Open the panel: {admin_link}",
    },
  },
  {
    who: "owner",
    kind: "booking.lapsed",
    title: "Request lapsed",
    sent: "When a request releases itself because nobody confirmed it.",
    builtIn: {
      subject: "Request {code} lapsed unanswered",
      text:
        "{contact}\n{items}\n{when}\n\n" +
        "Nobody confirmed it in time, so it released itself and the dates are open again. " +
        "She was told. If you still want the booking, ring her.\n\n{admin_link}",
    },
  },
  {
    who: "owner",
    kind: "booking.cancelled_customer",
    title: "Cancelled by the customer",
    sent: "When she cancels from her booking page.",
    builtIn: {
      subject: "Cancelled by the customer: {code}",
      text: "{contact}\n{items}\n{when}\n\nThe dates are free again.\n\n{admin_link}",
    },
  },
  {
    who: "owner",
    kind: "extension.requested",
    title: "Extension to decide",
    sent: "When she asks to keep a rental longer.",
    extra: ["new_return_day"],
    builtIn: {
      subject: "Extension asked for: {code}",
      text:
        "{contact}\n{items}\nReturn day now {return_day}, she is asking for {new_return_day}.\n\n" +
        "Decide it: {admin_link}",
    },
  },
];

/**
 * What the shop's own wording has to keep, read off the built-in wording rather
 * than listed by hand: the shop's number in every message to her (the fallback
 * when software fails is a call), her booking link wherever the built-in
 * wording gives her one, and the panel link in every message to the shop.
 */
function requiredFor(who: Recipient, builtIn: Template): Placeholder[] {
  if (who === "owner") return ["admin_link"];
  return builtIn.text.includes("{status_link}") ? ["shop_phone", "status_link"] : ["shop_phone"];
}

export const SLOTS: readonly Slot[] = DRAFTS.map(({ extra = [], optional = {}, ...d }) => ({
  ...d,
  id: `${d.who}:${d.kind}`,
  uses: [...(d.who === "owner" ? SHOP_SIDE : HER), ...extra],
  optional,
  required: requiredFor(d.who, d.builtIn),
}));

export const slotFor = (who: Recipient, kind: EventKind) => SLOTS.find((s) => s.who === who && s.kind === kind);

// ---------------------------------------------------------------------------
// values

const line = (items: CommsBooking["items"]) =>
  items.map((i) => (i.size ? `${i.name} (${[i.colour, i.size].filter(Boolean).join(", ")})` : i.name)).join(", ");

const at = (b: CommsBooking) => (b.time ? ` at ${formatTime(b.time)}` : "");

/**
 * Where the shop is and when it is open, as the owner set them in Settings.
 * `notify` passes `getShop()`; the defaults are the built-in values, which is
 * what the byte-for-byte gate compares against.
 */
export type Place = { address: string; mapsUrl: string; hours: string };
const BUILT_IN_PLACE: Place = { address: SHOP.address, mapsUrl: SHOP.mapsUrl, hours: SHOP.hours };

/** Everything a placeholder can say about this booking, for this message. */
export function fill(
  who: Recipient,
  kind: EventKind,
  b: CommsBooking,
  extra: Extra = {},
  place: Place = BUILT_IN_PLACE
): Record<Placeholder, string> {
  const { token, reason, newReturn } = extra;
  // Only what goes back: outfits and jewellery are rented, a retail piece in the
  // same basket was bought.
  const back = b.items.filter((i) => i.type !== "retail");
  // The raw token is a key to her booking, so it goes in the first message only,
  // the one that is ever handed it. `k` is what /booking/[code] reads; the copy
  // said `t` until templates, so the one link meant to open her booking straight
  // away landed on the lookup form instead.
  const key = kind === "booking.created" && token ? `?k=${token}` : "";
  return {
    name: b.name,
    code: b.code,
    items: line(b.items),
    // A collection has one day. A rental has a pickup and a return.
    when: `${formatDay(b.pickup)}${at(b)}${b.pickup === b.ret ? "" : ` to ${formatDay(b.ret)}`}`,
    pickup_day: formatDay(b.pickup),
    // The pickup reminder has nothing to say about a return on the same day.
    return_day: kind === "reminder.pickup" && b.pickup === b.ret ? "" : formatDay(b.ret),
    today: `today${at(b)}`,
    hours: String(
      b.expiresAt ? Math.max(1, Math.round((Date.parse(b.expiresAt) - Date.parse(b.createdAt)) / 3600000)) : 24
    ),
    status_link: `${SITE_URL}/booking/${b.code}${key}`,
    reason: reason ?? "",
    // The approval is read off the booking, which already carries the new day.
    // The other two fallbacks are the old copy's, for a call that does not come:
    // the extension route always passes the day she asked for.
    new_return_day: newReturn
      ? formatDay(newReturn)
      : kind === "extension.approved"
        ? formatDay(b.ret)
        : who === "owner"
          ? "a later date"
          : "the new date",
    return_items: line(back),
    is_are: back.length === 1 ? "is" : "are",
    confirm_by: b.expiresAt ? formatDay(b.expiresAt.slice(0, 10)) : "",
    contact: `${b.name}, ${b.phone}${b.email ? `, ${b.email}` : ""}`,
    admin_link: `${SITE_URL}/admin/bookings`,
    shop_name: SHOP.name,
    shop_phone: SHOP.phone,
    shop_address: place.address,
    shop_maps: place.mapsUrl,
    shop_hours: place.hours,
  };
}

// ---------------------------------------------------------------------------
// rendering

const TOKEN = /\{([a-z_]+)\}/g;
const namesIn = (s: string) => [...s.matchAll(TOKEN)].map((m) => m[1]);

/**
 * Put the booking into a template. The whole language is two rules:
 *
 *   1. `{name}` is replaced by what it says. Nothing else is special: no
 *      conditions, no loops.
 *   2. A line that uses a placeholder with nothing in it is left out, and no
 *      more than one blank line is kept between paragraphs.
 *
 * Rule 2 is how the old copy's conditional text survives the move out of code:
 * "{reason}" on its own line is there when the shop gave one and gone when it
 * did not, exactly as `reason ? ... : ""` behaved.
 *
 * Substitution is one pass, so a value that happens to contain braces (her name,
 * a reason) is printed as written and never read as a placeholder.
 */
export function render(t: Template, values: Record<string, string>): Message {
  const put = (s: string) => s.replace(TOKEN, (whole, k: string) => values[k] ?? whole);
  const kept = t.text
    .split("\n")
    .filter((l) => !namesIn(l).some((k) => values[k] === ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { subject: put(t.subject.trim()), text: put(kept) };
}

/** What she is told in the built-in wording. Null where the event is not hers to hear. */
export function customerMessage(kind: EventKind, b: CommsBooking, extra: Extra = {}): Message | null {
  const slot = slotFor("customer", kind);
  return slot ? render(slot.builtIn, fill("customer", kind, b, extra)) : null;
}

/** What the shop is told in the built-in wording. Null where the event needs no owner alert. */
export function ownerMessage(kind: EventKind, b: CommsBooking, extra: Extra = {}): Message | null {
  const slot = slotFor("owner", kind);
  return slot ? render(slot.builtIn, fill("owner", kind, b, extra)) : null;
}

// ---------------------------------------------------------------------------
// validation: the same function refuses a save and refuses a send

export const SUBJECT_MAX = 200;
export const TEXT_MAX = 5000;

const list = (names: string[]) => {
  const b = names.map((n) => `{${n}}`);
  return b.length === 1 ? b[0] : `${b.slice(0, -1).join(", ")} and ${b[b.length - 1]}`;
};

const WHY_REQUIRED: Partial<Record<Placeholder, string>> = {
  shop_phone: "so she always has a number to call",
  status_link: "so she can open her booking",
  admin_link: "so you can open the booking from it",
};

/** Problems either field can have: unknown placeholders, stray braces, long dashes. */
function shapeProblem(s: string, slot: Slot): string | null {
  const braced = [...s.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
  const unknown = [...new Set(braced.filter((n) => !(slot.uses as readonly string[]).includes(n)))];
  if (unknown.length) {
    return `${list(unknown)} ${unknown.length === 1 ? "is not a placeholder" : "are not placeholders"} this message can use.`;
  }
  if (/[{}]/.test(s.replace(/\{[^{}]*\}/g, ""))) return "There is a { or } that is not part of a placeholder.";
  if (s.includes("—")) return "The shop's messages do not use long dashes. Use a comma or a full stop instead.";
  return null;
}

/**
 * Why this wording cannot go out, by field, or an empty object when it can.
 * Run when she saves, and again on every send, so wording that reached the
 * table by any other route, or that a later rule would refuse, never goes out.
 */
export function validate(t: Template, slot: Slot): { subject?: string; text?: string } {
  const errors: { subject?: string; text?: string } = {};
  const optional = Object.keys(slot.optional);

  const subject = t.subject.trim();
  if (subject === "") errors.subject = "The subject cannot be empty.";
  else if (/[\r\n]/.test(subject)) errors.subject = "The subject has to be one line.";
  else if (subject.length > SUBJECT_MAX) errors.subject = `Keep the subject under ${SUBJECT_MAX} characters.`;
  else {
    const empties = namesIn(subject).filter((n) => optional.includes(n));
    const shape = shapeProblem(subject, slot);
    if (shape) errors.subject = shape;
    else if (empties.length) errors.subject = `${list(empties)} can be empty, so it cannot go in the subject.`;
  }

  const text = t.text.trim();
  if (text === "") errors.text = "The message cannot be empty.";
  else if (text.length > TEXT_MAX) errors.text = `Keep the message under ${TEXT_MAX} characters.`;
  else {
    const shape = shapeProblem(text, slot);
    const used = namesIn(text);
    const missing = slot.required.find((n) => !used.includes(n));
    if (shape) errors.text = shape;
    else if (missing) errors.text = `The message has to keep {${missing}}, ${WHY_REQUIRED[missing]}.`;
    else {
      // A required placeholder on a line that can vanish would vanish with it.
      for (const l of text.split("\n")) {
        const names = namesIn(l);
        const need = slot.required.find((n) => names.includes(n));
        const empty = names.find((n) => optional.includes(n));
        if (need && empty) {
          errors.text =
            `{${need}} shares a line with {${empty}}, which can be empty and would take the line with it. ` +
            `Give {${empty}} a line of its own.`;
          break;
        }
      }
    }
  }
  return errors;
}

export const isTemplate = (v: unknown): v is Template =>
  !!v && typeof v === "object" && typeof (v as Template).subject === "string" && typeof (v as Template).text === "string";

/** Why a stored override will not be used, or null if it will. */
export function overrideProblem(stored: unknown, slot: Slot): string | null {
  if (!isTemplate(stored)) return "The saved wording could not be read.";
  const e = validate(stored, slot);
  return e.subject ?? e.text ?? null;
}

/** The overrides as read, or why they could not be. */
export type Stored = { overrides: Record<string, unknown> } | { error: string };

/**
 * What `who` is told about `kind`: the shop's wording when she has saved some
 * that passes, the built-in wording otherwise. Null where the event is not
 * theirs to hear.
 *
 * A broken override must never silence a notification, so every failure here
 * falls back to the built-in wording for this one message and says why in
 * `fallback`, which `notify` writes into comms_log so the degradation can be
 * found rather than discovered.
 */
export function compose(
  who: Recipient,
  kind: EventKind,
  b: CommsBooking,
  extra: Extra,
  stored: Stored,
  place?: Place
): { message: Message; fallback: string | null } | null {
  const slot = slotFor(who, kind);
  if (!slot) return null;
  const values = fill(who, kind, b, extra, place);
  const builtIn = (why: string | null) => ({ message: render(slot.builtIn, values), fallback: why });

  if ("error" in stored) return builtIn(`template read failed (${stored.error})`);
  const own = stored.overrides[slot.id];
  if (own === undefined) return builtIn(null);
  const problem = overrideProblem(own, slot);
  if (problem) return builtIn(`saved wording refused: ${problem}`);
  try {
    return { message: render(own as Template, values), fallback: null };
  } catch (e) {
    return builtIn(`saved wording failed to render: ${e instanceof Error ? e.message.slice(0, 120) : "unknown"}`);
  }
}
