import { SHOP } from "@/lib/site";

/**
 * Where a request goes when it cannot go to the booking page.
 *
 * Rental and jewellery pieces are reserved on `/reserve` since Phase 2
 * (BOOKING_ENGINE_SPEC_V2 §0, D5). What is left here is the WhatsApp hand-off
 * for everything the booking page does not take: retail pieces, which wait for
 * Phase 3, page-level asks that name no piece, and the quieter "Ask on
 * WhatsApp" beside a Reserve button, which is for questions (D6). The owner
 * answers these by hand.
 *
 * The number is checked before any wa.me link is built, so this DEGRADES rather
 * than shipping a dead link: while `SHOP.phone` is a placeholder every enquiry
 * points at /visit instead. A link that opens WhatsApp to nobody is worse than a
 * link to the directions.
 */

const PLACEHOLDER = /^\+?91[\s0]*$|0{5,}/;

export function hasRealPhone(): boolean {
  const digits = SHOP.phone.replace(/[^\d]/g, "");
  return digits.length >= 10 && !PLACEHOLDER.test(SHOP.phone);
}

/**
 * The owner's word for this is "reserve online, collect at the shop"
 * (15 Sep 2026: "everywhere"). A reserve message still says a piece is held once
 * she confirms it, because a WhatsApp message books nothing: unlike a request
 * made on /reserve, it holds no dates until she has answered it. `ask` is the
 * question form, which promises nothing and so says nothing about holding.
 */
export function enquiryHref(opts: {
  piece?: string;
  night?: string;
  ask?: boolean;
}): string {
  if (!hasRealPhone()) return "/visit";
  const lines = opts.ask
    ? [
        opts.piece
          ? `Hello, I have a question about ${opts.piece}.`
          : "Hello, I have a question.",
      ]
    : [
        opts.piece
          ? `Hello, I would like to reserve ${opts.piece}.`
          : "Hello, I would like to reserve a piece.",
        opts.night ? `For: ${opts.night}.` : null,
        "I understand it is held once you confirm.",
      ].filter(Boolean);
  const digits = SHOP.phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join(" "))}`;
}

/** Where a rental or jewellery piece, or several, are reserved (spec V2 D5). */
export function reserveHref(slugs: string[]): string {
  return `/reserve?items=${slugs.map(encodeURIComponent).join(",")}`;
}

/**
 * The sentence that travels with a Reserve button that goes to /reserve. A
 * request made there holds her dates at once, and lapses if the shop does not
 * confirm (D2); nothing is paid through the site (D1).
 */
export const REQUEST_NOTICE =
  "Reserve online, collect at the shop. Your dates are held while we call to confirm, and nothing is paid online.";

/**
 * The same promise for a request sent by WhatsApp, which holds nothing until the
 * shop has answered it, so it cannot say the dates are held.
 */
export const ENQUIRY_NOTICE =
  "Reserve online, collect at the shop. We message you to confirm, and nothing is paid online.";

/**
 * The retail pieces in a selection, as one WhatsApp message.
 *
 * Kept beside `enquiryHref` rather than folded into it because the two messages
 * are shaped differently: one names a garment, this one lists them. Only retail
 * pieces reach it; rentals and jewellery in the same tray go to /reserve.
 *
 * The pieces are listed by name only, with no prices and no total. The shop
 * knows its own prices, the visitor may have gathered a piece whose price is
 * not published, and a number in this message would read as an amount agreed
 * when nothing has been agreed at all.
 *
 * `items` is typed structurally so this module does not import from
 * lib/selection, which is a client module.
 */
export function selectionHref(items: { name: string }[]): string {
  if (!hasRealPhone() || items.length === 0) return "/visit";
  const lines = [
    items.length === 1
      ? "Hello, I would like to reserve this piece:"
      : `Hello, I would like to reserve these ${items.length} pieces:`,
    ...items.map((i) => `- ${i.name}`),
    "I understand they are held once you confirm.",
  ];
  const digits = SHOP.phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
}
