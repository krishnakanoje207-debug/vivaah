import { SHOP } from "@/lib/site";

/**
 * Where a request goes when it cannot go to the booking page.
 *
 * Every named piece is reserved on `/reserve` — rentals and jewellery since
 * Phase 2 (BOOKING_ENGINE_SPEC_V2 §0, D5), retail since Phase 3. What is left
 * here is the WhatsApp hand-off for what the booking page does not take:
 * page-level asks that name no piece, and the quieter "Ask on WhatsApp" beside
 * a Reserve button, which is for questions (D6). The owner answers these by
 * hand.
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

/**
 * Where a piece, or several, are reserved (spec V2 D5; retail since Phase 3).
 *
 * `pick` carries a retail page's chosen colour and size through to /reserve, so
 * a visitor who has already answered those two questions is not asked them
 * again. It only fits one piece, which is the only case that can have made the
 * choice: the tray gathers slugs and nothing else, so a basket assembled there
 * answers them on /reserve itself.
 */
export function reserveHref(
  slugs: string[],
  pick?: { variant: string; size: string },
): string {
  const items = `items=${slugs.map(encodeURIComponent).join(",")}`;
  if (!pick || slugs.length !== 1) return `/reserve?${items}`;
  return `/reserve?${items}&variant=${encodeURIComponent(pick.variant)}&size=${encodeURIComponent(pick.size)}`;
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
