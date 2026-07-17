import Link from "next/link";
import type { Category } from "@/lib/categories";

/**
 * Editorial Category Tiles (§3b, §5c).
 * Displays categories as staggered jharokha arches with archival imagery.
 * Alternates vertical offsets to create an organic, non-template rhythm.
 */
export function CategoryTiles({
  base,
  categories,
}: {
  base: string; // "/rentals" | "/retail"
  categories: Category[];
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-8 gap-y-16 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((c, i) => {
        // Create an organic staggered effect: push cards down based on index
        const staggerClass = i % 4 === 1 ? "lg:mt-12" : i % 4 === 3 ? "lg:mt-24" : i % 4 === 2 ? "lg:mt-6" : "";
        
        return (
          <li key={c.slug} className={staggerClass}>
            <Link href={`${base}?category=${c.slug}`} className="group block">
              <div className="arch relative flex aspect-[3/4] items-end overflow-hidden bg-stage shadow-card transition-all duration-500 group-hover:shadow-lift group-hover:-translate-y-1.5">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.image}
                    alt={c.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div
                    className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.03]"
                    style={{
                      background:
                        "linear-gradient(155deg, var(--color-porcelain-100) 0%, var(--color-porcelain-200) 100%)",
                    }}
                    aria-hidden="true"
                  />
                )}
                
                {/* Overlay for text legibility — using brand violet tones */}
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/70 via-violet-950/10 to-transparent opacity-90 group-hover:from-violet-950/80 transition-all duration-500" />
                
                <div className="relative m-6 w-full">
                  <span className="block font-display text-[1.375rem] leading-tight text-porcelain-50">
                    {c.name}
                  </span>
                  
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-porcelain-50/10 pt-3 transition-all duration-500 group-hover:border-gold-500/30">
                    <span className="text-[0.625rem] font-medium tracking-[0.2em] uppercase text-violet-300">
                      {c.count > 0 ? `${c.count} piece${c.count > 1 ? "s" : ""}` : "Coming soon"}
                    </span>
                    <span className="text-[0.6rem] text-gold-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100">✦</span>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
