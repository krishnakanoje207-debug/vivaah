import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { RentalCard } from "@/components/site/RentalCard";
import { CategoryTiles } from "@/components/site/CategoryTiles";
import { Ornament } from "@/components/site/Ornament";
import { CuratedMoment } from "@/components/site/CuratedMoment";
import { getRentals, getRentalCategories } from "@/lib/rentals";

export const metadata: Metadata = {
  title: "The Bridal Rental Edit | Vivaah Dresses and Suits",
  description:
    "Browse heirloom-quality bridal lehengas, silk sarees, and festive gowns. Reserve your silhouette online and collect at our boutique.",
};

// Reads live rental data (app_public Neon connection); rendered per request.
export const dynamic = "force-dynamic";

export default async function RentalsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: slug } = await searchParams;
  const categories = await getRentalCategories();
  const category = slug ? categories.find((c) => c.slug === slug) : undefined;
  const items = await getRentals(category?.slug);

  return (
    <>
      {category && <CuratedMoment category={category} />}
      <section className="bg-porcelain-50 pt-32 pb-32 md:pt-44">
      <div className="shell">
        {/* Header Section — suppressed while a category filter is active
            (the CuratedMoment hero above stands in for it) */}
        {!category && (
          <>
            <div className="text-center max-w-4xl mx-auto">
              <Reveal>
                <p data-reveal className="eyebrow">
                  The Rental Edit
                </p>
                <h1 data-reveal className="mt-6 text-h1 leading-[1.05] tracking-tight">
                  Rent bridal &amp; <em className="italic text-gold-600">festive</em> wear
                </h1>
                <p data-reveal className="mt-10 text-ink-600 text-[1.125rem] leading-relaxed max-w-2xl mx-auto">
                  Heirloom-quality silhouettes, captured in every dimension. Choose your dates, pay a small advance to secure your look, and collect at our private boutique.
                </p>
              </Reveal>
            </div>

            <Ornament className="mt-20 mx-auto max-w-sm opacity-25" />
          </>
        )}

        {/* Categories Section — Functional and Aesthetic (doubles as filter nav) */}
        <div className={category ? "" : "mt-24"}>
          <Reveal>
            <div data-reveal className="flex items-end justify-between gap-6 border-b border-porcelain-200 pb-8 mb-16">
              <div>
                <p className="text-[0.625rem] font-medium tracking-[0.2em] uppercase text-gold-600 mb-2">Categorical Index</p>
                <h2 className="text-h2">Browse by <em className="italic">silhouette</em></h2>
              </div>
              <span className="hidden sm:block text-caption text-ink-400 uppercase tracking-widest italic opacity-60">Filtered by her perspective</span>
            </div>
          </Reveal>
          <Reveal>
            <div data-reveal>
              <CategoryTiles base="/rentals" categories={categories} />
            </div>
          </Reveal>
        </div>

        {/* The Narrative Grid — filtered to the active category, or all rentals */}
        <div id="collection" className="mt-40 pt-28 border-t border-porcelain-200">
          <Reveal>
            <div data-reveal className="mb-20">
              <p className="eyebrow">{category ? "The Collection" : "The Full Collection"}</p>
              <h2 className="mt-4 text-h2">
                {category ? (
                  <>{category.name}, to <em className="italic">rent</em></>
                ) : (
                  <>All <em className="italic">rentals</em></>
                )}
              </h2>
            </div>
          </Reveal>

          {items.length === 0 ? (
            <Reveal>
              <div data-reveal className="max-w-xl mx-auto py-12 px-8 bg-porcelain-100/30 arch border border-porcelain-200/40 text-center">
                <span className="text-gold-500 text-2xl block mb-6">✦</span>
                <p className="font-display text-[1.35rem] text-ink-900/60 leading-relaxed italic">
                  "Our {category?.name.toLowerCase()} are being photographed for the site. The rack is already waiting at the shop — <Link href="/visit" className="not-italic text-gold-600 underline decoration-gold-500/40 underline-offset-4 hover:decoration-gold-600">visit us</Link> to see this collection in person."
                </p>
              </div>
            </Reveal>
          ) : (
            <Reveal className="grid grid-cols-1 gap-x-12 gap-y-24 sm:grid-cols-2 lg:grid-cols-3 items-start">
              {items.map((p, i) => (
                <div
                  key={p.slug}
                  data-reveal
                  className={i % 3 === 1 ? "lg:mt-32" : i % 3 === 2 ? "lg:mt-16" : ""}
                >
                  <RentalCard p={p} />
                </div>
              ))}

              {/* Editorial Interlude */}
              <div data-reveal className="hidden lg:flex aspect-[3/4] items-center justify-center bg-porcelain-100/40 arch border border-porcelain-200/50 p-16 text-center group relative overflow-hidden">
                 <div className="absolute inset-0 bg-violet-950/[0.01] group-hover:bg-violet-950/[0.03] transition-colors duration-700" />
                 <div className="relative z-10">
                   <span className="text-gold-500 text-3xl block mb-8 opacity-60">✦</span>
                   <p className="font-display text-[1.625rem] leading-[1.4] italic text-ink-900/70 group-hover:text-ink-900 transition-colors duration-700">
                     "A bride is not just dressed; she is <em className="not-italic">adorned</em>."
                   </p>
                 </div>
              </div>
            </Reveal>
          )}
        </div>
      </div>
      </section>
    </>
  );
}
