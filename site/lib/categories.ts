// Owner's category lists (July 2026). Mirrors the seeds in specs/schema.sql;
// moves to the `categories` table in Phase 1. `count` is a stub until real
// inventory exists. `image` is optional — tiles fall back to the porcelain
// gradient until the owner's own photography lands (no stock imagery, §7).

export type Category = {
  slug: string;
  name: string;
  count: number;
  image?: string;
};

export const RENTAL_CATEGORIES: Category[] = [
  { slug: "bridal-lehengas", name: "Bridal Lehengas", count: 1 },
  { slug: "side-lehengas", name: "Side Lehengas", count: 0 },
  { slug: "indo-western", name: "Indo-Western", count: 0 },
  { slug: "ready-to-wear-sarees", name: "Ready-to-wear Sarees", count: 0 },
  { slug: "rajasthani-poshak", name: "Rajasthani Poshak", count: 0 },
  { slug: "chaniya-cholis", name: "Chaniya Cholis", count: 0 },
  { slug: "gowns", name: "Gowns", count: 0 },
  { slug: "sarees", name: "Sarees", count: 0 },
];

export const RETAIL_CATEGORIES: Category[] = [
  { slug: "three-piece-suits", name: "3-Piece Suits", count: 0 },
  { slug: "party-wear-suits", name: "Party Wear Suits", count: 0 },
  { slug: "one-piece", name: "One Piece", count: 0 },
  { slug: "short-kurtis", name: "Short Kurtis", count: 0 },
  { slug: "co-ord-sets", name: "Co-ord Sets", count: 0 },
  { slug: "night-suits", name: "Night Suits", count: 0 },
  { slug: "kurta-pant-sets", name: "2-Piece Kurta-Pant Sets", count: 0 },
  { slug: "kaftans", name: "Kaftans", count: 0 },
];
