// Shared types for the products admin (list, form, actions). Types-only module —
// safe to import from both server and client components.

export type Section = "rental" | "retail";

export type LangText = { en: string; hi: string };
export type ProductImage = { path: string; alt: string };
export type Spin = { basePath: string; frames: number; arcDegrees: number; loop: boolean };

export type VariantRow = {
  id?: string; // present => existing DB row
  colour_name: string;
  colour_hex: string;
  stock: Record<string, number>; // size -> count, e.g. {"Free size": 3} or {"S":1,"M":2}
  price_override: number | null;
  is_active: boolean;
};

export type CategoryOption = { id: string; name: string; section: Section };

// Full shape the edit page hydrates the form with.
export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  type: Section;
  category_id: string | null;
  description: LangText;
  occasions: string[];
  images: ProductImage[];
  spin: Spin | null;
  price: number | null;
  rental_price: number | null;
  prebook_charge: number | null;
  extension_rate: number | null;
  is_active: boolean;
  variants: VariantRow[];
};

// Field-level error map keyed by field name; `message` is a top-level notice.
export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
};

export const OCCASIONS = ["bridal", "sangeet", "mehendi", "reception"] as const;

// App-enforced default variant for retail products created without one
// (schema comment on product_variants: retail always has >=1 variant).
export const DEFAULT_VARIANT_NAME = "Default";
export const DEFAULT_VARIANT_HEX = "#6b21a8";

// Quick-add sizes offered in the variant stock editor.
export const QUICK_SIZES = ["Free size", "S", "M", "L", "XL"] as const;
