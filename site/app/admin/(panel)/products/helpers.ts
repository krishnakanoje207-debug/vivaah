// Pure helpers for the products admin. No DB / no React — safe in server and
// client modules alike.
import type { ProductFormValues } from "./types";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function totalStock(stock: Record<string, number>): number {
  return Object.values(stock).reduce((sum, n) => sum + (Number(n) || 0), 0);
}

export function formatINR(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  if (!v) return "—";
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v)}`;
}

// Blank form for the "new product" page. Retail by default keeps the pricing
// simple; the owner most often adds retail stock.
export const EMPTY_FORM: ProductFormValues = {
  name: "",
  slug: "",
  type: "rental",
  category_id: null,
  description: { en: "", hi: "" },
  occasions: [],
  images: [],
  spin: null,
  price: null,
  rental_price: null,
  prebook_charge: null,
  extension_rate: null,
  is_active: true,
  variants: [],
};
