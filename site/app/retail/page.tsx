import type { Metadata } from "next";
import { Reveal } from "@/components/site/Reveal";
import { CategoryTiles } from "@/components/site/CategoryTiles";
import { Ornament } from "@/components/site/Ornament";
import { RETAIL_CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = {
  title: "The Boutique | Retail Collection | Vivaah Dresses and Suits",
  description:
    "Shop our permanent collection of party wear suits, one-piece dresses, and co-ord sets. Reserve your silhouette online and collect in-store.",
};

export default function RetailPage() {
  return (
    <section className="bg-porcelain-50 pt-32 pb-32 md:pt-44">
      <div className="shell">
        <div className="text-center max-w-4xl mx-auto">
          <Reveal>
            <p data-reveal className="eyebrow">
              The Boutique Collection
            </p>
            <h1 data-reveal className="mt-6 text-h1 leading-[1.05] tracking-tight">
              Curated for your <em className="italic text-gold-600">lifestyle</em>
            </h1>
            <p data-reveal className="mt-10 text-ink-600 text-[1.125rem] leading-relaxed max-w-2xl mx-auto">
              From day-wear elegance to festive soirées. Browse by silhouette, reserve your size and color online, and collect your permanent pieces at our boutique.
            </p>
          </Reveal>
        </div>

        <Ornament className="mt-20 mx-auto max-w-sm opacity-25" />

        {/* Categories Section */}
        <div className="mt-24">
          <Reveal>
            <div data-reveal className="flex items-end justify-between gap-6 border-b border-porcelain-200 pb-8 mb-16">
              <div>
                <p className="text-[0.625rem] font-medium tracking-[0.2em] uppercase text-gold-600 mb-2">Retail Categories</p>
                <h2 className="text-h2 text-ink-900">The boutique, to <em className="italic">own</em></h2>
              </div>
              <span className="hidden sm:block text-caption text-ink-400 uppercase tracking-widest italic opacity-60">Forever pieces</span>
            </div>
          </Reveal>
          
          <Reveal>
            <div data-reveal>
              <CategoryTiles base="/retail" categories={RETAIL_CATEGORIES} />
            </div>
          </Reveal>
        </div>

        {/* Phase 1 Messaging — Elevated Placeholder */}
        <div className="mt-32 pt-24 border-t border-porcelain-200 text-center">
          <Reveal>
            <div data-reveal className="max-w-xl mx-auto py-12 px-8 bg-porcelain-100/30 arch border border-porcelain-200/40">
              <span className="text-gold-500 text-2xl block mb-6">✦</span>
              <p className="font-display text-[1.35rem] text-ink-900/60 leading-relaxed italic">
                "Our digital inventory and swatch selection for the retail collection is arriving soon. Visit us in-person to browse the complete ensemble."
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
