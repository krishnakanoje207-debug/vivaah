import Link from "next/link";
import type { Category } from "@/lib/categories";

// Arch category tiles (§3b, §5c) for the category-first galleries.
export function CategoryTiles({
  base,
  categories,
}: {
  base: string; // "/rentals" | "/retail"
  categories: Category[];
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((c) => (
        <li key={c.slug}>
          <Link href={`${base}?category=${c.slug}`} className="group block">
            <div className="arch relative flex aspect-[3/4] items-end overflow-hidden bg-stage shadow-card transition-shadow duration-[180ms] group-hover:shadow-lift">
              <div
                className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]"
                style={{
                  background:
                    "linear-gradient(155deg, var(--color-porcelain-100) 0%, var(--color-porcelain-200) 100%)",
                }}
                aria-hidden="true"
              />
              <span className="relative m-4 font-display text-[1.15rem] leading-tight text-ink-900">
                {c.name}
              </span>
            </div>
          </Link>
          <p className="mt-2 px-1 text-caption text-ink-400">
            {c.count > 0 ? `${c.count} piece${c.count > 1 ? "s" : ""}` : "Coming soon"}
          </p>
        </li>
      ))}
    </ul>
  );
}
