import type { Metadata } from "next";
import { Reveal } from "@/components/site/Reveal";
import { CategoryTiles } from "@/components/site/CategoryTiles";
import { RETAIL_CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Shop dresses & suits",
  description:
    "Shop by category — suits, kurtis, co-ord sets, kaftans and more. Reserve your size and colour, collect at the shop.",
};

export default function RetailPage() {
  return (
    <section className="bg-porcelain-50 pt-28 pb-28 md:pt-32">
      <div className="shell">
        <p className="eyebrow">The boutique</p>
        <h1 className="mt-3 max-w-2xl text-h1">Shop dresses &amp; suits</h1>
        <p className="mt-4 max-w-xl text-ink-600">
          Browse by category. Pick your colour and size, reserve online, and collect at the shop.
        </p>

        <Reveal className="mt-12">
          <div data-reveal>
            <CategoryTiles base="/retail" categories={RETAIL_CATEGORIES} />
          </div>
        </Reveal>

        <p className="mt-16 text-caption text-ink-400">
          Product listings and the colour-swatch selector arrive in a later build phase.
        </p>
      </div>
    </section>
  );
}
