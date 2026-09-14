// Single source of truth for shell content in Preview 1.
// In Phase 1 these move to the `settings` / `site_content` tables (admin-editable).

export const SHOP = {
  name: "Vivaah Dresses and Suits",
  short: "Vivaah",
  lockup: "Dresses & Suits", // small line under the wordmark
  tagline: "Bridal and festive wear to rent or buy, with jewellery to match.",
  // Placeholder shop details — replaced by admin settings later.
  address: "Shop address, City",
  hours: "Mon–Sat, 11am – 8pm",
  phone: "+91 00000 00000",
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
