import Link from "next/link";
import { createProduct } from "../actions";
import { getCategories } from "../data";
import { EMPTY_FORM } from "../helpers";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <div className="max-w-4xl">
      <Link href="/admin/products" className="text-caption text-ink-400 hover:text-ink-600">
        ‹ Products
      </Link>
      <h1 className="mt-1 mb-6 font-display text-h2 text-ink-900">New product</h1>
      <ProductForm initial={EMPTY_FORM} categories={categories} action={createProduct} />
    </div>
  );
}
