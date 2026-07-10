// Single source of truth for shell content in Preview 0.
// In Phase 1 these move to the `settings` / `site_content` tables (admin-editable).

export const SHOP = {
  name: "Vivaah",
  tagline: "Bridal lehengas & jewellery, for the days you'll remember.",
  // Placeholder shop details — replaced by admin settings later.
  address: "Shop address, City",
  hours: "Mon–Sat, 11am – 8pm",
  phone: "+91 00000 00000",
  mapsUrl: "https://maps.google.com/?q=Vivaah",
  instagram: "https://instagram.com/",
} as const;

export const NAV_LINKS = [
  { href: "/rentals", label: "Lehengas" },
  { href: "/jewellery", label: "Jewellery" },
  { href: "/retail", label: "Shop" },
  { href: "/visit", label: "Visit us" },
] as const;

export const OCCASIONS = [
  "Bridal",
  "Sangeet",
  "Mehendi",
  "Reception",
] as const;
