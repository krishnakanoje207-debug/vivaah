"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { slugify } from "./helpers";
import {
  DEFAULT_VARIANT_HEX,
  DEFAULT_VARIANT_NAME,
  type FormState,
  type ProductImage,
  type Spin,
  type VariantRow,
} from "./types";

const HEX = /^#[0-9A-Fa-f]{6}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// "" -> null (optional); invalid / negative -> "invalid"; else the number.
function parseAmount(raw: string): number | null | "invalid" {
  const s = raw.trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return n;
}

function sanitizeStock(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === "object") {
    for (const [size, count] of Object.entries(raw as Record<string, unknown>)) {
      const key = String(size).trim();
      const n = Math.floor(Number(count));
      if (key && Number.isFinite(n) && n >= 0) out[key] = n;
    }
  }
  return out;
}

function parseImages(raw: string): ProductImage[] {
  try {
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .map((r) => ({ path: String(r?.path ?? "").trim(), alt: String(r?.alt ?? "").trim() }))
      .filter((r) => r.path !== "");
  } catch {
    return [];
  }
}

function parseVariants(raw: string): VariantRow[] {
  try {
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.map((v) => ({
      id: v?.id ? String(v.id) : undefined,
      colour_name: String(v?.colour_name ?? "").trim(),
      colour_hex: String(v?.colour_hex ?? "").trim(),
      stock: sanitizeStock(v?.stock),
      price_override:
        v?.price_override == null || v?.price_override === "" ? null : Number(v.price_override),
      is_active: v?.is_active !== false,
    }));
  } catch {
    return [];
  }
}

async function save(formData: FormData, id: string | null): Promise<FormState> {
  const errors: Record<string, string> = {};

  const name = String(formData.get("name") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const category_id = String(formData.get("category_id") ?? "").trim();
  const description_en = String(formData.get("description_en") ?? "").trim();
  const description_hi = String(formData.get("description_hi") ?? "").trim();
  const is_active = formData.get("is_active") === "on";

  if (!name) errors.name = "Name is required.";
  if (!slug) slug = slugify(name);
  if (!slug) errors.slug = "Slug is required.";
  else if (!SLUG_RE.test(slug)) errors.slug = "Use lowercase letters, numbers and hyphens only.";
  if (type !== "rental" && type !== "retail") errors.type = "Choose a type.";
  if (!category_id) errors.category_id = "Choose a category.";

  const occasions = type === "rental" ? formData.getAll("occasions").map(String) : [];

  // Pricing depends on type.
  let price: number | null = null;
  let rental_price: number | null = null;
  let prebook_charge: number | null = null;
  let extension_rate: number | null = null;
  if (type === "rental") {
    const rp = parseAmount(String(formData.get("rental_price") ?? ""));
    const pc = parseAmount(String(formData.get("prebook_charge") ?? ""));
    const er = parseAmount(String(formData.get("extension_rate") ?? ""));
    if (rp === "invalid") errors.rental_price = "Enter a valid amount.";
    else if (rp === null) errors.rental_price = "Rental price is required.";
    else rental_price = rp;
    if (pc === "invalid") errors.prebook_charge = "Enter a valid amount.";
    else if (pc === null) errors.prebook_charge = "Pre-book charge is required.";
    else prebook_charge = pc;
    if (er === "invalid") errors.extension_rate = "Enter a valid amount.";
    else extension_rate = er;
  } else if (type === "retail") {
    const pr = parseAmount(String(formData.get("price") ?? ""));
    if (pr === "invalid") errors.price = "Enter a valid amount.";
    else if (pr === null) errors.price = "Price is required.";
    else price = pr;
  }

  const images = parseImages(String(formData.get("images_json") ?? ""));

  // Spin — optional; only validated when present.
  let spin: Spin | null = null;
  const spinRaw = String(formData.get("spin_json") ?? "").trim();
  if (spinRaw) {
    try {
      const s = JSON.parse(spinRaw);
      const basePath = String(s?.basePath ?? "").trim();
      const frames = Math.floor(Number(s?.frames));
      const arc = Number(s?.arcDegrees);
      if (basePath && Number.isFinite(frames) && frames > 0) {
        spin = {
          basePath,
          frames,
          arcDegrees: Number.isFinite(arc) && arc > 0 ? arc : 360,
          loop: !!s?.loop,
        };
      } else {
        errors.spin = "360 view needs a base path and a positive frame count.";
      }
    } catch {
      errors.spin = "360 view data is invalid.";
    }
  }

  const variants = parseVariants(String(formData.get("variants_json") ?? ""));
  for (const v of variants) {
    if (!v.colour_name) {
      errors.variants = "Every colour needs a name.";
      break;
    }
    if (!HEX.test(v.colour_hex)) {
      errors.variants = "Every colour needs a valid hex like #a1b2c3.";
      break;
    }
    if (v.price_override != null && (!Number.isFinite(v.price_override) || v.price_override < 0)) {
      errors.variants = "A colour has an invalid price override.";
      break;
    }
  }

  // Retail must keep >=1 active variant (schema comment / app rule).
  if (type === "retail" && !variants.some((v) => v.is_active)) {
    variants.push({
      colour_name: DEFAULT_VARIANT_NAME,
      colour_hex: DEFAULT_VARIANT_HEX,
      stock: {},
      price_override: null,
      is_active: true,
    });
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Please fix the highlighted fields.", errors };
  }

  // Slug uniqueness -> friendly field error, never a crash.
  const dup = id
    ? await sql<{ id: string }>`select id from products where slug = ${slug} and id <> ${id}`
    : await sql<{ id: string }>`select id from products where slug = ${slug}`;
  if (dup.length > 0) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: { slug: "That slug is already used. Choose another." },
    };
  }

  const description = JSON.stringify({ en: description_en, hi: description_hi });
  const imagesJson = JSON.stringify(images);
  const spinJson = spin ? JSON.stringify(spin) : null;

  try {
    let productId = id;
    if (!id) {
      const rows = await sql<{ id: string }>`
        insert into products
          (type, category_id, name, slug, description, occasions, images, spin,
           price, rental_price, prebook_charge, extension_rate, is_active)
        values
          (${type}, ${category_id}, ${name}, ${slug}, ${description}::jsonb,
           ${occasions}::text[], ${imagesJson}::jsonb, ${spinJson}::jsonb,
           ${price}, ${rental_price}, ${prebook_charge}, ${extension_rate}, ${is_active})
        returning id`;
      productId = rows[0].id;
    } else {
      await sql`
        update products set
          type = ${type}, category_id = ${category_id}, name = ${name}, slug = ${slug},
          description = ${description}::jsonb, occasions = ${occasions}::text[],
          images = ${imagesJson}::jsonb, spin = ${spinJson}::jsonb,
          price = ${price}, rental_price = ${rental_price},
          prebook_charge = ${prebook_charge}, extension_rate = ${extension_rate},
          is_active = ${is_active}
        where id = ${id}`;
    }

    // Variants: id -> update, no id -> insert, dropped rows -> deactivate.
    const existing = id
      ? await sql<{ id: string }>`select id from product_variants where product_id = ${productId} and is_active`
      : [];
    const existingIds = new Set(existing.map((r) => r.id));
    const keptIds = new Set(variants.filter((v) => v.id).map((v) => v.id as string));
    for (const eid of existingIds) {
      if (!keptIds.has(eid)) {
        await sql`update product_variants set is_active = false where id = ${eid}`;
      }
    }
    for (const v of variants) {
      const stockJson = JSON.stringify(v.stock);
      if (v.id && existingIds.has(v.id)) {
        await sql`
          update product_variants set
            colour_name = ${v.colour_name}, colour_hex = ${v.colour_hex},
            stock = ${stockJson}::jsonb, price_override = ${v.price_override},
            is_active = ${v.is_active}
          where id = ${v.id}`;
      } else if (!v.id) {
        await sql`
          insert into product_variants
            (product_id, colour_name, colour_hex, stock, price_override, is_active)
          values
            (${productId}, ${v.colour_name}, ${v.colour_hex}, ${stockJson}::jsonb,
             ${v.price_override}, ${v.is_active})`;
      }
    }
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "23505") {
      return {
        ok: false,
        message: "Please fix the highlighted fields.",
        errors: { slug: "That slug is already used. Choose another." },
      };
    }
    console.error("saveProduct failed", e);
    return { ok: false, message: "Could not save the product. Please try again." };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function createProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  return save(formData, null);
}

export async function updateProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing product id." };
  return save(formData, id);
}
