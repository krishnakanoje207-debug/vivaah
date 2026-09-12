import { SHOP } from "@/lib/site";

/**
 * Where a "hold this for me" button goes.
 *
 * The booking engine is Phase 2 and unbuilt, so nothing on the site can take a
 * reservation. What it can do is compose the message the shop already works
 * from and hand it to WhatsApp — the owner confirms by hand, exactly as she
 * already verifies UPI payments.
 *
 * The number is still the placeholder in lib/site (`+91 00000 00000`), so this
 * DEGRADES rather than shipping a dead wa.me link: until a real number is set,
 * every enquiry button points at /visit instead. A link that opens WhatsApp to
 * nobody is worse than a link to the directions.
 */

const PLACEHOLDER = /^\+?91[\s0]*$|0{5,}/;

export function hasRealPhone(): boolean {
  const digits = SHOP.phone.replace(/[^\d]/g, "");
  return digits.length >= 10 && !PLACEHOLDER.test(SHOP.phone);
}

/**
 * Always states that this is a request rather than a reservation, because the
 * owner's rule is that nothing is held until she confirms it (12 Sep 2026), and
 * the customer should read that in the message she is sending, not only on the
 * page she sent it from.
 */
export function enquiryHref(opts: { piece?: string; night?: string }): string {
  if (!hasRealPhone()) return "/visit";
  const lines = [
    opts.piece
      ? `Hello, I would like to request ${opts.piece}.`
      : "Hello, I would like to ask about a piece.",
    opts.night ? `For: ${opts.night}.` : null,
    "I understand this is a request and is not held until you confirm.",
  ].filter(Boolean);
  const digits = SHOP.phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join(" "))}`;
}

/** The sentence that must appear wherever a request can be made. */
export const REQUEST_NOTICE =
  "A request, not a reservation. We will message you to confirm, and a piece is only held once we have.";
