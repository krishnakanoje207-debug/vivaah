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
  /** ISO timestamp the row was created. Drives the "Just in" badge. */
  createdAt: string;
};

/**
 * Badges shown on a product card.
 *
 * Every badge here has to be TRUE of the piece it sits on, because these are
 * factual claims made to a customer on the shop's behalf. That rules out the
 * usual retail set until the data behind it exists:
 *
 *   "Most rented" / "High demand"  — `booking_items` has no rows (Phase 2).
 *   "Most sold"                    — retail sales are Phase 3.
 *   "Only one left" / "Limited"    — measured 12 Sep 2026: EVERY rental has
 *     total stock 1, because a rental garment is one physical piece. A badge
 *     that is true of the whole catalogue tells a reader nothing, and still
 *     implies a scarcity relative to other pieces that does not exist.
 *
 * The useful scarcity signal for a rental is not "how many exist" but "which
 * dates are already taken", and that arrives with the booking engine.
 */
export type Badge = { label: string; tone: "new" | "owner" };

/** Rows created within this many days carry "Just in". */
const JUST_IN_DAYS = 7;

export function productBadges(p: Rental, now = Date.now()): Badge[] {
  const badges: Badge[] = [];
  const age = (now - new Date(p.createdAt).getTime()) / 86_400_000;
  // The shop's whole claim is that the rail changes day to day; this is the
  // only badge that evidences it, and it needs no owner input to stay true.
  if (Number.isFinite(age) && age >= 0 && age <= JUST_IN_DAYS) {
    badges.push({ label: "Just in", tone: "new" });
  }
  return badges;
}

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

// formatINR is NOT re-exported here. This module imports lib/dbPublic, so the
// Neon driver comes with any value imported from it: SelectionTray took the
// convenience re-export that used to sit here and shipped a Postgres client to
// every visitor on every page, 45KB over the wire, because the tray is in Nav.
// Import the formatter from lib/format, which is pure.

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
  // The Neon driver hands back a Date for timestamptz, but the shape is not
  // guaranteed across the serverless/pooled paths, so both are handled.
  created_at: string | Date;
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
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at),
  };
}

// Active rental products, optionally filtered to one category slug. List cards
// never render reviews, so those are left empty here (loaded only per product).
export async function getRentals(categorySlug?: string): Promise<Rental[]> {
  const rows = await sqlPublic<ProductRow>`
    select p.id, p.slug, p.name, p.description, p.occasions, p.spin,
           p.rental_price, p.prebook_charge, p.created_at,
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

/** A just-arrived piece, cut down to what the new-stock notice shows. */
export type NewArrival = {
  slug: string;
  name: string;
  pricePerDay: number | null;
  /** Front turntable frame, or the category picture when `sample` is true. */
  image: string | null;
  sample: boolean;
  createdAt: string;
};

// The newest active rentals inside the same "Just in" window productBadges
// uses, newest first. Deliberately its own tiny query rather than a filter over
// getRentals(): it runs from the root layout, so it is on every storefront
// request and must not pull the whole catalogue to find three rows.
export async function getNewArrivals(limit = 3): Promise<NewArrival[]> {
  const rows = await sqlPublic<{
    slug: string;
    name: string;
    spin: DbSpin | null;
    rental_price: string | null;
    category_slug: string | null;
    created_at: string | Date;
  }>`
    select p.slug, p.name, p.spin, p.rental_price, p.created_at,
           c.slug as category_slug
      from products p
      left join categories c on c.id = p.category_id
     where p.type = 'rental' and p.is_active
       and p.created_at >= now() - make_interval(days => ${JUST_IN_DAYS})
     order by p.created_at desc
     limit ${limit}`;
  return rows.map((r) => {
    const spin = toSpinConfig(r.spin);
    const sample = spin
      ? null
      : RENTAL_CATEGORIES.find((c) => c.slug === r.category_slug)?.image ?? null;
    return {
      slug: r.slug,
      name: r.name,
      pricePerDay: numOrNull(r.rental_price),
      image: spin ? `${spin.basePath}/000.${spin.ext}` : sample,
      sample: !spin && sample !== null,
      createdAt:
        r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    };
  });
}

export async function getFeaturedRentals(): Promise<Rental[]> {
  return (await getRentals()).slice(0, 3);
}

// One product + its approved reviews. Wrapped in cache() so generateMetadata and
// the page component share a single round-trip per request. Null → 404.
export const getRental = cache(async (slug: string): Promise<Rental | null> => {
  const rows = await sqlPublic<ProductRow>`
    select p.id, p.slug, p.name, p.description, p.occasions, p.spin,
           p.rental_price, p.prebook_charge, p.created_at,
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
