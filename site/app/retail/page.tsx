import type { Metadata } from "next";
import Link from "next/link";
import { SectionEdge } from "@/components/site/SectionEdge";
import { RequestButton } from "@/components/site/RequestButton";
import { GoldFrame } from "@/components/site/GoldFrame";
import { RippleHeading } from "@/components/site/RippleHeading";
import { Reveal } from "@/components/site/Reveal";
import { WipeIn } from "@/components/site/WipeIn";
import { Parallax } from "@/components/site/Parallax";
import { RETAIL_CATEGORIES } from "@/lib/categories";
import { SHOP } from "@/lib/site";

/**
 * The retail listing page — the half of the shop you keep.
 *
 * Built 9 Sep 2026 from the Kombai canvas against `specs/KOMBAI_RETAIL_PROMPT.md`
 * and the shared contract. Variant A ("daylight catalogue, arch mosaic") is the
 * base, because the prompt makes the category grid the page's spine and A is the
 * only variant that answers it with a real composition rather than eight tiles of
 * one size. Two sections are lifted from variant B, noted at their own comments:
 * the sideways "how reserving works" split, and the single-row cross-sell band.
 *
 * Everything the previous page said is gone. "Curated for your lifestyle", "The
 * Boutique Collection" and "day-wear elegance to festive soirées" are the exact
 * register the owner has twice rejected.
 *
 * Grammar. This is a catalogue, not an essay, so it does not run the landing
 * page's hero → story → three doors → proof → close rhythm, and it borrows none
 * of `/rentals`' devices (no scrubbed film, no room index, no draggable seam).
 * It is quicker: five sections, four of them light.
 *
 *   Section     Ground          Composition                    Device
 *   Head        porcelain-50    type left, arch strip right     ripple + parallax
 *   Categories  porcelain-100   12-column mosaic, mixed spans   wipe per tile
 *   Reserving   stage           35/65 sideways, steps across    reveal
 *   Rentals     violet-950      one row, eyebrow to image       reveal
 *   Close       porcelain-50    reading shell, capped plate     gold frame
 *
 * Boundaries are torn, never blended: `SectionEdge` at each seam, the two grounds
 * still meeting along one hard edge.
 *
 * No data layer. Tiles link to `/retail?category=<slug>` as the prompt specifies;
 * the filtered view is Phase 1 work and this file reads no search params.
 */

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Suits, kurtis, co-ord sets and kaftans to keep. Reserve a piece online, come in, try it on and take it home. Nothing is posted.",
};

// The plain statement of the model, near the top, as a horizontal rail rather
// than a paragraph. Deliberately facts about the shop and not the four steps:
// the steps have their own section further down and saying them twice would make
// the head read as a table of contents for it.
const FACTS = [
  "Eight categories",
  "New pieces most days",
  "Reserve online, collect at the shop",
  "Nothing is posted",
];

/**
 * The mosaic. Keyed by slug rather than by index so reordering `lib/categories`
 * cannot silently scramble the composition, and so a category added later gets a
 * sane default instead of an undefined span.
 *
 * The spans total 12 per row (5+4+3, 3+6+3, 7+5) and the aspect ratios change
 * with them, which is what stops eight tiles reading as eight squares. `end`
 * drops a tile to the bottom of its row, so every row has a horizon its captions
 * sit on and the raggedness is at the top where it reads as composition.
 */
type Tile = { span: string; media: string; arch?: boolean; end?: boolean };
const TILE: Record<string, Tile> = {
  "three-piece-suits": { span: "md:col-span-5", media: "aspect-[3/4]", arch: true },
  "party-wear-suits": { span: "md:col-span-4", media: "aspect-[3/4]", end: true },
  "one-piece": { span: "md:col-span-3", media: "aspect-[3/4]", end: true },
  "short-kurtis": { span: "md:col-span-3", media: "aspect-square", end: true },
  "co-ord-sets": { span: "md:col-span-6", media: "aspect-[3/2]" },
  "night-suits": { span: "md:col-span-3", media: "aspect-square", end: true },
  // No arch here: the shape is a jharokha, and on a 3:2 landscape box its dome
  // flattens into a wide blob. It stays on the portrait plates only.
  "kurta-pant-sets": { span: "md:col-span-7", media: "aspect-[3/2]" },
  kaftans: { span: "md:col-span-5", media: "aspect-[4/3]", end: true },
};
const TILE_DEFAULT: Tile = { span: "md:col-span-4", media: "aspect-[3/4]" };

// Four steps, honestly told. No payment word beyond the counter, no delivery,
// no basket: the verb is reserve and the place is the shop.
const STEPS = [
  {
    title: "Reserve online",
    body: "Pick the piece and the size. Nothing is paid online.",
  },
  {
    title: "We hold it",
    body: "It comes off the rail and waits under your name.",
  },
  {
    title: "Come in and try it on",
    body: "Fitting happens in the shop. Small alterations are pinned there.",
  },
  {
    title: "Take it home",
    body: "Pay at the counter and it is yours. It does not come back.",
  },
];

export default function RetailPage() {
  return (
    <>
      {/* ---------- Head: the model, stated plainly -------------------------
          Type left, a strip of three arches right. The arches are staggered on
          desktop so the right column is a composition and not a filmstrip; on a
          phone the offsets drop and it is a plain three-up. */}
      <section className="relative bg-porcelain-50 pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="shell-wide">
          {/* An even split, not 55/45: the text measure caps at 48ch and the
              heading at 16ch, so a wider left column only opens a dead band
              between the sentence and the arches beside it. */}
          <div className="grid items-start gap-12 md:grid-cols-2 lg:gap-14">
            <div>
              <p className="eyebrow">Retail</p>

              <RippleHeading
                as="h1"
                className="mt-6 max-w-[16ch] text-h1 text-ink-900"
              >
                Reserve online. Collect at the shop.
              </RippleHeading>

              <p className="mt-8 max-w-[48ch] text-ink-600">
                The half of the shop you keep. Suits, kurtis, co-ord sets and
                kaftans. Reserve a piece online, come in, try it on and take it
                home.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#categories"
                  className="rounded-control bg-violet-800 px-6 py-3 font-medium text-porcelain-50 transition-colors duration-[180ms] hover:bg-violet-700"
                >
                  See the categories
                </a>
                <Link
                  href="/visit"
                  className="rounded-control border border-ink-900/20 px-6 py-3 font-medium text-ink-900 transition-colors duration-[180ms] hover:border-ink-900/40"
                >
                  Plan a visit
                </Link>
              </div>

              <p className="mt-6 max-w-[52ch] text-caption text-ink-600">
                The reservation holds the piece. The shop is where you take it
                home.
              </p>
            </div>

            <Parallax distance={26}>
              <div className="grid grid-cols-3 gap-4 lg:gap-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/categories/short-kurtis.webp"
                  alt=""
                  className="arch aspect-[3/4] w-full bg-porcelain-200 object-cover md:mt-14"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/categories/co-ord-sets.webp"
                  alt=""
                  className="arch aspect-[3/4] w-full bg-porcelain-200 object-cover"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/categories/kaftans.webp"
                  alt=""
                  className="arch aspect-[3/4] w-full bg-porcelain-200 object-cover md:mt-24"
                />
              </div>
            </Parallax>
          </div>

          {/* The rail. It runs the full width of the wide shell on purpose: it
              is the one horizontal line in the head and it ties the two columns
              together underneath. */}
          <Reveal
            as="ul"
            className="mt-16 grid grid-cols-1 border-y border-ink-900/10 sm:grid-cols-2 md:mt-20 md:grid-cols-4"
          >
            {FACTS.map((f, i) => (
              <li
                key={f}
                data-reveal
                className={`flex items-baseline gap-3 py-4 sm:px-6 md:py-5 ${
                  i === 0 ? "sm:pl-0" : "sm:border-l sm:border-ink-900/10"
                }`}
              >
                <span className="text-caption text-gold-700" aria-hidden="true">
                  ✦
                </span>
                <span className="text-ink-900">{f}</span>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------- The categories: the page's spine ------------------------
          Variant A's mosaic. Eight tiles, five widths, four aspect ratios, two
          arches, three tiles hung from the bottom of their row. It survives a
          swap to the owner's photography because nothing depends on where the
          subject sits in the frame: every tile is `object-cover` in a box whose
          proportions are set here, not by the file. */}
      <section
        id="categories"
        className="relative scroll-mt-20 bg-porcelain-100 pt-24 pb-24 md:pt-32 md:pb-32"
      >
        <SectionEdge
          seed={21}
          paper="var(--color-porcelain-50)"
          reveal="var(--color-porcelain-100)"
        />

        <div className="shell-wide">
          <div className="grid items-end gap-8 md:grid-cols-[1.3fr_1fr] lg:gap-16">
            <div>
              <p className="eyebrow">Eight categories</p>
              <RippleHeading className="mt-5 text-h2 text-ink-900">
                What is on the rail.
              </RippleHeading>
            </div>
            <p className="max-w-[44ch] text-ink-600 md:pb-2">
              New pieces most days. What is here this week was not here last
              month. Every category is reserved online and collected at the shop.
            </p>
          </div>

          <WipeIn className="mt-14 grid grid-cols-1 gap-x-6 gap-y-12 md:mt-16 md:grid-cols-12 md:gap-y-14">
            {RETAIL_CATEGORIES.map((c, i) => {
              const t = TILE[c.slug] ?? TILE_DEFAULT;
              return (
                <Link
                  key={c.slug}
                  href={`/retail?category=${c.slug}`}
                  data-wipe
                  className={`group block ${t.span} ${t.end ? "md:self-end" : ""}`}
                >
                  <div
                    className={`overflow-hidden bg-porcelain-200 ${
                      t.arch ? "arch" : "rounded-card"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.image}
                      alt=""
                      className={`w-full object-cover transition-transform duration-[180ms] group-hover:scale-[1.03] ${t.media}`}
                    />
                  </div>
                  <div className="mt-5 flex items-baseline gap-5">
                    <span className="tabular text-caption text-gold-700">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-h3 text-ink-900 transition-colors duration-[180ms] group-hover:text-violet-700">
                      {c.name}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </WipeIn>
        </div>
      </section>

      {/* ---------- How reserving works -------------------------------------
          Lifted from variant B. Variant A stacked a heading above four columns,
          which is the same shape as every other section on the site; this puts
          the heading in a narrow column and runs the four steps across the wide
          two thirds beside it, which is what §H.1 asks for. The gold hairline
          with its four marks is the only ornament in the section. */}
      <section className="relative bg-stage pt-24 pb-24 md:pt-32 md:pb-32">
        <SectionEdge
          seed={22}
          paper="var(--color-porcelain-100)"
          reveal="var(--color-stage)"
        />

        <div className="shell-wide grid items-start gap-12 md:grid-cols-[minmax(0,34fr)_minmax(0,66fr)] lg:gap-20">
          <div>
            <p className="eyebrow">How reserving works</p>
            <RippleHeading className="mt-5 text-h2 text-ink-900">
              Four steps.
            </RippleHeading>
            <p className="mt-6 max-w-[36ch] text-ink-600">
              Nothing is posted. The reservation holds the piece, and the shop is
              where it finishes.
            </p>
          </div>

          {/* The gold hairline is the container's own top border, so it cannot
              drift out of register with the columns hanging from it. A floating
              rule with marks at thirds was the first attempt and it lined up
              with nothing. */}
          <Reveal
            as="ul"
            className="grid gap-8 border-t border-gold-600/50 pt-8 sm:grid-cols-2 md:grid-cols-4 lg:gap-10"
          >
            {STEPS.map((s, i) => (
              <li key={s.title} data-reveal>
                <span className="tabular text-caption text-gold-700">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-h3 text-ink-900">{s.title}</h3>
                <p className="mt-2 text-caption text-ink-600">{s.body}</p>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------- The doorway to rentals ----------------------------------
          Variant B's version: one row, read left to right, eyebrow to sentence
          to link to a single small plate. The page's only dark beat, and it is
          deliberately one line tall so it reads as a door and not as a pitch. */}
      <section className="grain on-dark relative bg-violet-950 py-12 md:py-16">
        <SectionEdge
          seed={23}
          paper="var(--color-stage)"
          reveal="var(--color-violet-950)"
        />

        <Reveal className="shell-wide relative grid items-center gap-8 md:grid-cols-12 md:gap-10">
          <p data-reveal className="eyebrow md:col-span-2">
            Rentals
          </p>

          <h2
            data-reveal
            className="text-h3 text-porcelain-50 md:col-span-5"
          >
            Some pieces are for keeping. Some are for one week only.
          </h2>

          <div data-reveal className="md:col-span-3 md:justify-self-end">
            <Link
              href="/rentals"
              className="inline-block rounded-control border border-porcelain-50/30 px-6 py-3 font-medium text-porcelain-50 transition-colors duration-[180ms] hover:border-porcelain-50/60"
            >
              See what is in for rent
            </Link>
          </div>

          <div data-reveal className="md:col-span-2 md:justify-self-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/categories/side-lehengas.webp"
              alt=""
              className="arch h-36 w-28 bg-violet-900 object-cover"
            />
          </div>
        </Reveal>
      </section>

      {/* ---------- Close: come in -------------------------------------------
          A reading measure, not the wide shell: this is a two column text and
          image split, and a wide container with a capped plate leaves a dead
          band between them. The plate carries the page's only gold frame. */}
      <section className="relative bg-porcelain-50 pt-24 pb-24 md:pt-32 md:pb-32">
        <SectionEdge
          seed={24}
          paper="var(--color-violet-950)"
          reveal="var(--color-porcelain-50)"
        />

        <div className="shell">
          {/* Centred, not top-aligned: inside the reading shell the plate is
              only ~140px taller than the text beside it, so `items-start` just
              parks that difference under the button. The wide-container version
              of this, where centring strands a short block, is the trap. */}
          <div className="grid gap-12 md:grid-cols-[1fr_minmax(0,420px)] md:items-center lg:gap-16">
            <div>
              <p className="eyebrow">Visit</p>
              <RippleHeading className="mt-5 max-w-[22ch] text-h2 text-ink-900">
                Come in and try it on.
              </RippleHeading>
              <p className="mt-6 max-w-[42ch] text-ink-600">
                Reserve a piece and it is off the rail and waiting when you
                arrive. Two of us run the shop, so it is the same people each
                time.
              </p>

              <dl className="mt-8 grid gap-x-10 gap-y-4 border-t border-ink-900/10 pt-6 text-caption sm:grid-cols-2">
                <div>
                  <dt className="text-ink-600">Hours</dt>
                  <dd className="mt-1 text-ink-900">{SHOP.hours}</dd>
                </div>
                {/* The owner has not given the town yet. Left visible rather
                    than written around. */}
                <div>
                  <dt className="text-ink-600">The town</dt>
                  <dd className="mt-1 text-ink-600">TODO(owner)</dd>
                </div>
              </dl>

              {/* The paragraph above says a piece comes off the rail and waits
                  for you — and the only thing under it was a link to
                  directions, so the page answered a decision with a journey.
                  The ask comes first now; the visit stays as the second step it
                  actually is. */}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <RequestButton notice={false} />
                <Link
                  href="/visit"
                  className="text-caption text-gold-700 underline-offset-4 hover:underline"
                >
                  Plan a visit
                </Link>
              </div>
            </div>

            <GoldFrame tone="light">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/categories/party-wear-suits.webp"
                alt="A party wear suit on the rail in the shop"
                className="aspect-[4/5] w-full bg-porcelain-200 object-cover"
              />
            </GoldFrame>
          </div>
        </div>
      </section>
    </>
  );
}
