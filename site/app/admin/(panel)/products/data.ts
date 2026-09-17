// Server-only data access for the products admin. Imports lib/db (owner Neon
// connection) — never import this from a client component.
import { sql } from "@/lib/db";
import type {
  CategoryOption,
  ProductFormValues,
  ProductImage,
  Section,
  Spin,
  VariantRow,
} from "./types";

const numOrNull = (v: unknown): number | null =>
  v == null || v === "" ? null : Number(v);

export async function getCategories(): Promise<CategoryOption[]> {
  const rows = await sql<{ id: string; name: string; section: Section }>`
    select id, name, section
      from categories
     where is_active
     order by section, sort_order`;
  return rows.map((r) => ({ id: r.id, name: r.name, section: r.section }));
}

// One product's variant, plus a colour swatch, for the list row.
export type ListVariant = {
  colour_name: string;
  colour_hex: string;
  stock: Record<string, number>;
};

export type ListProduct = {
  id: string;
  type: Section;
  name: string;
  slug: string;
  category_name: string | null;
  image_path: string | null;
  image_alt: string | null;
  price: number | null;
  rental_price: number | null;
  prebook_charge: number | null;
  is_active: boolean;
  variants: ListVariant[];
};

export async function listProducts(): Promise<Record<Section, ListProduct[]>> {
  const products = await sql<{
    id: string;
    type: Section;
    name: string;
    slug: string;
    category_name: string | null;
    images: ProductImage[];
    price: string | null;
    rental_price: string | null;
    prebook_charge: string | null;
    is_active: boolean;
  }>`
    select p.id, p.type, p.name, p.slug, p.images, p.price, p.rental_price,
           p.prebook_charge, p.is_active, c.name as category_name
      from products p
      left join categories c on c.id = p.category_id
     order by p.is_active desc, p.name`;

  const variants = await sql<{
    product_id: string;
    colour_name: string;
    colour_hex: string;
    stock: Record<string, number>;
  }>`
    select product_id, colour_name, colour_hex, stock
      from product_variants
     where is_active
     order by created_at`;

  const byProduct = new Map<string, ListVariant[]>();
  for (const v of variants) {
    const arr = byProduct.get(v.product_id) ?? [];
    arr.push({ colour_name: v.colour_name, colour_hex: v.colour_hex, stock: v.stock });
    byProduct.set(v.product_id, arr);
  }

  const grouped: Record<Section, ListProduct[]> = { rental: [], retail: [], jewellery: [] };
  for (const p of products) {
    const first = Array.isArray(p.images) ? p.images[0] : undefined;
    grouped[p.type].push({
      id: p.id,
      type: p.type,
      name: p.name,
      slug: p.slug,
      category_name: p.category_name,
      image_path: first?.path ?? null,
      image_alt: first?.alt ?? null,
      price: numOrNull(p.price),
      rental_price: numOrNull(p.rental_price),
      prebook_charge: numOrNull(p.prebook_charge),
      is_active: p.is_active,
      variants: byProduct.get(p.id) ?? [],
    });
  }
  return grouped;
}

// Hydrate the edit form. Returns null when the id is unknown.
export async function getProduct(id: string): Promise<ProductFormValues | null> {
  const rows = await sql<{
    id: string;
    type: Section;
    category_id: string | null;
    name: string;
    slug: string;
    description: { en?: string; hi?: string } | null;
    occasions: string[] | null;
    images: ProductImage[] | null;
    spin: Spin | null;
    price: string | null;
    rental_price: string | null;
    prebook_charge: string | null;
    extension_rate: string | null;
    is_active: boolean;
  }>`
    select id, type, category_id, name, slug, description, occasions, images,
           spin, price, rental_price, prebook_charge, extension_rate, is_active
      from products
     where id = ${id}`;
  const p = rows[0];
  if (!p) return null;

  // The counts come from variant_stock, not from the `stock` jsonb beside them:
  // since migration 0007 that table is what the shop actually owns, what the
  // storefront offers sizes from, and what a reservation moves. The jsonb is
  // the pre-0007 copy and is no longer read anywhere (RETAIL_SPEC §1.1).
  const variantRows = await sql<{
    id: string;
    colour_name: string;
    colour_hex: string;
    stock: Record<string, number> | null;
    price_override: string | null;
  }>`
    select v.id, v.colour_name, v.colour_hex, v.price_override,
           (select jsonb_object_agg(s.size, s.quantity)
              from variant_stock s where s.variant_id = v.id) as stock
      from product_variants v
     where v.product_id = ${id} and v.is_active
     order by v.created_at`;

  const variants: VariantRow[] = variantRows.map((v) => ({
    id: v.id,
    colour_name: v.colour_name,
    colour_hex: v.colour_hex,
    stock: v.stock ?? {},
    price_override: numOrNull(v.price_override),
    is_active: true,
  }));

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    category_id: p.category_id,
    description: { en: p.description?.en ?? "", hi: p.description?.hi ?? "" },
    occasions: p.occasions ?? [],
    images: Array.isArray(p.images) ? p.images : [],
    spin: p.spin ?? null,
    price: numOrNull(p.price),
    rental_price: numOrNull(p.rental_price),
    prebook_charge: numOrNull(p.prebook_charge),
    extension_rate: numOrNull(p.extension_rate),
    is_active: p.is_active,
    variants,
  };
}
