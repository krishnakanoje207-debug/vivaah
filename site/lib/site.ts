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
  instagram: "https://instagram.com/",
  // Logo asset lands here (owner sending); until then Nav/Footer show the wordmark.
  logo: null as string | null, // e.g. "/brand/logo.svg"
} as const;

export const NAV_LINKS = [
  { href: "/rentals", label: "Rent" },
  { href: "/retail", label: "Shop" },
  { href: "/jewellery", label: "Jewellery" },
  { href: "/visit", label: "Visit us" },
] as const;

export const OCCASIONS = ["Bridal", "Sangeet", "Mehendi", "Reception"] as const;
