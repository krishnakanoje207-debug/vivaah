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
 * The owner's word for this is "reserve online, collect at the shop"
 * (15 Sep 2026: "everywhere"). The message still says a piece is held once she
 * confirms it, because that is her rule (12 Sep 2026) and the customer should
 * read it in the message she is sending, not only on the page.
 */
export function enquiryHref(opts: { piece?: string; night?: string }): string {
  if (!hasRealPhone()) return "/visit";
  const lines = [
    opts.piece
      ? `Hello, I would like to reserve ${opts.piece}.`
      : "Hello, I would like to reserve a piece.",
    opts.night ? `For: ${opts.night}.` : null,
    "I understand it is held once you confirm.",
  ].filter(Boolean);
  const digits = SHOP.phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join(" "))}`;
}

/** The sentence that must appear wherever a request can be made. */
export const REQUEST_NOTICE =
  "Reserve online, collect at the shop. We message you to confirm, and the piece is held once we have.";

/**
 * The same request, for several pieces at once.
 *
 * Kept beside `enquiryHref` rather than folded into it because the two messages
 * are shaped differently: one names a garment, this one lists them and leads
 * with the day, since the day is what the shop has to check availability
 * against and reading it last would make her scroll back.
 *
 * The pieces are listed by name only, with no prices and no total. The shop
 * knows its own prices, the visitor may have gathered a piece whose price is
 * not published, and a number in this message would read as an amount agreed
 * when nothing has been agreed at all.
 *
 * `items` is typed structurally so this module does not import from
 * lib/selection, which is a client module.
 */
export function selectionHref(sel: {
  items: { name: string }[];
  date: string | null;
}): string {
  if (!hasRealPhone() || sel.items.length === 0) return "/visit";
  const lines = [
    sel.items.length === 1
      ? "Hello, I would like to reserve this piece:"
      : `Hello, I would like to reserve these ${sel.items.length} pieces:`,
    ...sel.items.map((i) => `- ${i.name}`),
    sel.date ? `For: ${sel.date}.` : null,
    "I understand they are held once you confirm.",
  ].filter(Boolean);
  const digits = SHOP.phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
}
