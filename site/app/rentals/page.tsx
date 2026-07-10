import type { Metadata } from "next";
import { Reveal } from "@/components/site/Reveal";
import { RentalCard } from "@/components/site/RentalCard";
import { RENTALS } from "@/lib/rentals";
import { OCCASIONS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Lehengas on rent",
  description: "Browse bridal lehengas for rent — spin each one, reserve your dates, collect at the shop.",
};

export default function RentalsPage() {
  return (
    <section className="bg-silk-50 pt-28 pb-28 md:pt-32">
      <div className="shell">
        <p className="eyebrow">The rental edit</p>
        <h1 className="mt-3 max-w-2xl text-h1">Lehengas on rent</h1>
        <p className="mt-4 max-w-xl text-ink-600">
          Drag any lehenga to see it from every angle. Choose your dates, pay a small advance to
          hold them, and collect at the shop.
        </p>

        {/* Occasion filter — visual only in Preview 0 (wired to data in Phase 1) */}
        <ul className="mt-8 flex flex-wrap gap-2">
          <li>
            <span className="inline-flex rounded-full bg-ink-900 px-4 py-2 text-[0.875rem] text-silk-50">
              All
            </span>
          </li>
          {OCCASIONS.map((o) => (
            <li key={o}>
              <span className="inline-flex rounded-full border border-silk-200 bg-silk-100 px-4 py-2 text-[0.875rem] text-ink-600">
                {o}
              </span>
            </li>
          ))}
        </ul>

        <Reveal className="mt-12 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {RENTALS.map((p) => (
            <div key={p.slug} data-reveal>
              <RentalCard p={p} />
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
