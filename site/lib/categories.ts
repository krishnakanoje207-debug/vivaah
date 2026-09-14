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
  { slug: "bridal-lehengas", name: "Bridal Lehengas", count: 1, image: "/categories/bridal-lehengas.webp" },
  { slug: "side-lehengas", name: "Side Lehengas", count: 0, image: "/categories/side-lehengas.webp" },
  { slug: "indo-western", name: "Indo-Western", count: 0, image: "/categories/indo-western.webp" },
  { slug: "ready-to-wear-sarees", name: "Ready-to-wear Sarees", count: 0, image: "/categories/ready-to-wear-sarees.webp" },
  { slug: "rajasthani-poshak", name: "Rajasthani Poshak", count: 0, image: "/categories/rajasthani-poshak.webp" },
  { slug: "chaniya-cholis", name: "Chaniya Cholis", count: 0, image: "/categories/chaniya-cholis.webp" },
  { slug: "gowns", name: "Gowns", count: 0, image: "/categories/gowns.webp" },
  { slug: "sarees", name: "Sarees", count: 0, image: "/categories/sarees.webp" },
];

export const RETAIL_CATEGORIES: Category[] = [
  { slug: "three-piece-suits", name: "3-Piece Suits", count: 0, image: "/categories/three-piece-suits.webp" },
  { slug: "party-wear-suits", name: "Party Wear Suits", count: 0, image: "/categories/party-wear-suits.webp" },
  { slug: "one-piece", name: "One Piece", count: 0, image: "/categories/one-piece.webp" },
  { slug: "short-kurtis", name: "Short Kurtis", count: 0, image: "/categories/short-kurtis.webp" },
  { slug: "co-ord-sets", name: "Co-ord Sets", count: 0, image: "/categories/co-ord-sets.webp" },
  { slug: "night-suits", name: "Night Suits", count: 0, image: "/categories/night-suits.webp" },
  { slug: "kurta-pant-sets", name: "2-Piece Kurta-Pant Sets", count: 0, image: "/categories/kurta-pant-sets.webp" },
  { slug: "kaftans", name: "Kaftans", count: 0, image: "/categories/kaftans.webp" },
  // Migration 0004. The photograph is the rental sarees' own until the owner
  // shoots the retail rail; its slug keeps it distinct from the rental one.
  { slug: "retail-sarees", name: "Sarees", count: 0, image: "/categories/sarees.webp" },
];
