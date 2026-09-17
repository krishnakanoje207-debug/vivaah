// Jewellery catalogue reads — SERVER CODE ONLY (imports lib/dbPublic, the
// app_public RLS connection). Keep imports of this file in server components.
//
// Jewellery is its own product_type (migrations 0002, 0003, 0005): rentable on
// its own, priced like the garments (rental_price + prebook_charge). Pieces are
// photographed as stills, so there is no turntable here, only `images`.
import { cache } from "react";
import { sqlPublic } from "@/lib/dbPublic";
import { jewelleryImage } from "@/app/jewellery/images";

// formatINR is NOT re-exported here. This module imports lib/dbPublic, so the
// Neon driver comes with any value imported from it: SelectionTray took the
// convenience re-export that used to sit here and shipped a Postgres client to
// every visitor on every page, 45KB over the wire, because the tray is in Nav.
// Import the formatter from lib/format, which is pure.

export type JewelleryImage = { path: string; alt: string };

export type JewelleryPiece = {
  slug: string;
  name: string;
  category: string; // jewellery category slug
  categoryName: string;
  occasions: string[];
  description: string;
  pricePerDay: number | null; // rental_price
  prebook: number | null; // prebook_charge
  images: JewelleryImage[];
  createdAt: string;
};

export type JewelleryCategory = {
  slug: string;
  name: string;
  count: number;
  /** A borrowed stand-in photograph, labelled as a sample wherever it shows. */
  image: string | null;
};

type Row = {
  slug: string;
  name: string;
  description: { en?: string } | null;
  occasions: string[] | null;
  images: unknown;
  rental_price: string | null;
  prebook_charge: string | null;
  category_slug: string | null;
  category_name: string | null;
  created_at: string | Date;
};

const numOrNull = (v: string | null): number | null => (v == null ? null : Number(v));
const titleCase = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : "");

// `images` is owner-typed jsonb, so it is read defensively: only entries with a
// site-relative or https path survive, and a missing alt falls back to the name.
function toImages(raw: unknown, name: string): JewelleryImage[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x) => {
    const path = typeof x?.path === "string" ? x.path.trim() : "";
    if (!/^(\/(?!\/)|https:\/\/)/.test(path)) return [];
    const alt = typeof x?.alt === "string" && x.alt.trim() ? x.alt.trim() : name;
    return [{ path, alt }];
  });
}

function toPiece(r: Row): JewelleryPiece {
  return {
    slug: r.slug,
    name: r.name,
    category: r.category_slug ?? "",
    categoryName: r.category_name ?? "",
    occasions: (r.occasions ?? []).map(titleCase).filter(Boolean),
    description: r.description?.en ?? "",
    pricePerDay: numOrNull(r.rental_price),
    prebook: numOrNull(r.prebook_charge),
    images: toImages(r.images, r.name),
    createdAt:
      r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

/** Active jewellery pieces, optionally in one category. */
export async function getJewellery(categorySlug?: string): Promise<JewelleryPiece[]> {
  const rows = await sqlPublic<Row>`
    select p.slug, p.name, p.description, p.occasions, p.images,
           p.rental_price, p.prebook_charge, p.created_at,
           c.slug as category_slug, c.name as category_name
      from products p
      left join categories c on c.id = p.category_id
     where p.type = 'jewellery' and p.is_active
       and (${categorySlug ?? null}::text is null or c.slug = ${categorySlug ?? null})
     order by p.created_at desc`;
  return rows.map(toPiece);
}

/** One piece by slug. cache() so metadata and the page share a round-trip. */
export const getJewelleryPiece = cache(async (slug: string): Promise<JewelleryPiece | null> => {
  const rows = await sqlPublic<Row>`
    select p.slug, p.name, p.description, p.occasions, p.images,
           p.rental_price, p.prebook_charge, p.created_at,
           c.slug as category_slug, c.name as category_name
      from products p
      left join categories c on c.id = p.category_id
     where p.type = 'jewellery' and p.is_active and p.slug = ${slug}`;
  return rows[0] ? toPiece(rows[0]) : null;
});

/** The jewellery categories in the owner's order, with live piece counts. */
export const getJewelleryCategories = cache(async (): Promise<JewelleryCategory[]> => {
  const rows = await sqlPublic<{ slug: string; name: string; count: number }>`
    select c.slug, c.name, count(p.id)::int as count
      from categories c
      left join products p
        on p.category_id = c.id and p.type = 'jewellery' and p.is_active
     where c.section = 'jewellery' and c.is_active
     group by c.id, c.slug, c.name, c.sort_order
     order by c.sort_order`;
  return rows.map((r) => ({ ...r, image: jewelleryImage(r.slug) }));
});
