// Rental catalogue reads — SERVER CODE ONLY (imports lib/dbPublic, the
// app_public RLS connection). Keep imports of this file in server components.
import { cache } from "react";
import type { SpinConfig } from "@/components/site/SpinViewer";
import { sqlPublic } from "@/lib/dbPublic";
import { RENTAL_CATEGORIES, type Category } from "@/lib/categories";

export type Review = {
  name: string;
  rating: number; // 1–5
  body: string;
  verified: boolean;
};

export type Rental = {
  slug: string;
  name: string;
  note: string;
  occasion: string;
  category: string; // rental category slug (lib/categories.ts)
  colourName: string;
  colourHex: string;
  pricePerDay: number | null; // rental_price
  prebook: number | null; // prebook_charge
  spin: SpinConfig | null; // null until turntable frames exist
  description: string;
  reviews: Review[];
};

// Even-spaced frame stills for the swipeable gallery (front → back). n = 1 is
// the single-still stage for products that get no turntable, and the spacing
// divides by n - 1, so that case has to be taken before the arithmetic.
export function galleryFrames(spin: SpinConfig, n = 5): string[] {
  const idx =
    n <= 1
      ? [0]
      : Array.from({ length: n }, (_, i) => Math.round((i * (spin.count - 1)) / (n - 1)));
  return idx.map((i) => `${spin.basePath}/${String(i).padStart(spin.pad, "0")}.${spin.ext}`);
}

// Lives in lib/format so client components can use it without pulling this
// file (and with it the app_public connection) into the browser bundle.
export { formatINR } from "@/lib/format";

// The DB `spin` jsonb is the admin/canonical shape (specs/schema.sql:65); the
// SpinViewer wants the fuller SpinConfig. The extra render fields (ext/pad/
// width/height) are fixed turntable-pipeline conventions — every frame set is
// 3-pad webp at 1280×720 (see any /public/rentals/*/360/metadata.json) — so we
// default them here rather than store them per product.
type DbSpin = { basePath: string; frames: number; arcDegrees: number; loop: boolean };

function toSpinConfig(s: DbSpin | null): SpinConfig | null {
  if (!s || !s.basePath || !s.frames) return null;
  return {
    basePath: s.basePath,
    count: s.frames,
    ext: "webp",
    pad: 3,
    width: 1280,
    height: 720,
    arcDegrees: s.arcDegrees,
    loop: s.loop,
  };
}

const numOrNull = (v: string | null): number | null => (v == null ? null : Number(v));
const titleCase = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : "");

// One product row shared by the list + detail queries (reviews joined separately).
type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: { en?: string; hi?: string } | null;
  occasions: string[] | null;
  spin: DbSpin | null;
  rental_price: string | null;
  prebook_charge: string | null;
  category_slug: string | null;
  colour_name: string | null;
  colour_hex: string | null;
};

function toRental(r: ProductRow, reviews: Review[]): Rental {
  const occasion = titleCase(r.occasions?.[0] ?? "");
  return {
    slug: r.slug,
    name: r.name,
    note: occasion,
    occasion,
    category: r.category_slug ?? "",
    colourName: r.colour_name ?? "",
    colourHex: r.colour_hex ?? "#efe9dd",
    pricePerDay: numOrNull(r.rental_price),
    prebook: numOrNull(r.prebook_charge),
    spin: toSpinConfig(r.spin),
    description: r.description?.en ?? "",
    reviews,
  };
}

// Active rental products, optionally filtered to one category slug. List cards
// never render reviews, so those are left empty here (loaded only per product).
export async function getRentals(categorySlug?: string): Promise<Rental[]> {
  const rows = await sqlPublic<ProductRow>`
    select p.id, p.slug, p.name, p.description, p.occasions, p.spin,
           p.rental_price, p.prebook_charge,
           c.slug as category_slug,
           v.colour_name, v.colour_hex
      from products p
      left join categories c on c.id = p.category_id
      left join lateral (
        select colour_name, colour_hex from product_variants
         where product_id = p.id and is_active
         order by created_at limit 1
      ) v on true
     where p.type = 'rental' and p.is_active
       and (${categorySlug ?? null}::text is null or c.slug = ${categorySlug ?? null})
     order by p.created_at`;
  return rows.map((r) => toRental(r, []));
}

export async function getFeaturedRentals(): Promise<Rental[]> {
  return (await getRentals()).slice(0, 3);
}

// One product + its approved reviews. Wrapped in cache() so generateMetadata and
// the page component share a single round-trip per request. Null → 404.
export const getRental = cache(async (slug: string): Promise<Rental | null> => {
  const rows = await sqlPublic<ProductRow>`
    select p.id, p.slug, p.name, p.description, p.occasions, p.spin,
           p.rental_price, p.prebook_charge,
           c.slug as category_slug,
           v.colour_name, v.colour_hex
      from products p
      left join categories c on c.id = p.category_id
      left join lateral (
        select colour_name, colour_hex from product_variants
         where product_id = p.id and is_active
         order by created_at limit 1
      ) v on true
     where p.type = 'rental' and p.is_active and p.slug = ${slug}`;
  const row = rows[0];
  if (!row) return null;

  const reviewRows = await sqlPublic<{
    customer_name: string;
    rating: number;
    body: string;
    verified: boolean;
  }>`
    select customer_name, rating, body, (booking_id is not null) as verified
      from reviews
     where product_id = ${row.id} and is_approved
     order by created_at desc`;

  const reviews: Review[] = reviewRows.map((r) => ({
    name: r.customer_name,
    rating: r.rating,
    body: r.body,
    verified: r.verified,
  }));
  return toRental(row, reviews);
});

// Active rental categories (from the categories table, sort_order), enriched
// with the curated local thumbnail + a live active-product count for the tiles.
export async function getRentalCategories(): Promise<Category[]> {
  const rows = await sqlPublic<{ slug: string; name: string; count: number }>`
    select c.slug, c.name, count(p.id)::int as count
      from categories c
      left join products p
        on p.category_id = c.id and p.type = 'rental' and p.is_active
     where c.section = 'rental' and c.is_active
     group by c.id, c.slug, c.name, c.sort_order
     order by c.sort_order`;
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    count: r.count,
    image: RENTAL_CATEGORIES.find((c) => c.slug === r.slug)?.image,
  }));
}
