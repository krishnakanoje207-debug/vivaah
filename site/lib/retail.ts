// Retail catalogue reads — SERVER CODE ONLY (imports lib/dbPublic, the
// app_public RLS connection). Keep imports of this file in server components.
//
// specs/RETAIL_SPEC.md. The half of the shop you keep: pieces the shop owns
// several of, in colours and sizes, reserved for a collection appointment
// rather than rented for a range of days.
//
// R3, and the reason this file is shaped the way it is: the owner shows sizes,
// never counts. "Only 1 left" is pressure, and it is pressure about a number
// she corrects by hand. So a size crosses into the page as a boolean and the
// quantity stays in the database — there is no field on any type here that
// could render a count even by mistake.
import { cache } from "react";
import { sqlPublic } from "@/lib/dbPublic";
import { RETAIL_CATEGORIES, type Category } from "@/lib/categories";
import type { Review } from "@/lib/rentals";

export type RetailImage = { path: string; alt: string };

export type RetailSize = {
  size: string;
  /** False renders the size disabled, never hidden: she should know it exists. */
  inStock: boolean;
};

export type RetailVariant = {
  id: string;
  colourName: string;
  colourHex: string;
  /** This colour's own photographs, or the product's where it has none yet. */
  images: RetailImage[];
  sizes: RetailSize[];
  price: number | null;
};

export type RetailPiece = {
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number | null;
  variants: RetailVariant[];
  reviews: Review[];
  createdAt: string;
};

/** The listing shape: one card, one colour (the first), one picture. */
export type RetailCard = {
  slug: string;
  name: string;
  category: string;
  price: number | null;
  colourName: string;
  /** Number of active colours, so a card can say "3 colours" without a count of stock. */
  colours: number;
  image: string | null;
  /** True when `image` is the category photograph standing in, not this piece. */
  sample: boolean;
  createdAt: string;
};

// A rail runs S → XXL and then the things that have no size. Anything the shop
// types that is not on this list sorts after it, alphabetically, so an unusual
// label appears rather than disappearing into an arbitrary position.
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free size"];
const sizeRank = (s: string) => {
  const i = SIZE_ORDER.findIndex((x) => x.toLowerCase() === s.toLowerCase());
  return i === -1 ? SIZE_ORDER.length : i;
};
function bySize(a: RetailSize, b: RetailSize) {
  return sizeRank(a.size) - sizeRank(b.size) || a.size.localeCompare(b.size);
}

const numOrNull = (v: string | null): number | null => (v == null ? null : Number(v));
const iso = (v: string | Date) => (v instanceof Date ? v.toISOString() : String(v));

// The same test every other route applies to an admin-supplied image path: a
// site path or https, never protocol-relative or a script URL.
const PATH_RE = /^(\/(?!\/)|https:\/\/)/;

function toImages(v: unknown): RetailImage[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((i) => {
    const o = i as { path?: unknown; alt?: unknown };
    return typeof o?.path === "string" && PATH_RE.test(o.path)
      ? [{ path: o.path, alt: typeof o.alt === "string" ? o.alt : "" }]
      : [];
  });
}

/** The category photograph, for a piece with none of its own. */
const categoryImage = (slug: string) =>
  RETAIL_CATEGORIES.find((c) => c.slug === slug)?.image ?? null;

// ---------------------------------------------------------------------------
// listing

/** Active retail pieces, newest first, optionally filtered to one category. */
export async function getRetailCards(categorySlug?: string): Promise<RetailCard[]> {
  const rows = await sqlPublic<{
    slug: string;
    name: string;
    price: string | null;
    images: unknown;
    category_slug: string | null;
    colour_name: string | null;
    variant_images: unknown;
    colours: number;
    created_at: string | Date;
  }>`
    select p.slug, p.name, p.price, p.images, p.created_at,
           c.slug as category_slug,
           v.colour_name, v.images as variant_images,
           (select count(*)::int from product_variants x
             where x.product_id = p.id and x.is_active) as colours
      from products p
      left join categories c on c.id = p.category_id
      left join lateral (
        select colour_name, images from product_variants
         where product_id = p.id and is_active
         order by created_at limit 1
      ) v on true
     where p.type = 'retail' and p.is_active
       and (${categorySlug ?? null}::text is null or c.slug = ${categorySlug ?? null})
     order by p.created_at desc`;

  return rows.map((r) => {
    const own = toImages(r.variant_images)[0]?.path ?? toImages(r.images)[0]?.path ?? null;
    const category = r.category_slug ?? "";
    const sample = own ? null : categoryImage(category);
    return {
      slug: r.slug,
      name: r.name,
      category,
      price: numOrNull(r.price),
      colourName: r.colour_name ?? "",
      colours: r.colours,
      image: own ?? sample,
      sample: !own && sample !== null,
      createdAt: iso(r.created_at),
    };
  });
}

/** Active retail categories with a live count, for the mosaic tiles. */
export async function getRetailCategories(): Promise<Category[]> {
  const rows = await sqlPublic<{ slug: string; name: string; count: number }>`
    select c.slug, c.name, count(p.id)::int as count
      from categories c
      left join products p
        on p.category_id = c.id and p.type = 'retail' and p.is_active
     where c.section = 'retail' and c.is_active
     group by c.id, c.slug, c.name, c.sort_order
     order by c.sort_order`;
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    count: r.count,
    image: categoryImage(r.slug) ?? undefined,
  }));
}

// ---------------------------------------------------------------------------
// one piece

/**
 * The active colours of the given products, with the sizes kept in each.
 * Variant images are the colour's own here; a caller that has the product's
 * pictures to fall back on applies that itself.
 *
 * Shared with the booking engine, which needs the same list to check that a
 * reservation names a colour and size this piece actually comes in.
 */
export async function getVariantsFor(
  productIds: string[],
): Promise<Map<string, RetailVariant[]>> {
  const out = new Map<string, RetailVariant[]>(productIds.map((id) => [id, []]));
  if (productIds.length === 0) return out;

  // One query for the colours and their sizes. `in_stock` is computed in SQL
  // and the counts are left there: see the file header.
  const rows = await sqlPublic<{
    product_id: string;
    id: string;
    colour_name: string;
    colour_hex: string;
    images: unknown;
    price_override: string | null;
    price: string | null;
    size: string | null;
    in_stock: boolean | null;
  }>`
    select v.product_id, v.id, v.colour_name, v.colour_hex, v.images,
           v.price_override, p.price, s.size, (s.quantity - s.held > 0) as in_stock
      from product_variants v
      join products p on p.id = v.product_id
      left join variant_stock s on s.variant_id = v.id
     where v.product_id = any(${productIds}::uuid[]) and v.is_active
     order by v.created_at, s.size`;

  const byId = new Map<string, RetailVariant>();
  for (const r of rows) {
    let v = byId.get(r.id);
    if (!v) {
      v = {
        id: r.id,
        colourName: r.colour_name,
        colourHex: r.colour_hex,
        images: toImages(r.images),
        sizes: [],
        price: numOrNull(r.price_override) ?? numOrNull(r.price),
      };
      byId.set(r.id, v);
      out.get(r.product_id)?.push(v);
    }
    if (r.size) v.sizes.push({ size: r.size, inStock: r.in_stock === true });
  }
  for (const v of byId.values()) v.sizes.sort(bySize);
  return out;
}

/**
 * One retail piece with every active colour, the sizes the shop keeps in each,
 * and its approved reviews. Cached per request so generateMetadata and the page
 * share a round-trip. Null → 404.
 */
export const getRetailPiece = cache(async (slug: string): Promise<RetailPiece | null> => {
  const rows = await sqlPublic<{
    id: string;
    slug: string;
    name: string;
    description: { en?: string; hi?: string } | null;
    price: string | null;
    images: unknown;
    category_slug: string | null;
    created_at: string | Date;
  }>`
    select p.id, p.slug, p.name, p.description, p.price, p.images, p.created_at,
           c.slug as category_slug
      from products p
      left join categories c on c.id = p.category_id
     where p.type = 'retail' and p.is_active and p.slug = ${slug}`;
  const row = rows[0];
  if (!row) return null;

  const variants = (await getVariantsFor([row.id])).get(row.id) ?? [];
  // A colour with no photographs of its own shows the product's, until the
  // owner's per-colour photography lands (RETAIL_SPEC §6).
  const productImages = toImages(row.images);
  for (const v of variants) if (v.images.length === 0) v.images = productImages;

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

  return {
    slug: row.slug,
    name: row.name,
    category: row.category_slug ?? "",
    description: row.description?.en ?? "",
    price: numOrNull(row.price),
    variants,
    reviews: reviewRows.map((r) => ({
      name: r.customer_name,
      rating: r.rating,
      body: r.body,
      verified: r.verified,
    })),
    createdAt: iso(row.created_at),
  };
});

/** Every retail slug, for generateStaticParams and the sitemap. */
export async function getRetailSlugs(): Promise<string[]> {
  const rows = await sqlPublic<{ slug: string }>`
    select slug from products where type = 'retail' and is_active order by created_at desc`;
  return rows.map((r) => r.slug);
}

export { formatINR } from "@/lib/format";
