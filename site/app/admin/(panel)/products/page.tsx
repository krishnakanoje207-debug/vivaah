import Link from "next/link";
import { listProducts, type ListProduct } from "./data";
import { formatINR, totalStock } from "./helpers";
import type { Section } from "./types";

export const dynamic = "force-dynamic";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "rental", label: "Rentals" },
  { key: "retail", label: "Retail" },
];

export default async function AdminProductsPage() {
  const grouped = await listProducts();

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h2 text-ink-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded-control bg-violet-800 px-5 py-2.5 text-body font-semibold text-porcelain-50 transition-colors hover:bg-violet-700"
        >
          + Add product
        </Link>
      </div>

      {SECTIONS.map(({ key, label }) => (
        <section key={key} className="mt-10">
          <div className="ornament mb-4">
            <span className="eyebrow">{label}</span>
          </div>
          {grouped[key].length === 0 ? (
            <p className="text-caption text-ink-400">No {label.toLowerCase()} yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {grouped[key].map((p) => (
                <li key={p.id}>
                  <ProductRow product={p} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function ProductRow({ product: p }: { product: ListProduct }) {
  const stock = p.variants.reduce((sum, v) => sum + totalStock(v.stock), 0);
  return (
    <Link
      href={`/admin/products/${p.id}`}
      className={`flex items-center gap-4 rounded-card border border-ink-900/10 bg-white p-3 shadow-card transition-colors hover:border-violet-300 ${
        p.is_active ? "" : "opacity-55"
      }`}
    >
      <Thumb path={p.image_path} alt={p.image_alt} name={p.name} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-display text-h3 text-ink-900">{p.name}</span>
          {!p.is_active && (
            <span className="shrink-0 rounded-control bg-porcelain-200 px-2 py-0.5 text-caption text-ink-400">
              Inactive
            </span>
          )}
        </div>
        <p className="truncate text-caption text-ink-600">{p.category_name ?? "Uncategorised"}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-600">
          <span className="tabular">
            {p.type === "rental"
              ? `${formatINR(p.rental_price)} rental · ${formatINR(p.prebook_charge)} pre-book`
              : `${formatINR(p.price)}`}
          </span>
          {p.variants.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="flex -space-x-1">
                {p.variants.slice(0, 5).map((v, i) => (
                  <span
                    key={i}
                    title={v.colour_name}
                    className="h-4 w-4 rounded-full border border-white ring-1 ring-ink-900/10"
                    style={{ backgroundColor: v.colour_hex }}
                  />
                ))}
              </span>
              <span className="text-ink-400 tabular">{stock} in stock</span>
            </span>
          )}
        </div>
      </div>

      <span aria-hidden className="shrink-0 pr-1 text-ink-400">
        ›
      </span>
    </Link>
  );
}

function Thumb({ path, alt, name }: { path: string | null; alt: string | null; name: string }) {
  if (path) {
    return (
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-control border border-ink-900/10 bg-porcelain-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={path} alt={alt ?? name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-control border border-ink-900/10 bg-violet-100">
      <span className="font-display text-h3 text-violet-500">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}
