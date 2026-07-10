import type { Metadata } from "next";
import { Reveal } from "@/components/site/Reveal";
import { RentalCard } from "@/components/site/RentalCard";
import { CategoryTiles } from "@/components/site/CategoryTiles";
import { RENTALS } from "@/lib/rentals";
import { RENTAL_CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Rent bridal & festive wear",
  description:
    "Browse rentals by category — lehengas, sarees, indo-western, gowns and more. Spin each piece, reserve your dates, collect at the shop.",
};

export default function RentalsPage() {
  return (
    <section className="bg-porcelain-50 pt-28 pb-28 md:pt-32">
      <div className="shell">
        <p className="eyebrow">The rental edit</p>
        <h1 className="mt-3 max-w-2xl text-h1">Rent bridal &amp; festive wear</h1>
        <p className="mt-4 max-w-xl text-ink-600">
          Drag any piece to see it from every angle. Choose your dates, pay a small advance to hold
          them, and collect at the shop.
        </p>

        {/* Categories first */}
        <Reveal className="mt-12">
          <div data-reveal>
            <CategoryTiles base="/rentals" categories={RENTAL_CATEGORIES} />
          </div>
        </Reveal>

        {/* All rentals */}
        <div className="mt-20">
          <h2 className="text-h3">All rentals</h2>
          <Reveal className="mt-8 grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {RENTALS.map((p) => (
              <div key={p.slug} data-reveal>
                <RentalCard p={p} />
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
