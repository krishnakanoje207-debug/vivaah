import type { Metadata } from "next";
import Link from "next/link";
import { SectionEdge } from "@/components/site/SectionEdge";
import { RequestButton } from "@/components/site/RequestButton";
import { GoldFrame } from "@/components/site/GoldFrame";
import { RippleHeading } from "@/components/site/RippleHeading";
import { Reveal } from "@/components/site/Reveal";
import { WipeIn } from "@/components/site/WipeIn";
import { Arcade } from "@/components/site/Arcade";
import { SakuraTree } from "@/components/site/SakuraTree";
import { PieceCard } from "@/components/retail/PieceCard";
import { RETAIL_CATEGORIES } from "@/lib/categories";
import { getRetailCards } from "@/lib/retail";
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
 *   Head        porcelain-50    type left, three-plane arcade   ripple + parallax, turnover
 *   Categories  porcelain-100   12-column mosaic, mixed spans   wipe per tile
 *   Reserving   stage           35/65 sideways, steps across    reveal
 *   Rentals     violet-950      one row, sentence to image      reveal
 *   Close       porcelain-50    reading shell, capped plate     gold frame
 *
 * Boundaries are torn, never blended: `SectionEdge` at each seam, the two grounds
 * still meeting along one hard edge.
 *
 * Phase 3 (17 Sep 2026) gave the page its catalogue. Two things changed and
 * nothing else did:
 *
 *   - **The rail comes before the argument.** The pieces that are in sit
 *     between the head and the category mosaic, in the order `/rentals` settled
 *     on for the same reason (owner, 14 Sep: the catalogue above the argument).
 *     Before this the page's tiles were the only thing to press, and every one
 *     of them led to a filter over nothing.
 *   - **The tiles filter in place.** `?category=<slug>` narrows the rail and
 *     the page loses its editorial: someone who has already chosen a category
 *     has read the argument, and making her scroll past it to reach the
 *     garments is the complaint in specs/ACTION_ROADMAP.md.
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
  `${RETAIL_CATEGORIES.length} categories`,
  "New pieces most days",
  "Reserve online, collect at the shop",
  "Nothing is posted",
];

/**
 * The mosaic. Keyed by slug rather than by index so reordering `lib/categories`
 * cannot silently scramble the composition, and so a category added later gets a
 * sane default instead of an undefined span.
 *
 * The spans total 12 per row (5+4+3, 3+6+3, 5+3+4) and the aspect ratios change
 * with them, which is what stops nine tiles reading as nine squares. `end`
 * drops a tile to the bottom of its row, so every row has a horizon its captions
 * sit on and the raggedness is at the top where it reads as composition.
 *
 * Nine since retail Sarees (migration 0004). The last row was 7+5 for two
 * tiles; it is three now, and its tall arch sits at the right-hand end so the
 * mosaic is bracketed by the two arches, first tile and last.
 */
/** The narrow copies `tools/make_image_variants.py` writes beside each shipped
 *  photograph, so a phone fetches a file its own size instead of the 660px one. */
function photoSrcSet(src: string) {
  const stem = src.slice(0, -".webp".length);
  return `${stem}-160.webp 160w, ${stem}-320.webp 320w, ${stem}-480.webp 480w, ${src} 660w`;
}

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
  "kurta-pant-sets": { span: "md:col-span-5", media: "aspect-[3/2]", end: true },
  kaftans: { span: "md:col-span-3", media: "aspect-square", end: true },
  "retail-sarees": { span: "md:col-span-4", media: "aspect-[3/4]", arch: true },
};
const TILE_DEFAULT: Tile = { span: "md:col-span-4", media: "aspect-[3/4]" };

// The arcade walks the categories that have their own photograph.
const ARCADE = RETAIL_CATEGORIES.flatMap((c) =>
  c.image ? [{ slug: c.slug, name: c.name, image: c.image, href: `/retail?category=${c.slug}` }] : []
);

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

export default async function RetailPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: slug } = await searchParams;
  // A slug that matches nothing is treated as no filter rather than as an empty
  // shop: a stale link should show the rail, not a void.
  const category = RETAIL_CATEGORIES.find((c) => c.slug === slug);
  const items = await getRetailCards(category?.slug);

  return (
    <>
      {/* ---------- Head: the model, and the rail turning over -------------
          Type left, the arcade right (see Arcade for why it exists and
          how it moves). The head takes the first screen from md up, with the
          fact rail as its floor, so the page opens on a composition rather
          than on a strip of small pictures with paper around them.

          The standfirst and the caption under the buttons are gone: one
          repeated the heading, the other repeated the standfirst, and the
          arcade now names the categories the standfirst listed. */}
      <section className="relative isolate bg-porcelain-50 pt-14 pb-12 md:flex md:min-h-[calc(100svh_-_4rem)] md:flex-col md:pt-12 md:pb-10">
        {/* The sakura across the whole head, under the type and the arcade
            (see SakuraTree). Clipped here, not on the section, so the arcade's
            parallax and the next section's torn edge are untouched. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <SakuraTree />
        </div>

        <div className="shell-wide md:flex md:flex-1 md:flex-col">
          {/* The type and the arcade are one composition, centred as a pair
              the way the jewellery head is: in two stretched columns the
              heading hugged the left edge and the arcade the right, with
              ~600px of paper between them at 1920. */}
          <div className="grid items-center gap-14 md:flex-1 md:grid-cols-[minmax(0,32rem)_auto] md:justify-between md:gap-10 lg:justify-center lg:gap-[clamp(4rem,9vw,11rem)]">
            {/* Above the sakura's layer, so a branch or a petal passes under
                the heading and the buttons, never over them. */}
            <div className="relative z-10">
              <p className="eyebrow">Retail</p>

              <RippleHeading
                as="h1"
                italic="shop"
                className="mt-6 max-w-[16ch] text-h1 text-ink-900"
              >
                Reserve online. Collect at the shop.
              </RippleHeading>

              <div className="mt-10 flex flex-wrap gap-3">
                {/* Points at whatever is actually below it: the rail either
                    way, and under a filter there is no category mosaic left to
                    send anyone to. */}
                <a
                  href="#collection"
                  className="press rounded-control bg-violet-800 px-6 py-3 font-medium text-porcelain-50 transition-colors duration-[180ms] hover:bg-violet-700"
                >
                  {category ? `See the ${category.name.toLowerCase()}` : "See what is in"}
                </a>
                <Link
                  href="/visit"
                  className="press rounded-control border border-ink-900/20 px-6 py-3 font-medium text-ink-900 transition-colors duration-[180ms] hover:border-ink-900/40"
                >
                  Plan a visit
                </Link>
              </div>
            </div>

            <Arcade items={ARCADE} />
          </div>

          {/* The rail. It runs the full width of the wide shell on purpose: it
              is the one horizontal line in the head and it ties the two columns
              together underneath. */}
          {/* Not a Reveal: from md up the rail is inside the first screen but
              below the reveal's 80% line, so it sat invisible until a scroll. */}
          <ul className="mt-14 grid grid-cols-1 border-y border-ink-900/10 sm:grid-cols-2 md:mt-12 md:grid-cols-4">
            {FACTS.map((f, i) => (
              <li
                key={f}
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
          </ul>
        </div>
      </section>

      {/* ---------- The rail: what is in ------------------------------------
          The catalogue, above everything that argues for it. Unfiltered it is
          the whole shop; under `?category=` it is that category and the page
          ends soon after, because someone who picked a category has already
          been persuaded.

          The wipe is per object, as it is on the rental collection: each piece
          comes off the rail on its own beat rather than the grid fading up as
          one block. */}
      <section
        id="collection"
        className="relative scroll-mt-20 bg-porcelain-50 pt-20 pb-24 md:pt-24 md:pb-28"
      >
        {/* No SectionEdge: the rail stands on the head's own paper, and the
            mosaic below keeps the porcelain-50 → porcelain-100 tear it already
            had. Tearing paper away to reveal the same paper draws a seam that
            is not there. */}
        <div className="shell-wide relative">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6 md:mb-16">
            <RippleHeading className="text-h2 text-ink-900">
              {category ? category.name : "What is in the shop"}
            </RippleHeading>
            {category && (
              <Link
                href="/retail"
                className="text-caption text-gold-700 underline-offset-4 hover:underline"
              >
                See everything in the shop
              </Link>
            )}
          </div>

          {items.length === 0 ? (
            <Reveal>
              <div
                data-reveal
                className="arch mx-auto max-w-xl border border-porcelain-200/60 bg-porcelain-50 px-8 py-12 text-center"
              >
                <span aria-hidden="true" className="mb-6 block text-2xl text-gold-600">
                  ✦
                </span>
                <p className="font-display text-[1.35rem] italic leading-relaxed text-ink-600">
                  &ldquo;
                  {category
                    ? `Our ${category.name.toLowerCase()} are being photographed for the site. The rail is already waiting at the shop.`
                    : "The rail is being photographed for the site. It is already waiting at the shop."}{" "}
                  <Link
                    href="/visit"
                    className="not-italic text-gold-700 underline decoration-gold-500/40 underline-offset-4 hover:decoration-gold-600"
                  >
                    Visit us
                  </Link>{" "}
                  to see it in person.&rdquo;
                </p>
              </div>
            </Reveal>
          ) : (
            <WipeIn className="grid grid-cols-1 items-start gap-x-10 gap-y-14 sm:grid-cols-2 sm:gap-y-20 lg:grid-cols-3">
              {items.map((p, i) => (
                <div
                  key={p.slug}
                  data-wipe
                  className={i % 3 === 1 ? "lg:mt-24" : i % 3 === 2 ? "lg:mt-12" : ""}
                >
                  <PieceCard p={p} />
                </div>
              ))}
            </WipeIn>
          )}
        </div>
      </section>

      {!category && (
        <>
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
          <RippleHeading className="text-h2 text-ink-900">
            What is on the rail.
          </RippleHeading>

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
                    className={`keyline overflow-hidden bg-porcelain-200 ${
                      t.arch ? "arch" : "rounded-card"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.image}
                      srcSet={c.image ? photoSrcSet(c.image) : undefined}
                      sizes="(min-width: 768px) 50vw, 92vw"
                      alt=""
                      aria-hidden="true"
                      width={660}
                      height={880}
                      loading="lazy"
                      decoding="async"
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
          {/* The eyebrow's words are the heading now. "Four steps." under
              "How reserving works" counted what the four numbers beside it
              already count. */}
          <RippleHeading className="max-w-[12ch] text-h2 text-ink-900">
            How reserving works.
          </RippleHeading>

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
          Variant B's version: one row, read left to right, sentence
          to link to a single small plate. The page's only dark beat, and it is
          deliberately one line tall so it reads as a door and not as a pitch. */}
      <section className="grain on-dark relative bg-violet-950 py-12 md:py-16">
        <SectionEdge
          seed={23}
          paper="var(--color-stage)"
          reveal="var(--color-violet-950)"
        />

        <Reveal className="shell-wide relative grid items-center gap-8 md:grid-cols-12 md:gap-10">
          <h2
            data-reveal
            className="text-h3 text-porcelain-50 md:col-span-7"
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
              srcSet="/categories/side-lehengas-160.webp 160w, /categories/side-lehengas-320.webp 320w, /categories/side-lehengas-480.webp 480w, /categories/side-lehengas.webp 660w"
              sizes="112px"
              alt=""
              aria-hidden="true"
              width={660}
              height={880}
              loading="lazy"
              decoding="async"
              className="keyline arch h-36 w-28 bg-violet-900 object-cover"
            />
          </div>
        </Reveal>
      </section>

        </>
      )}

      {/* ---------- Close: come in -------------------------------------------
          A reading measure, not the wide shell: this is a two column text and
          image split, and a wide container with a capped plate leaves a dead
          band between them. The plate carries the page's only gold frame. */}
      <section className="relative bg-porcelain-50 pt-24 pb-24 md:pt-32 md:pb-32">
        {/* The tear pulls the doorway's violet away. Under a filter the
            doorway is not there and the rail above stands on this same paper,
            so there is no boundary to tear. */}
        {!category && (
          <SectionEdge
            seed={24}
            paper="var(--color-violet-950)"
            reveal="var(--color-porcelain-50)"
          />
        )}

        <div className="shell">
          {/* Centred, not top-aligned: inside the reading shell the plate is
              only ~140px taller than the text beside it, so `items-start` just
              parks that difference under the button. The wide-container version
              of this, where centring strands a short block, is the trap. */}
          <div className="grid gap-12 md:grid-cols-[1fr_minmax(0,420px)] md:items-center lg:gap-16">
            <div>
              <RippleHeading className="max-w-[22ch] text-h2 text-ink-900">
                Come in and try it on.
              </RippleHeading>

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

              {/* The ask comes first; the visit stays as the second step it
                  actually is. Directions alone answered a decision with a
                  journey. */}
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
                srcSet="/categories/party-wear-suits-160.webp 160w, /categories/party-wear-suits-320.webp 320w, /categories/party-wear-suits-480.webp 480w, /categories/party-wear-suits.webp 660w"
                sizes="(min-width: 768px) 420px, 92vw"
                alt="A party wear suit on the rail in the shop"
                width={660}
                height={880}
                loading="lazy"
                decoding="async"
                className="keyline aspect-[4/5] w-full bg-porcelain-200 object-cover"
              />
            </GoldFrame>
          </div>
        </div>
      </section>
    </>
  );
}
