// Single source of truth for shell content in Preview 1.
// In Phase 1 these move to the `settings` / `site_content` tables (admin-editable).

/**
 * The canonical origin. Used by robots.ts, sitemap.ts and the Open Graph tags,
 * all of which need absolute URLs — a relative og:image is ignored by every
 * scraper that matters, WhatsApp included.
 */
export const SITE_URL = "https://vivaah.vivaah.workers.dev";

export const SHOP = {
  name: "Vivaah Dresses and Suits",
  short: "Vivaah",
  lockup: "Dresses & Suits", // small line under the wordmark
  tagline: "Bridal and festive wear to rent or buy, with jewellery to match.",
  // Placeholder shop details — replaced by admin settings later.
  address: "Shop address, City",
  hours: "Mon–Sat, 11am – 8pm",
  // The shop is run by two partners and there are two numbers. This is the one
  // the site works from: every `tel:` link, and the WhatsApp hand-off in
  // lib/enquiry.ts, resolve to it. Given by the owner 14 Sep 2026.
  phone: "+91 83198 08797",
  // The second partner's line, still to come. Kept separate rather than folded
  // into `phone` because eleven call sites read that field and all of them want
  // exactly one number — a `tel:` href and a WhatsApp thread cannot address two
  // people. When it lands it is listed beside the first wherever the shop's
  // contact details are set out in full (Footer, /visit), and nowhere else.
  phoneAlt: null as string | null,
  mapsUrl: "https://maps.google.com/?q=Vivaah+Dresses+and+Suits",
  // The same place, as an embeddable frame. No API key: the q= form is the
  // public embed, so this costs nothing and needs no billing account.
  mapsEmbedUrl:
    "https://maps.google.com/maps?q=Vivaah+Dresses+and+Suits&output=embed",
  instagram: "https://instagram.com/",
  // Logo asset lands here (owner sending); until then Nav/Footer show the wordmark.
  logo: null as string | null, // e.g. "/brand/logo.svg"
} as const;

/**
 * Whether `SHOP.address` is the owner's real one rather than the placeholder.
 *
 * The map embed uses the keyless `?q=` form, which renders an empty grey frame
 * when the query matches no place — and the shop is not on Maps under its own
 * name yet, so the front door's closing section was a 590x442 blank rectangle
 * (measured 14 Sep). A missing frame reads as a page that does not have a map;
 * a blank one reads as a page that is broken. So the embed is gated on this.
 *
 * Mirrors `hasRealPhone()` in lib/enquiry.ts, which gates the WhatsApp hand-off
 * the same way and for the same reason.
 */
export function hasRealAddress(): boolean {
  const a = SHOP.address.trim().toLowerCase();
  return a.length > 0 && a !== "shop address, city";
}

export const NAV_LINKS = [
  { href: "/rentals", label: "Rent" },
  { href: "/retail", label: "Shop" },
  { href: "/jewellery", label: "Jewellery" },
  { href: "/visit", label: "Visit us" },
] as const;

export const OCCASIONS = ["Bridal", "Sangeet", "Mehendi", "Reception"] as const;
