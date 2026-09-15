/**
 * Photographs for the jewellery categories, keyed by slug.
 *
 * Bridal carries the owner's own pictures (15 Sep 2026: three bridal sets, all
 * to go under Bridal), cropped to 660x880 in public/jewellery/. The first is
 * the category's cover; the head's arcade turns through all of them. The other
 * categories still borrow the stock category picture in which that kind of
 * jewellery is most plainly worn, until the owner sends theirs. Wherever one of
 * these stands in for a piece's own photograph it is labelled "Sample photo".
 *
 * Keyed by slug and not a copy of the category list: names, order and which
 * categories exist come from the database. A slug with no sensible picture
 * (oxidised: no stock photograph shows silver) gets none and a drawn ornament.
 *
 * Client-safe: no database import, so the hero can use it.
 */
const IMAGES: Record<string, string[]> = {
  navratri: ["/categories/rajasthani-poshak.webp"],
  bridal: [
    "/jewellery/bridal-red.webp",
    "/jewellery/bridal-navy.webp",
    "/jewellery/bridal-kundan-set.webp",
  ],
  "south-indian": ["/categories/sarees.webp"],
  haldi: ["/categories/short-kurtis.webp"],
  mehendi: ["/categories/gowns.webp"],
};

/** The category's cover photograph, or null. */
export function jewelleryImage(slug: string): string | null {
  return IMAGES[slug]?.[0] ?? null;
}

/** Every photograph the category has, cover first. */
export function jewelleryImages(slug: string): string[] {
  return IMAGES[slug] ?? [];
}
