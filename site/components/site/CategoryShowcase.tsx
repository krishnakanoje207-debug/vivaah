"use client";

import Link from "next/link";
import { useRef } from "react";
import { Reveal } from "@/components/site/Reveal";
import {
  RENTAL_CATEGORIES,
  RETAIL_CATEGORIES,
  type Category,
} from "@/lib/categories";

/**
 * "Browse by category" big-card section (CATEGORY_IMMERSION_PLAN W6).
 * Fluid-Saree big-card treatment (§3b arch, porcelain-50 Fraunces titles over a
 * violet scrim), split into two rails — one per business. Rent → /rentals,
 * Buy → /retail. Titles are bottom-anchored over a bottom gradient so the
 * porcelain-50 / violet-950 AA pair holds over any thumbnail.
 */
function CategoryRail({
  label,
  base,
  categories,
}: {
  label: string;
  base: string; // "/rentals" | "/retail"
  categories: Category[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-card]");
    const amount = card ? (card.offsetWidth + 24) * 2 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <Reveal className="mt-16 shell first:mt-14">
      <div data-reveal className="flex items-end justify-between gap-6">
        <h3 className="font-display text-[1.75rem] italic leading-none text-ink-900">
          {label}
        </h3>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            aria-label={`Scroll ${label} left`}
            onClick={() => scrollByCard(-1)}
            className="grid h-10 w-10 place-items-center rounded-full border border-porcelain-200 bg-porcelain-100 text-ink-900 transition-colors hover:border-gold-600 hover:bg-porcelain-50"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label={`Scroll ${label} right`}
            onClick={() => scrollByCard(1)}
            className="grid h-10 w-10 place-items-center rounded-full border border-porcelain-200 bg-porcelain-100 text-ink-900 transition-colors hover:border-gold-600 hover:bg-porcelain-50"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        data-reveal
        className="mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`${base}?category=${c.slug}`}
            data-card
            className="group relative block aspect-[3/4] w-[64%] flex-none snap-start overflow-hidden arch bg-stage shadow-card transition-shadow duration-500 hover:shadow-lift sm:w-[288px]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.image}
              alt={c.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-violet-950/80 via-violet-950/15 to-transparent transition-colors duration-500 group-hover:from-violet-950/90" />
            <h4 className="absolute inset-x-0 bottom-0 m-6 font-display text-[1.6rem] leading-tight text-porcelain-50">
              {c.name}
            </h4>
          </Link>
        ))}
      </div>
    </Reveal>
  );
}

export function CategoryShowcase() {
  return (
    <section className="bg-porcelain-50 py-24 md:py-36">
      <Reveal className="shell">
        <p data-reveal className="eyebrow">
          The full wardrobe
        </p>
        <h2 data-reveal className="mt-4 text-h2">
          Browse by <em className="italic">category</em>
        </h2>
        <p
          data-reveal
          className="mt-6 max-w-xl text-ink-600 leading-relaxed text-[1.0625rem]"
        >
          Every silhouette we carry, sorted the way you shop — pieces to rent for
          the occasion, and pieces to make your own.
        </p>
      </Reveal>

      <CategoryRail label="To rent" base="/rentals" categories={RENTAL_CATEGORIES} />
      <CategoryRail label="To own" base="/retail" categories={RETAIL_CATEGORIES} />
    </section>
  );
}
