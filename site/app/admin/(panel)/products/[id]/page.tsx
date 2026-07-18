import Link from "next/link";
import { notFound } from "next/navigation";
import { updateProduct } from "../actions";
import { getCategories, getProduct } from "../data";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProduct(id), getCategories()]);
  if (!product) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/admin/products" className="text-caption text-ink-400 hover:text-ink-600">
        ‹ Products
      </Link>
      <h1 className="mt-1 mb-6 font-display text-h2 text-ink-900">{product.name}</h1>
      <ProductForm initial={product} categories={categories} action={updateProduct} />
    </div>
  );
}
