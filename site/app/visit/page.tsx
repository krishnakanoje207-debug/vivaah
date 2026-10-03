import type { Metadata } from "next";
import { SectionEdge } from "@/components/site/SectionEdge";
import { RippleHeading } from "@/components/site/RippleHeading";
import { Reveal } from "@/components/site/Reveal";
import { WipeIn } from "@/components/site/WipeIn";
import { Parallax } from "@/components/site/Parallax";
import { Ornament } from "@/components/site/Ornament";
import { Button } from "@/components/ui/Button";
import { SHOP } from "@/lib/site";
import { getShop } from "@/lib/shopInfo";

/**
 * `/visit` — how a customer gets herself into the shop.
 *
 * Built 9 Sep 2026 from the Kombai canvas, variant B ("margin labels, values in
 * a wide column"), against `specs/KOMBAI_VISIT_PROMPT.md`. Variant A set the
 * opening hours as one giant Bodoni line, which is a handsome idea that spends a
 * whole screen making the hours louder than the address, and then drops into a
 * flush-left stack for everything else. B's grammar is the one the brief asked
 * for: the label sits in a left margin, the value is set large in a wide column
 * beside it, and the page reads across rather than down.
 *
 * This is the site's third grammar and deliberately its quietest: printed
 * matter. `/` is an essay, `/rentals` is a sequence of rooms, and these two
 * document pages are a poster set in type. One photograph, no film, no map.
 *
 *   Section     Ground          Composition                       Device
 *   Head        porcelain-50    margin | heading | measure        letter ripple
 *   Practical   stage           four ruled rows, label + value    reveal per row
 *   In the shop porcelain-50    four steps across the full width  wipe per step
 *   What to bring porcelain-100 photograph left, two blocks right parallax
 *   Close       violet-950      two doors                         reveal
 *
 * Every boundary is a `SectionEdge` tear, never a blend (shared contract §E).
 *
 * The practical facts are the owner's, set in Settings and read through
 * `getShop()` (lib/shopInfo.ts), never typed here. There is no map embed and no
 * booking form by design (§G.7). "Getting here" is hidden until she gives the
 * town or the landmark, rather than carrying an invented direction.
 */

export const metadata: Metadata = {
  title: "Visit us",
  description:
    "Where the shop is, when it is open, and what to bring to a fitting. Everything is tried on in person, so nothing is posted.",
};

// What actually happens at a fitting. Four steps, each one a thing the shop
// really does; nothing here claims a duration or a service that does not exist.
const STEPS = [
  {
    n: "01",
    t: "You try pieces on",
    d: "Whatever is on the rail that week. New pieces arrive most days, so it is never quite the same rail.",
  },
  {
    n: "02",
    t: "We pin and alter, here",
    d: "Hem, blouse and fall, marked on you and altered in the shop rather than sent away.",
  },
  {
    n: "03",
    t: "Jewellery is matched",
    d: "Tried against the outfit you have chosen, and taken out on the same dates as the piece.",
  },
  {
    n: "04",
    t: "Your dates are held",
    d: "Collect the piece before your day, and bring it back after it.",
  },
];

const BRING = [
  {
    t: "The date you are dressing for",
    d: "So the piece is held for the right days, with time to alter it before you collect.",
  },
  {
    t: "Anything you are matching to",
    d: "A dupatta, a colour, a photograph. We try pieces against it in the shop.",
  },
];

// One ruled row of the practical block. Shared by all four so they cannot drift
// apart. Up to 2xl: label in the margin, value in a wide column, note pinned
// right. Past 2xl that shape breaks down — the value is four words and the note
// is 15rem, so a 1640px row had ~950px of nothing between them — so at 2xl the
// row becomes a stacked cell and the four of them go two up (see the Reveal).
const ROW =
  "grid gap-3 border-b border-ink-900/15 py-8 " +
  "md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,15rem)] md:items-baseline md:gap-10 md:py-10 " +
  "2xl:grid-cols-[minmax(0,1fr)] 2xl:items-start 2xl:gap-4";

// The note that closes each row: right-aligned against the value while the row
// is horizontal, left-aligned under it once the row stacks.
const NOTE = "text-caption text-ink-600 md:text-right 2xl:max-w-[46ch] 2xl:text-left";

export default async function VisitPage() {
  const shop = await getShop();
  return (
    <>
      {/* ---------- Head ---------------------------------------------------
          Three columns rather than one measure: the label sits out in a margin,
          the sentence gets the middle of the page, and the standfirst holds the
          right edge. On a 1920px screen that is a poster; a single column here
          would be a phone layout stretched wide (shared contract §H.1). */}
      <section className="bg-porcelain-50 pt-24 pb-20 md:pt-28 md:pb-28">
        <div className="shell-wide">
          {/* The label in the margin, the sentence beside it. The standfirst
              that held the right edge is gone (owner, 14 Sep: it restated the
              heading and the four steps below), so the row is two tracks. */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,7rem)_minmax(0,1fr)] lg:items-start lg:gap-16">
            <div>
              <p className="eyebrow">Visit us</p>
              <div className="mt-4 hidden h-px bg-gold-600/40 lg:block" />
            </div>

            <RippleHeading as="h1" className="text-h1 text-ink-900">
              Fitting happens in person.
            </RippleHeading>
          </div>
        </div>
      </section>

      {/* ---------- The practical block -------------------------------------
          The centrepiece, and the reason the page exists. The footer already
          lists these four facts a screen below, so this must not be that list
          again: labels sit in the margin, values are set in display type across
          a wide column, and each row carries its own note on the right. Ruled
          top and bottom, the way a printed colophon is. */}
      <section className="relative bg-stage py-12 md:py-16">
        <SectionEdge
          seed={21}
          paper="var(--color-porcelain-50)"
          reveal="var(--color-stage)"
        />

        {/* The ledger does not span the whole band: full width, a four-word
            value and a note pinned to the right edge leave a hole in the middle
            of every row. It used to be narrowed by a label and a standfirst in
            a column beside it; with those gone it is indented instead, onto the
            head's heading line (7rem margin plus the 4rem gap). */}
        {/* Positioned, so the tear above hangs behind the first line of type
            rather than over it: the band reaches ~64px into the section on a
            phone and ~93px from md up, against 48/64px of padding. */}
        <div className="shell-wide relative">
          <div className="lg:pl-[11rem]">
            <Reveal className="border-t border-ink-900/15 2xl:grid 2xl:grid-cols-2 2xl:gap-x-16">
              <div data-reveal className={ROW}>
                <p className="eyebrow">Address</p>
                <p className="max-w-[22ch] font-display text-h2 text-ink-900">
                  {shop.address}
                </p>
                <p className={NOTE}>
                  <a
                    href={shop.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gold-700 underline-offset-4 hover:underline"
                  >
                    Open in Maps
                  </a>
                </p>
              </div>

              <div data-reveal className={ROW}>
                <p className="eyebrow">Hours</p>
                <p className="tabular max-w-[22ch] font-display text-h2 text-ink-900">
                  {shop.hours}
                </p>
              </div>

              <div data-reveal className={ROW}>
                <p className="eyebrow">Phone</p>
                <p className="max-w-[22ch] font-display text-h2 text-ink-900">
                  <a
                    href={`tel:${SHOP.phone.replace(/\s/g, "")}`}
                    className="tabular underline-offset-[6px] transition-colors duration-[180ms] hover:text-gold-700 hover:underline"
                  >
                    {SHOP.phone}
                  </a>
                </p>
              </div>

              {/* The town, the nearest landmark and where to park, from Settings.
                  Hidden until the owner gives them: an invented landmark would
                  send someone the wrong way (shared contract §A). */}
              {(shop.town || shop.gettingHere) && (
                <div data-reveal className={ROW}>
                  <p className="eyebrow">Getting here</p>
                  <p className="max-w-[22ch] font-display text-h2 text-ink-900">
                    {shop.town || shop.gettingHere}
                  </p>
                  {shop.town && shop.gettingHere && <p className={NOTE}>{shop.gettingHere}</p>}
                </div>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- What happens when she comes in --------------------------
          Composed sideways: four steps run across the full width instead of
          stacking, so the section is a different shape from the ruled rows
          above it. */}
      <section className="relative bg-porcelain-50 py-12 md:py-16">
        <SectionEdge
          seed={22}
          paper="var(--color-stage)"
          reveal="var(--color-porcelain-50)"
        />

        <div className="shell-wide relative">
          {/* Past 2xl the header row takes the step band's own four columns:
              the heading over steps 1 and 2, the note over step 4. Pinning the
              two to the outer edges instead (space-between) put a 1150px gap
              between them that answered to nothing below it. */}
          {/* One heading. The eyebrow's words are the heading now: "Four things
              happen here" said nothing the four numbered steps did not, and
              the note beside it restated the page's own h1. */}
          <RippleHeading className="text-h2 text-ink-900">
            When you come in.
          </RippleHeading>

          <WipeIn className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4 lg:gap-x-12">
            {STEPS.map((s) => (
              <div key={s.n} data-wipe className="border-t border-ink-900/15 pt-6">
                <p className="tabular text-caption text-gold-700">{s.n}</p>
                <h3 className="mt-4 text-h3 text-ink-900">{s.t}</h3>
                <p className="mt-3 text-ink-600">{s.d}</p>
              </div>
            ))}
          </WipeIn>
        </div>
      </section>

      {/* ---------- What to bring -------------------------------------------
          The page's one photograph, and the only place it appears. Reading
          shell, image column capped, row aligned to the top: a wide container
          plus a capped image leaves a dead band between the columns, and
          `items-center` strands the shorter block in a taller row. */}
      <section className="relative bg-porcelain-100 py-12 md:py-16">
        <SectionEdge
          seed={23}
          paper="var(--color-porcelain-50)"
          reveal="var(--color-porcelain-100)"
        />

        <div className="shell relative">
          <div className="grid items-start gap-10 md:grid-cols-[1fr_minmax(0,420px)] lg:gap-20">
            {/* The photograph leads on the phone, as it did, and moves to the
                capped right column from md up: a 340px plate on the left of a
                1616px shell left the text with 1100px it could not fill, and
                nothing at all holding the right edge. */}
            <Reveal className="md:order-1">
              <RippleHeading className="max-w-[16ch] text-h2 text-ink-900">
                Bring the date, and whatever you are matching to.
              </RippleHeading>

              {/* Each entry goes sideways at 2xl — term against the rule's left
                  edge, what it means against its right — so the ruled row is
                  filled by its own text instead of running 700px past it. */}
              <dl className="mt-10 border-t border-ink-900/15">
                {BRING.map((b) => (
                  <div
                    key={b.t}
                    data-reveal
                    className="border-b border-ink-900/15 py-4 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_minmax(0,52ch)] 2xl:items-baseline 2xl:gap-10"
                  >
                    <dt className="font-display text-h3 text-ink-900">{b.t}</dt>
                    <dd className="mt-2 max-w-[52ch] text-ink-600 2xl:mt-0">{b.d}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Parallax distance={30}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/categories/sarees.webp"
                srcSet="/categories/sarees-160.webp 160w, /categories/sarees-320.webp 320w, /categories/sarees-480.webp 480w, /categories/sarees.webp 660w"
                sizes="(min-width: 768px) 40vw, 92vw"
                alt="A saree being tried on in the shop"
                width={660}
                height={880}
                loading="lazy"
                decoding="async"
                className="keyline arch aspect-[4/5] max-h-[23rem] w-full object-cover shadow-card"
              />
            </Parallax>
          </div>
        </div>
      </section>

      {/* ---------- Close ---------------------------------------------------
          Onward to the two ways a garment leaves the shop. Not `WordmarkClose`:
          that ending belongs to the landing page. */}
      <section className="grain relative bg-violet-950 py-24 on-dark md:py-32">
        <SectionEdge
          seed={24}
          paper="var(--color-porcelain-100)"
          reveal="var(--color-violet-950)"
        />

        {/* The heading is a column of the same row as the two doors rather than
            a banner above them, so the close uses the width instead of stranding
            a short heading at the top left of a 1600px band. */}
        <div className="shell-wide relative">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr_1fr] lg:gap-20">
            <div>
              <Ornament className="max-w-[7rem]" />
              <RippleHeading className="mt-8 text-h2 text-porcelain-50">
                Two ways to take a garment home.
              </RippleHeading>
            </div>

            <div className="border-t border-porcelain-50/20 pt-8">
              <p className="eyebrow">Rentals</p>
              <h3 className="mt-4 text-h3 text-porcelain-50">
                Reserve the dates, collect, return.
              </h3>
              <div className="mt-8">
                <Button href="/rentals" variant="ghost-dark">
                  See what is in for rent
                </Button>
              </div>
            </div>

            <div className="border-t border-porcelain-50/20 pt-8">
              <p className="eyebrow">Retail</p>
              <h3 className="mt-4 text-h3 text-porcelain-50">
                Reserve online, collect at the shop.
              </h3>
              <div className="mt-8">
                <Button href="/retail" variant="ghost-dark">
                  See what is in to buy
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
