"use client";

import Link from "next/link";
import { SectionEdge } from "@/components/site/SectionEdge";
import { RequestButton } from "@/components/site/RequestButton";
import { GoldFrame } from "@/components/site/GoldFrame";
import { RippleHeading } from "@/components/site/RippleHeading";
import { Reveal } from "@/components/site/Reveal";
import { WipeIn } from "@/components/site/WipeIn";
import { Parallax } from "@/components/site/Parallax";
import { SHOP } from "@/lib/site";

/**
 * The jewellery page — the third door, and the only dark listing page on the
 * site.
 *
 * Built 9 Sep 2026 from the Kombai canvas (variant A, "the vault, mosaic of
 * pieces") against `specs/KOMBAI_JEWELLERY_PROMPT.md`. The three kinds are the
 * ones the previous build already named (Kundan, Polki & Pearls, Temple Gold),
 * kept because they are the shop's own vocabulary; its copy is not, because it
 * ran on the heritage register §A bans outright.
 *
 * Why dark: every other page is porcelain daylight, and gold is capped at ~2% of
 * the surface everywhere because it is an accent. Here the subject genuinely is
 * metal, so the ground drops to violet-950 and the gold does the work it is
 * being saved for. `.grain` sits on each dark ground, `.on-dark` flips the
 * nested eyebrows to gold-500, and the one `GoldFrame` is tone="dark".
 *
 *   Section   Ground        Composition                         Device
 *   Head      violet-950    text left, framed plate right       ripple + parallax
 *   Pieces    violet-900    six-column mosaic, tiles unequal    wipe per tile
 *   Matched   violet-950    narrow rail, plate off the edge     parallax + inset
 *   Works     violet-900    full-width rule, three columns      reveal
 *   Close     violet-950    invitation against the hours        reveal
 *
 * The composition is deliberately not `/`'s (which is a stack of shell-width
 * text-and-image splits on porcelain) and not `/rentals`' (threshold film, room
 * index, pattern seam, none of which appear here). Boundaries are torn, never
 * blended: `SectionEdge` at each seam, two grounds meeting along one hard edge.
 *
 * Contrast on this page: porcelain-50 and violet-300 for text on violet-950/900
 * (17:1 and 7.4:1), gold-500 for every accent (6.9:1), never gold-600.
 *
 * Nothing here is sold and nothing is reserved on its own: every call to action
 * leads to an outfit, at `/rentals` or in the shop.
 */

// The three kinds, and the outfits each is kept against. Names carried over from
// the previous build; the outfit pairings are the rental categories the site
// already lists.
const PIECES = [
  {
    name: "Kundan",
    note: "Sets for the bridal and side lehengas.",
    image: "/categories/sarees.webp",
    alt: "A woman in a saree wearing a kundan necklace and earrings",
    // 3x3: the mosaic's anchor, and the page's arch.
    span: "lg:col-span-3 lg:row-span-3",
    ratio: "aspect-[4/5]",
    arch: true,
  },
  {
    name: "Polki & Pearls",
    note: "Goes with gowns and indo-western pieces.",
    image: "/categories/indo-western.webp",
    alt: "A woman in an indo-western outfit with a polki and pearl necklace",
    span: "lg:col-span-3",
    ratio: "aspect-[16/10]",
    arch: false,
  },
  {
    name: "Temple Gold",
    note: "For sarees and poshak.",
    image: "/categories/ready-to-wear-sarees.webp",
    alt: "A woman in a ready-to-wear saree with a temple gold necklace",
    span: "lg:col-span-2 lg:row-span-2",
    ratio: "aspect-[4/5]",
    arch: false,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Same dates as the outfit",
    body: "The set is held for the dates the outfit is held. There is no second reservation.",
  },
  {
    n: "02",
    title: "Collected together",
    body: "Tried against the outfit at the fitting, then packed with it when you collect.",
  },
  {
    n: "03",
    title: "Returned together",
    body: "Comes back with the outfit, checked piece by piece before it goes back on the shelf.",
  },
];

export function JewelleryContent() {
  return (
    <>
      {/* ---------- Head: the model, stated first --------------------------
          Starts under the nav, which goes transparent over it (data-dark-hero),
          so the vault begins at the top of the window. It used to open on a
          torn strip of porcelain directly under the porcelain nav, with the
          headline 290px down and the plate stranded across a wide gap (owner,
          14 Sep: "offtracked"). */}
      <section
        data-dark-hero=""
        className="on-dark grain relative -mt-16 flex min-h-[100svh] items-center bg-violet-950 pt-28 pb-20 md:pt-32 md:pb-24"
      >
        <div className="shell-wide relative z-[1] w-full">
          {/* The text and the plate are one composition, centred as a pair: in
              two stretched columns the headline hugged the left edge and the
              plate the right, with 670px of ground between them at 1920. */}
          <div className="grid items-center gap-12 md:grid-cols-[minmax(0,40rem)_auto] md:justify-center lg:gap-24">
            <Reveal>
              <p data-reveal className="eyebrow">
                Jewellery
              </p>

              <RippleHeading
                as="h1"
                className="mt-6 max-w-[16ch] text-h1 text-porcelain-50"
              >
                Rented alongside an outfit, never sold.
              </RippleHeading>

              <div data-reveal className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/rentals"
                  className="rounded-control bg-porcelain-50 px-6 py-3 font-medium text-violet-950 transition-colors duration-[180ms] hover:bg-gold-100"
                >
                  Match to your outfit
                </Link>
                <Link
                  href="/visit"
                  className="rounded-control border border-porcelain-50/30 px-6 py-3 font-medium text-porcelain-50 transition-colors duration-[180ms] hover:border-porcelain-50/60"
                >
                  Come in and try
                </Link>
              </div>

            </Reveal>

            {/* The page's only gold frame. It marks the plate the page is asking
                you to look at, and it stops meaning that if everything wears one. */}
            {/* A portrait, sized by width so the 4:5 crop holds: the old
                height cap on a full-width column cut it to a letterbox. */}
            <Parallax distance={30} className="w-full max-w-[26rem] justify-self-center md:w-[clamp(18rem,30vw,30rem)] md:max-w-none md:justify-self-end">
              <GoldFrame tone="dark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/categories/bridal-lehengas.webp"
                  alt="A bride in a red lehenga wearing the matched necklace and maang tikka"
                  className="keyline aspect-[4/5] w-full object-cover"
                />
              </GoldFrame>
            </Parallax>
          </div>
        </div>
      </section>

      {/* ---------- The pieces: the vault ----------------------------------
          Bright metal on a black ground, and the tiles are deliberately unequal:
          one large arch anchoring the left, a wide band, a tall column and two
          small squares. Eight identical squares would be a catalogue, and this
          page is not one. */}
      <section className="on-dark grain relative bg-violet-900 pt-28 pb-24 md:pt-36 md:pb-32">
        <SectionEdge
          seed={22}
          paper="var(--color-violet-950)"
          reveal="var(--color-violet-900)"
        />

        <div className="shell-wide relative z-[1]">
          <RippleHeading className="text-h2 text-porcelain-50">
            Three kinds, matched to what you take.
          </RippleHeading>

          <WipeIn className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:grid-rows-[208px_140px_140px]">
            {PIECES.map((p) => (
              <Link
                key={p.name}
                href="/rentals"
                data-wipe
                className={`keyline group relative overflow-hidden bg-violet-950 ${p.ratio} lg:aspect-auto ${p.span} ${
                  p.arch ? "arch" : "rounded-card"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.alt}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {/* A scrim over a photograph, not a boundary between two grounds
                    (§G.4 bans the latter): the caption has to clear AA over
                    whatever the owner's photography turns out to be. */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-violet-950 via-violet-950/90 to-transparent p-5 pt-16 lg:p-6 lg:pt-20">
                  <div className="h-px w-10 bg-gold-500" />
                  <h3 className="mt-3 text-h3 text-porcelain-50">{p.name}</h3>
                  <p className="mt-1 text-caption text-violet-300">{p.note}</p>
                </div>
              </Link>
            ))}

            {/* The shop's one honest caveat about a shelf that turns over. */}
            <div className="flex flex-col justify-between rounded-card border border-gold-500/35 bg-violet-950 p-4 lg:col-span-1 lg:p-5">
              <span aria-hidden="true" className="text-caption text-gold-500">
                ✦
              </span>
              {/* Three lines at most: the tile is a fixed 140px row, and the old
                  four-line sentence ran out of the bottom of its border. */}
              <p className="text-caption text-violet-300">
                The shelf changes with the rail. Ask what matches your outfit.
              </p>
            </div>

            <Link
              href="/rentals"
              data-wipe
              className="keyline group relative aspect-[16/10] overflow-hidden rounded-card bg-violet-950 lg:col-span-1 lg:aspect-auto"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/categories/side-lehengas.webp"
                alt="A woman in a side lehenga wearing stacked bangles"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-violet-950 via-violet-950/90 to-transparent px-4 pb-3 pt-10 text-eyebrow uppercase tracking-[0.12em] text-porcelain-50">
                Bangles
              </p>
            </Link>
          </WipeIn>
        </div>
      </section>

      {/* ---------- Matched to the outfit ----------------------------------
          The reason the page exists, and its strongest composition: the text
          drops to a narrow rail on the shell's left inset while the outfit runs
          out past the right edge of the viewport, with the set that goes with it
          overlapping the bottom-left corner and a drawn gold bracket tying the
          two together. Nothing here is shell-width. */}
      <section className="on-dark grain relative overflow-hidden bg-violet-950 pt-28 pb-24 md:pt-36 md:pb-32">
        <SectionEdge
          seed={23}
          paper="var(--color-violet-900)"
          reveal="var(--color-violet-950)"
        />

        {/* The shell's left gutter lives on the grid itself, not on the rail
            column: put it on the column and it is subtracted from the 25rem the
            rail was given, which at 1920 leaves 200px of measure and breaks the
            heading into six lines. The right gutter is given up entirely, so the
            plate has somewhere to run. */}
        <div className="relative z-[1] grid items-center gap-12 pl-5 md:grid-cols-[minmax(0,25rem)_1fr] md:pl-8 lg:gap-16 lg:pl-[max(2.5rem,calc((100vw-1600px)/2+2.5rem))]">
          <div className="pr-5 md:pr-0">
            <Reveal>
              <RippleHeading className="max-w-[16ch] text-h2 text-porcelain-50">
                One reservation, two things on the same dates.
              </RippleHeading>

              <Link
                data-reveal
                href="/rentals"
                className="mt-8 inline-flex items-center gap-2 font-medium text-gold-500 transition-transform duration-[180ms] hover:translate-x-1"
              >
                See what is in for rent
                <span aria-hidden="true">→</span>
              </Link>
            </Reveal>
          </div>

          <div className="relative pb-16 md:pb-20">
            <Parallax distance={30} className="ml-[24%] md:ml-[16%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/categories/rajasthani-poshak.webp"
                alt="A woman in a Rajasthani poshak wearing the full set that goes with it"
                className="keyline aspect-[3/4] max-h-[26rem] w-full object-cover"
              />
            </Parallax>

            <div className="absolute bottom-0 left-0 w-[44%] max-w-[19rem] md:w-[38%]">
              <div className="keyline arch aspect-square overflow-hidden shadow-lift">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/categories/chaniya-cholis.webp"
                  alt="The set matched to the outfit, worn with a chaniya choli"
                  className="h-full w-full object-cover"
                />
              </div>
              {/* The canvas ties the two plates together with a drawn gold
                  bracket. It is dropped here: at every width it lands on top of
                  the outfit photograph, where a gold hairline over gold
                  embroidery reads as a scratch rather than a connection. The
                  overlap and this caption already say the two belong together. */}
              <p className="mt-3 text-caption text-violet-300">
                The set that goes with it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it works: three lines, laid across ------------------
          No header. It had two ("How it works" and "Three lines, nothing
          more."), and the gold rule with the three step titles under it says
          both. */}
      <section className="on-dark grain relative bg-violet-900 pt-28 pb-20 md:pt-32 md:pb-24">
        <SectionEdge
          seed={24}
          paper="var(--color-violet-950)"
          reveal="var(--color-violet-900)"
        />

        <div className="shell-wide relative z-[1]">
          <div className="h-px w-full bg-gold-500/50" />

          <Reveal className="mt-10 grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} data-reveal className="flex gap-5">
                <span className="tabular pt-1 text-caption text-gold-500">{s.n}</span>
                <div>
                  <h3 className="text-h3 text-porcelain-50">{s.title}</h3>
                  <p className="mt-2 max-w-[34ch] text-violet-300">{s.body}</p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------- Close: come in and try it against the outfit ------------
          No wordmark close here: that ending belongs to the landing page. The
          practical detail comes from SHOP, so it follows the admin settings when
          those land, and is never typed into the page. */}
      <section className="on-dark grain relative bg-violet-950 pt-28 pb-24 md:pt-36 md:pb-32">
        <SectionEdge
          seed={25}
          paper="var(--color-violet-900)"
          reveal="var(--color-violet-950)"
        />

        <div className="shell-wide relative z-[1]">
          <div className="grid items-start gap-12 md:grid-cols-[1.1fr_1fr] lg:gap-20">
            <Reveal>
              <div className="ornament max-w-[7rem]" aria-hidden="true">
                <span className="text-caption">✦</span>
              </div>

              <RippleHeading className="mt-8 max-w-[16ch] text-h2 text-porcelain-50">
                Bring the outfit. Try the pieces against it.
              </RippleHeading>

              {/* Jewellery goes out with an outfit, so the ask is the same one
                  the rest of the site makes and the customer names the outfit
                  in her own message. Before this the page closed on directions
                  alone, like every other page did. */}
              <div data-reveal className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                <RequestButton tone="dark" notice={false} />
                <Link
                  href="/visit"
                  className="text-caption text-gold-500 underline-offset-4 hover:underline"
                >
                  Plan a visit
                </Link>
              </div>
            </Reveal>

            <dl className="grid gap-x-10 gap-y-8 text-caption sm:grid-cols-2 md:pt-4">
              <div className="sm:col-span-2">
                <dt className="eyebrow">Hours</dt>
                {/* `leading-none` is only safe while the hours are one line. At
                    390 the string is wider than the column, so it wraps, and a
                    zero leading collides the two lines: the phone gets a step
                    down in size and a real line height. */}
                <dd className="tabular mt-3 font-display text-[1.625rem] leading-tight text-porcelain-50 sm:text-[2rem] sm:leading-none">
                  {SHOP.hours}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Address</dt>
                <dd className="mt-2 text-porcelain-50">{SHOP.address}</dd>
                <dd className="mt-1">
                  <a
                    href={SHOP.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gold-500 underline-offset-4 hover:underline"
                  >
                    Open in Maps
                  </a>
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Phone</dt>
                <dd className="mt-2">
                  <a
                    href={`tel:${SHOP.phone.replace(/\s/g, "")}`}
                    className="text-porcelain-50 underline-offset-4 hover:underline"
                  >
                    {SHOP.phone}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
