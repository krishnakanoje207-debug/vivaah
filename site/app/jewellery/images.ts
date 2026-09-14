/**
 * Stand-in photographs for the jewellery categories, until the owner shoots the
 * shelf. There is no jewellery photography yet, so each category borrows the
 * category picture in which that kind of jewellery is most plainly worn. Every
 * place one appears as a piece's picture labels it "Sample photo".
 *
 * Keyed by slug and not a copy of the category list: names, order and which
 * categories exist come from the database. A slug with no sensible picture
 * (oxidised: no stock photograph shows silver) gets null and a drawn ornament.
 *
 * Client-safe: no database import, so the hero can use it.
 */
const IMAGES: Record<string, string> = {
  navratri: "/categories/rajasthani-poshak.webp",
  bridal: "/categories/side-lehengas.webp",
  "south-indian": "/categories/sarees.webp",
  haldi: "/categories/short-kurtis.webp",
  mehendi: "/categories/gowns.webp",
};

export function jewelleryImage(slug: string): string | null {
  return IMAGES[slug] ?? null;
}
