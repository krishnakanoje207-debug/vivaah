// Owner's category lists (July 2026). Mirrors the seeds in specs/schema.sql;
// moves to the `categories` table in Phase 1. `count` is a stub until real
// inventory exists. Thumbnails: self-hosted under /public/categories (curated
// 17 Jul 2026 from the Kombai canvas pool + Pexels API; commercial-use
// licenses — see public/categories/SOURCES.md). User-approved exception to
// the §7 no-stock rule; swap for the owner's photography as it arrives.

export type Category = {
  slug: string;
  name: string;
  count: number;
  image?: string;
};

export const RENTAL_CATEGORIES: Category[] = [
  { slug: "bridal-lehengas", name: "Bridal Lehengas", count: 1, image: "/categories/bridal-lehengas.jpg" },
  { slug: "side-lehengas", name: "Side Lehengas", count: 0, image: "/categories/side-lehengas.jpg" },
  { slug: "indo-western", name: "Indo-Western", count: 0, image: "/categories/indo-western.jpg" },
  { slug: "ready-to-wear-sarees", name: "Ready-to-wear Sarees", count: 0, image: "/categories/ready-to-wear-sarees.jpg" },
  { slug: "rajasthani-poshak", name: "Rajasthani Poshak", count: 0, image: "/categories/rajasthani-poshak.jpg" },
  { slug: "chaniya-cholis", name: "Chaniya Cholis", count: 0, image: "/categories/chaniya-cholis.jpg" },
  { slug: "gowns", name: "Gowns", count: 0, image: "/categories/gowns.jpg" },
  { slug: "sarees", name: "Sarees", count: 0, image: "/categories/sarees.jpg" },
];

export const RETAIL_CATEGORIES: Category[] = [
  { slug: "three-piece-suits", name: "3-Piece Suits", count: 0, image: "/categories/three-piece-suits.jpg" },
  { slug: "party-wear-suits", name: "Party Wear Suits", count: 0, image: "/categories/party-wear-suits.jpg" },
  { slug: "one-piece", name: "One Piece", count: 0, image: "/categories/one-piece.jpg" },
  { slug: "short-kurtis", name: "Short Kurtis", count: 0, image: "/categories/short-kurtis.jpg" },
  { slug: "co-ord-sets", name: "Co-ord Sets", count: 0, image: "/categories/co-ord-sets.jpg" },
  { slug: "night-suits", name: "Night Suits", count: 0, image: "/categories/night-suits.jpg" },
  { slug: "kurta-pant-sets", name: "2-Piece Kurta-Pant Sets", count: 0, image: "/categories/kurta-pant-sets.jpg" },
  { slug: "kaftans", name: "Kaftans", count: 0, image: "/categories/kaftans.jpg" },
];
