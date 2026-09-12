import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { RentalCard } from "@/components/site/RentalCard";
import { PendingCard } from "@/components/site/PendingCard";
import { CategoryTiles } from "@/components/site/CategoryTiles";
import { Ornament } from "@/components/site/Ornament";
import { CuratedMoment } from "@/components/site/CuratedMoment";
import { Threshold } from "@/components/site/Threshold";
import { RoomIndex } from "@/components/site/RoomIndex";
import { PatternSeam } from "@/components/site/PatternSeam";
import { CountFigure } from "@/components/site/CountFigure";
import { DistortHeading } from "@/components/site/DistortHeading";
import { Parallax } from "@/components/site/Parallax";
import { WipeIn } from "@/components/site/WipeIn";
import { SectionEdge } from "@/components/site/SectionEdge";
import { GoldFrame } from "@/components/site/GoldFrame";
import { SHOP } from "@/lib/site";
import { getRentals, getRentalCategories } from "@/lib/rentals";

/**
 * Rentals — grammar: "Threshold and rooms" (specs/DESIGN_SPEC_V3.md §2).
 *
 * The grammar moved here from the home page on the owner's decision, 9 Sep 2026:
 * its argument (the week she is dressing for, what owning costs, how the piece
 * was made) is a case for renting rather than buying, which is this page's job
 * and not the front door's. The home page is being rebuilt separately.
 *
 *   Room           Ground          Material              Device
 *   Threshold      violet-950      film                  scrub  (the only one)
 *   I  The week    porcelain-50    silk, photographed    flow + in
 *   II arithmetic  porcelain-100   figures, type         count
 *   III The craft  stage           thread, macro         signature move + parallax
 *   The collection porcelain-50    the catalogue         reveal per object
 *   Visit          violet-950      still                 flow
 *
 * A category filter (`?category=`) skips the argument entirely: someone who has
 * already chosen a silhouette is browsing, not being persuaded, so the page
 * opens on CuratedMoment and goes straight to the catalogue.
 */

export const metadata: Metadata = {
  title: "The Bridal Rental Edit | Vivaah Dresses and Suits",
  description:
    "Bridal lehengas, silk sarees and festive gowns to rent for the days they are needed. Reserve your dates and collect at the shop.",
};

// Reads live rental data (app_public Neon connection); rendered per request.
export const dynamic = "force-dynamic";

const ROOMS = [
  { id: "threshold", label: "Threshold" },
  { id: "week", label: "The week" },
  { id: "arithmetic", label: "The arithmetic" },
  { id: "craft", label: "The craft" },
  { id: "collection", label: "The collection" },
  { id: "visit", label: "Visit" },
] as const;

// TODO(owner): confirm the purchase figure. It is a typical market price for a
// bridal lehenga, not a number of the shop's own, and §2.6 allows real figures
// only. The rental figure beside it is live from the catalogue.
const TYPICAL_PURCHASE_PRICE = 80_000;

export default async function RentalsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: slug } = await searchParams;
  const categories = await getRentalCategories();
  const category = slug ? categories.find((c) => c.slug === slug) : undefined;
  const items = await getRentals(category?.slug);
  // Nothing photographed yet in these; they stand in so the collection shows all
  // eight silhouettes rather than the three that happen to have pictures.
  const pendingCategories = categories.filter((c) => c.count === 0);

  const rentFrom = items
    .map((p) => p.pricePerDay)
    .filter((n): n is number => typeof n === "number" && n > 0)
    .sort((a, b) => a - b)[0];

  const catalogue = (
    <>
      {/* Garments first, the index after (owner, 12 Sep 2026).
          The categorical index used to open this block with the catalogue
          underneath it, which put a grid of eight tiles between a reader and the
          first thing she could actually rent — and with three pieces in the
          catalogue it made a full shop read as an empty one. The tiles are a
          filter, and a filter belongs beside what it filters, not in front of
          it. */}
      <div>
        <Reveal>
          <div data-reveal className="mb-12 md:mb-20">
            <p className="eyebrow">{category ? "The collection" : "The full collection"}</p>
            <h2 className="mt-4 text-h2">
              {category ? (
                <>
                  {category.name}, to <em className="italic">rent</em>
                </>
              ) : (
                <>
                  All <em className="italic">rentals</em>
                </>
              )}
            </h2>
          </div>
        </Reveal>

        {items.length === 0 ? (
          <Reveal>
            <div
              data-reveal
              className="arch mx-auto max-w-xl border border-porcelain-200/40 bg-porcelain-100/30 px-8 py-12 text-center"
            >
              <span aria-hidden="true" className="mb-6 block text-2xl text-gold-600">✦</span>
              <p className="font-display text-[1.35rem] italic leading-relaxed text-ink-900/60">
                &ldquo;Our {category?.name.toLowerCase()} are being photographed for the site. The
                rack is already waiting at the shop.{" "}
                <Link
                  href="/visit"
                  className="not-italic text-gold-700 underline decoration-gold-500/40 underline-offset-4 hover:decoration-gold-600"
                >
                  Visit us
                </Link>{" "}
                to see this collection in person.&rdquo;
              </p>
            </div>
          </Reveal>
        ) : (
          /* The collection's device: a wipe per object (§2.6). Each card comes
             off the rail on its own beat, and the lg offsets keep the three
             columns from arriving as a row. */
          <WipeIn className="grid grid-cols-1 items-start gap-x-12 gap-y-14 sm:grid-cols-2 sm:gap-y-24 lg:grid-cols-3">
            {items.map((p, i) => (
              <div
                key={p.slug}
                data-wipe
                className={i % 3 === 1 ? "lg:mt-32" : i % 3 === 2 ? "lg:mt-16" : ""}
              >
                <RentalCard p={p} />
              </div>
            ))}

            {/* The categories still waiting on photography, shown only in the
                unfiltered collection. A filtered view already has its own, more
                specific empty state ("Our X are being photographed…"), and
                repeating the whole set inside one category's page would say
                nothing about that category. */}
            {!category &&
              pendingCategories.map((c, i) => {
                const n = items.length + i;
                return (
                  <div
                    key={c.slug}
                    data-wipe
                    className={n % 3 === 1 ? "lg:mt-32" : n % 3 === 2 ? "lg:mt-16" : ""}
                  >
                    <PendingCard category={c} />
                  </div>
                );
              })}

            <div
              data-wipe
              className="arch group relative hidden aspect-[3/4] items-center justify-center overflow-hidden border border-porcelain-200/50 bg-porcelain-100/40 p-16 text-center lg:flex"
            >
              <div className="absolute inset-0 bg-violet-950/[0.01] transition-colors duration-700 group-hover:bg-violet-950/[0.03]" />
              <div className="relative z-10">
                <span aria-hidden="true" className="mb-8 block text-3xl text-gold-600 opacity-60">✦</span>
                <p className="font-display text-[1.625rem] italic leading-[1.4] text-ink-900/70 transition-colors duration-700 group-hover:text-ink-900">
                  &ldquo;A bride is not just dressed; she is{" "}
                  <em className="not-italic">adorned</em>.&rdquo;
                </p>
              </div>
            </div>
          </WipeIn>
        )}
      </div>

      {/* The categorical index, now below the garments it filters. The ✦
          hairline is the seam between them, as it is between every other band
          on this site. Hidden inside a filtered view: the tiles are how you get
          OUT of a category, and the CuratedMoment head above already carries
          that, so repeating all eight here would just restate the filter. */}
      {!category && (
        <div className="mt-20 md:mt-40">
          <Ornament className="mx-auto max-w-sm opacity-25" />
          <Reveal>
            <div
              data-reveal
              className="mb-10 mt-16 flex items-end justify-between gap-6 border-b border-porcelain-200 pb-8 md:mb-16 md:mt-28"
            >
              <div>
                <p className="eyebrow mb-2">Categorical index</p>
                <h2 className="text-h2">
                  Browse by <em className="italic">silhouette</em>
                </h2>
              </div>
              <span className="hidden text-caption uppercase italic tracking-widest text-ink-600 opacity-60 sm:block">
                Filtered by her perspective
              </span>
            </div>
          </Reveal>
          {/* One tile at a time: `CategoryTiles` carries its own reveal per
              object, so there is no wrapper Reveal here to fade the whole grid
              up as one. */}
          <CategoryTiles base="/rentals" categories={categories} />
        </div>
      )}
    </>
  );

  // Filtered browsing: no argument, no room index, straight to the rack.
  if (category) {
    return (
      <>
        <CuratedMoment category={category} />
        {/* The filtered rack. It carries the site's boundary too: the hero's
            violet is torn away rather than meeting the paper along a straight
            line, which is the one seam this branch was missing. `#collection`
            is the anchor CuratedMoment's "View the collection" points at. */}
        <section
          id="collection"
          className="relative scroll-mt-16 bg-porcelain-50 pb-20 pt-24 md:pb-32 md:pt-28"
        >
          <SectionEdge
            seed={6}
            paper="var(--color-violet-950)"
            reveal="var(--color-porcelain-50)"
          />
          {/* Positioned, so the tear's curls pass behind the first line of type
              rather than over it: the band hangs ~64px into the room on a phone
              and ~93px from md up. */}
          <div className="shell relative">{catalogue}</div>
        </section>
      </>
    );
  }

  return (
    <>
      <RoomIndex rooms={ROOMS} />
      <Threshold
        line={
          <>
            Worn for the days <em className="italic">it is needed</em>
          </>
        }
      />

      {/* ============ ROOM I: THE WEEK ============
          porcelain-50 · silk, photographed · flow + in */}
      <section id="week" data-room="week" className="relative bg-porcelain-50 py-16 md:py-24">
        <SectionEdge seed={1} paper="var(--color-violet-950)" reveal="var(--color-porcelain-50)" />
        {/* Positioned, so the tear's curls pass behind the room's first line of
            type instead of over it (the band hangs ~64px in on a phone). */}
        <div className="shell shell-rooms relative">
          <Reveal className="grid items-center gap-14 md:grid-cols-2 md:gap-20">
            <div data-reveal>
              <p className="eyebrow">The week</p>
              <h2 className="mt-5 text-h2">Everything is decided at once</h2>
              <p className="mt-7 max-w-[44ch] leading-relaxed text-ink-600">
                Sangeet on the Thursday. The wedding on the Saturday. A reception nobody
                has thought about yet, because there has not been an hour to.
              </p>
              <p className="mt-4 max-w-[44ch] leading-relaxed text-ink-600">
                Somewhere in that week you are expected to look like the photographs will
                be looked at for thirty years.
              </p>
            </div>
            {/* The room's material: silk, photographed. */}
            <figure data-reveal>
              {/* The keyline marks the one plate this room is asking you to look
                  at. Used sparingly on purpose (see GoldFrame). */}
              <GoldFrame>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/categories/side-lehengas.jpg"
                  alt="A side lehenga in silk, photographed on the wearer"
                  className="aspect-[4/5] w-full bg-stage object-cover"
                />
              </GoldFrame>
              <figcaption className="mt-4 text-caption text-ink-600">
                Reserved by the date, returned after the day it was needed.
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ============ ROOM II: THE ARITHMETIC ============
          porcelain-100 · figures, type · count */}
      <section id="arithmetic" data-room="arithmetic" className="relative bg-porcelain-100 py-16 md:py-24">
        <SectionEdge seed={2} paper="var(--color-porcelain-50)" reveal="var(--color-porcelain-100)" />
        <div className="shell shell-rooms relative">
          <Reveal>
            <p data-reveal className="eyebrow">The arithmetic</p>
            <h2 data-reveal className="mt-5 max-w-[18ch] text-h2">
              What it costs to own it
            </h2>
            <p data-reveal className="mt-7 max-w-[46ch] leading-relaxed text-ink-600">
              A bridal lehenga is bought once, worn once, and folded into a steel almirah
              for the rest of its life.
            </p>
          </Reveal>

          <div className="mt-14 flex flex-wrap gap-x-10 gap-y-8 sm:gap-x-20 sm:gap-y-10">
            <div>
              <p className="text-eyebrow uppercase tracking-[0.17em] text-ink-600">To buy</p>
              <CountFigure
                value={TYPICAL_PURCHASE_PRICE}
                prefix="₹"
                className="mt-2 font-display text-h1 leading-none"
              />
            </div>
            <div>
              <p className="text-eyebrow uppercase tracking-[0.17em] text-ink-600">Times worn</p>
              <CountFigure value={1} className="mt-2 font-display text-h1 leading-none" />
            </div>
            {rentFrom ? (
              <div>
                <p className="text-eyebrow uppercase tracking-[0.17em] text-ink-600">
                  To rent, from
                </p>
                <CountFigure
                  value={rentFrom}
                  prefix="₹"
                  className="mt-2 font-display text-h1 leading-none text-gold-600"
                />
              </div>
            ) : null}
          </div>

          <p className="mt-12 max-w-[54ch] text-caption text-ink-600">
            The purchase figure is a typical market price for a bridal lehenga. The rental
            figure is ours, and current.
          </p>
        </div>
      </section>

      {/* ============ ROOM III: THE CRAFT ============
          stage · thread, macro · signature move + parallax · THE PEAK */}
      <section id="craft" data-room="craft" className="relative bg-stage py-20 md:py-32">
        <SectionEdge seed={3} paper="var(--color-porcelain-100)" reveal="var(--color-stage)" />
        <div className="shell shell-rooms relative">
          <div className="grid items-center gap-14 md:grid-cols-2 md:gap-20">
            <Parallax distance={44}>
              <Reveal>
                <p data-reveal className="eyebrow">The craft</p>
                <div data-reveal>
                  <DistortHeading className="mt-5 max-w-[16ch] text-h2">
                    We know how it was made
                  </DistortHeading>
                </div>
                <p data-reveal className="mt-7 max-w-[42ch] leading-relaxed text-ink-600">
                  Drag the seam. The photograph resolves into the garment&rsquo;s own draft:
                  the panel seams, the hem, the placement of every motif.
                </p>
                <p data-reveal className="mt-4 max-w-[42ch] text-caption text-ink-600">
                  Drawn from the piece itself, not an illustration of it. Arrow keys move
                  the seam if you would rather not drag.
                </p>
              </Reveal>
            </Parallax>

            <PatternSeam
              photo="/categories/bridal-lehengas.jpg"
              draft="/flagship/draft-lehenga.png"
              alt="Bridal lehenga in red and gold, worn with a matching dupatta"
            />
          </div>
        </div>
      </section>

      {/* ============ THE COLLECTION ============
          porcelain-50 · the catalogue · reveal per object */}
      <section id="collection" data-room="collection" className="relative bg-porcelain-50 py-16 md:py-24">
        <SectionEdge seed={4} paper="var(--color-stage)" reveal="var(--color-porcelain-50)" />
        <div className="shell shell-rooms relative">
          <Reveal>
            <div data-reveal className="mx-auto max-w-3xl text-center">
              <p className="eyebrow">The rental edit</p>
              <h2 className="mt-6 text-h2 leading-[1.05]">
                Rent bridal &amp; <em className="italic text-gold-600">festive</em> wear
              </h2>
              <p className="mt-8 text-[1.0625rem] leading-relaxed text-ink-600">
                Choose your dates, pay a small advance to hold the piece, and collect it at
                the shop.
              </p>
            </div>
          </Reveal>
          <Ornament className="mx-auto mt-10 max-w-sm opacity-25 md:mt-16" />
          <div className="mt-14 md:mt-24">{catalogue}</div>
        </div>
      </section>

      {/* ============ VISIT ============
          violet-950 · still · flow. The threshold's ground, no longer moving. */}
      <section
        id="visit"
        data-room="visit"
        data-dark=""
        className="on-dark grain relative bg-violet-950 py-20 text-porcelain-50 md:py-44"
      >
        <SectionEdge seed={5} paper="var(--color-porcelain-50)" reveal="var(--color-violet-950)" />
        <div className="shell shell-rooms relative">
          <Reveal>
            <div data-reveal>
              <DistortHeading className="max-w-[16ch] text-h2 text-porcelain-50">
                Come and see it on
              </DistortHeading>
            </div>
            <p data-reveal className="mt-8 max-w-[44ch] leading-relaxed text-violet-300">
              Bring the date you are dressing for. We will put the pieces on you, and hold
              whichever one you choose for that week.
            </p>
            <p data-reveal className="mt-10 text-[0.9375rem] text-violet-300">
              {SHOP.address} · <span className="tabular">{SHOP.hours}</span>
            </p>
            <p data-reveal className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              <Link
                href="/visit"
                className="text-gold-500 underline decoration-gold-500/50 underline-offset-[5px]"
              >
                How to find us
              </Link>
              <a
                href={SHOP.mapsUrl}
                className="text-gold-500 underline decoration-gold-500/50 underline-offset-[5px]"
              >
                Open in maps
              </a>
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
