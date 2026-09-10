import type { Metadata } from "next";
import { SectionEdge } from "@/components/site/SectionEdge";
import { RippleHeading } from "@/components/site/RippleHeading";
import { Reveal } from "@/components/site/Reveal";
import { WipeIn } from "@/components/site/WipeIn";
import { Parallax } from "@/components/site/Parallax";
import { Ornament } from "@/components/site/Ornament";
import { Button } from "@/components/ui/Button";
import { SHOP } from "@/lib/site";

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
 * The four practical facts are read from `SHOP`, never typed here: today they
 * are placeholders and in Phase 1 they become admin settings. There is no map
 * embed and no booking form by design (§G.7, and booking is Phase 2). The town,
 * the landmark and the parking have not been given by the owner, so that row
 * carries a visible `TODO(owner)` rather than an invented direction.
 */

export const metadata: Metadata = { title: "Visit us" };

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

export default function VisitPage() {
  return (
    <>
      {/* ---------- Head ---------------------------------------------------
          Three columns rather than one measure: the label sits out in a margin,
          the sentence gets the middle of the page, and the standfirst holds the
          right edge. On a 1920px screen that is a poster; a single column here
          would be a phone layout stretched wide (shared contract §H.1). */}
      <section className="bg-porcelain-50 pt-24 pb-20 md:pt-28 md:pb-28">
        <div className="shell-wide">
          {/* Three tracks up to 2xl; four past it. At 2560 the heading runs out
              at ~1030px inside a 1400px track and the standfirst is pinned to
              the right edge, so the row had a 460px hole in the middle of it.
              `2xl:contents` dissolves the standfirst's wrapper so its two
              paragraphs become grid items of their own, which closes the hole
              by putting something in it rather than by stretching the type. */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,7rem)_minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-16 2xl:grid-cols-[minmax(0,7rem)_minmax(0,1fr)_minmax(0,26ch)_minmax(0,26ch)]">
            <div>
              <p className="eyebrow">Visit us</p>
              <div className="mt-4 hidden h-px bg-gold-600/40 lg:block" />
            </div>

            <RippleHeading as="h1" className="text-h1 text-ink-900">
              Fitting happens in person.
            </RippleHeading>

            <div className="lg:pt-3 2xl:contents">
              <p className="max-w-[38ch] text-ink-600 2xl:pt-3">
                Nothing is posted. Come in, try pieces on, and we pin and alter them
                here, in front of you.
              </p>
              <p className="mt-5 max-w-[38ch] text-caption text-ink-600 2xl:mt-0 2xl:pt-3">
                Two of us run the shop, and we handle every fitting ourselves.
              </p>
            </div>
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

        {/* The ledger sits in its own track beside a standfirst rather than
            spanning the whole 1600px band: full width, a four-word value and a
            note pinned to the right edge leave a hole in the middle of every
            row. Narrowing the track is what closes it. */}
        <div className="shell-wide">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-20">
            <div>
              <p className="eyebrow">Where, and when</p>
              <p className="mt-5 max-w-[34ch] text-caption text-ink-600">
                The shop keeps these current. If anything here has changed, the phone is
                the fastest way to check.
              </p>
            </div>

            <Reveal className="border-t border-ink-900/15 2xl:grid 2xl:grid-cols-2 2xl:gap-x-16">
              <div data-reveal className={ROW}>
                <p className="eyebrow">Address</p>
                <p className="max-w-[22ch] font-display text-h2 text-ink-900">
                  {SHOP.address}
                </p>
                <p className={NOTE}>
                  <a
                    href={SHOP.mapsUrl}
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
                  {SHOP.hours}
                </p>
                <p className={NOTE}>
                  Come during these hours, or tell us when you are coming so a piece you
                  have seen is waiting.
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
                <p className={NOTE}>Call during shop hours and one of us will pick up.</p>
              </div>

              {/* The owner has not given the town, so there is nothing honest to
                  write here yet. A placeholder is honest; an invented landmark is
                  not (shared contract §A). */}
              <div data-reveal className={ROW}>
                <p className="eyebrow">Getting here</p>
                <p className="max-w-[22ch] font-display text-h2 text-ink-600">
                  TODO(owner)
                </p>
                <p className={NOTE}>
                  Town, nearest landmark and where to park, once the owner confirms them.
                </p>
              </div>
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

        <div className="shell-wide">
          {/* Past 2xl the header row takes the step band's own four columns:
              the heading over steps 1 and 2, the note over step 4. Pinning the
              two to the outer edges instead (space-between) put a 1150px gap
              between them that answered to nothing below it. */}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,24rem)] lg:items-end lg:justify-between lg:gap-20 2xl:grid-cols-4 2xl:justify-normal 2xl:gap-x-12">
            <div className="2xl:col-span-2">
              <p className="eyebrow">When you come in</p>
              <RippleHeading className="mt-5 text-h2 text-ink-900">
                Four things happen here.
              </RippleHeading>
            </div>
            <p className="text-ink-600 2xl:col-start-4">
              Two of us, one rail, and the date you are dressing for. Everything below
              happens in the shop.
            </p>
          </div>

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

        <div className="shell">
          <div className="grid items-start gap-10 md:grid-cols-[1fr_minmax(0,420px)] lg:gap-20">
            {/* The photograph leads on the phone, as it did, and moves to the
                capped right column from md up: a 340px plate on the left of a
                1616px shell left the text with 1100px it could not fill, and
                nothing at all holding the right edge. */}
            <Reveal className="md:order-1">
              <p data-reveal className="eyebrow">
                What to bring
              </p>
              <RippleHeading className="mt-5 max-w-[16ch] text-h2 text-ink-900">
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
                src="/categories/sarees.jpg"
                alt="A saree being tried on in the shop"
                className="arch aspect-[4/5] max-h-[23rem] w-full object-cover shadow-card"
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
        <div className="shell-wide">
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
              <p className="mt-3 max-w-[46ch] text-violet-300">
                Bridal and festive wear, rented by the date and fitted here before your
                day.
              </p>
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
              <p className="mt-3 max-w-[46ch] text-violet-300">
                Suits, kurtis, co-ord sets and kaftans to keep. Try it on here, then take
                it home.
              </p>
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
