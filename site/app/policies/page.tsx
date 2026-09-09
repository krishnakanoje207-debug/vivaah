import type { Metadata } from "next";
import { SectionEdge } from "@/components/site/SectionEdge";
import { RippleHeading } from "@/components/site/RippleHeading";
import { Reveal } from "@/components/site/Reveal";
import { Ornament } from "@/components/site/Ornament";
import { Button } from "@/components/ui/Button";
import { SHOP } from "@/lib/site";

/**
 * `/policies` — the rental terms.
 *
 * Built 9 Sep 2026 from the Kombai canvas, variant A ("sticky index + numbered
 * terms"), against `specs/KOMBAI_VISIT_PROMPT.md`, with variant B's ruled
 * clause table taken for the terms themselves. A alone was a lettered stack; B
 * alone gave the page no persistent shape. Together they are what the brief
 * asked for: an index that stays visible on desktop so the whole document can be
 * seen at a glance, and clauses set as ruled rows with the number, the term and
 * what it covers in their own columns. The index is CSS `position: sticky` in a
 * grid column, so there is no scroll library and it cannot overlap the clauses.
 *
 * REDESIGN, NOT REWRITE. Every term below is the previous page's, word for word.
 * Nothing was deleted, softened, added or renumbered. Two typographic changes
 * only, neither of which touches meaning: `&` is set as "and" in the term names,
 * and the em dash in the pickup clause is a colon, because visible copy on this
 * site carries no em dashes (shared contract §G.3).
 *
 * The honest framing of the old page is also preserved and is the point of the
 * ledger's third column heading: these describe what each term WILL COVER once
 * the shop confirms it. The shop sets the real terms through the admin panel, in
 * English and Hindi. Nothing here is presented as a confirmed policy, and no
 * figure, deposit or penalty is stated, because none exists yet.
 *
 *   Section   Ground          Composition                    Device
 *   Masthead  porcelain-50    heading wide, meta panel right letter ripple
 *   Document  porcelain-100   sticky index | ruled clauses   reveal per clause
 *   Close     violet-950      note left, who to ask right    reveal
 *
 * No photography, by the brief. The boundaries are `SectionEdge` tears.
 */

export const metadata: Metadata = { title: "Rental terms" };

// The four terms, carried over unchanged from the previous page. `covers` is the
// old `d` string verbatim; `title` is the old `t` with "&" set as "and".
const TERMS = [
  {
    id: "booking",
    n: "01",
    title: "Booking and pre-payment",
    covers:
      "How much to pay up front to secure your dates, the UPI details we accept, and how the balance is settled.",
  },
  {
    id: "extensions",
    n: "02",
    title: "Extensions",
    covers:
      "Keeping a piece for a few extra days, and how additional dates are arranged when they are free.",
  },
  {
    id: "damage",
    n: "03",
    title: "Damage and care",
    covers:
      "Caring for your outfit through the celebration, and how accidental marks or damage are handled on return.",
  },
  {
    id: "pickup",
    n: "04",
    title: "Pickup and return",
    covers:
      "Collecting before your day and returning it after: everything happens at the shop, with no shipping.",
  },
];

// The row template is shared by the ledger's head and every clause, so the three
// columns line up down the whole document.
//
// Two column sets, because one cannot serve both widths. Up to 2xl the clauses
// run one per row and `[4rem 20rem 1fr]` fills the track almost exactly. Past
// 2xl the clause area is ~1640px and a 62ch clause ends less than two thirds of
// the way across it, leaving 500px of empty paper under every rule; so at 2xl
// the clauses go two up (below) and each one gets a narrower set that fills its
// half.
const LEDGER =
  "md:grid-cols-[minmax(0,4rem)_minmax(0,20rem)_1fr] md:gap-10 " +
  "2xl:grid-cols-[minmax(0,3rem)_minmax(0,15rem)_minmax(0,1fr)] 2xl:gap-8";

export default function PoliciesPage() {
  return (
    <>
      {/* ---------- Masthead ------------------------------------------------
          The heading takes the width and the meta panel holds the right edge,
          so the top of the page is a spread rather than one column down the
          middle (shared contract §H.1).

          Past 2xl that pair is not enough: the heading stops at its own 16ch
          and the panel is pinned to the right edge, which left a 1000px hole
          down the middle of the masthead at 2560. So at 2xl the heading and
          the standfirst become their own two tracks inside the left half — the
          heading is let off its measure there because the track is what bounds
          it — and the row reads across in three parts instead of two. */}
      <section className="bg-porcelain-50 pt-24 pb-20 md:pt-28 md:pb-24">
        <div className="shell-wide">
          <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,20rem)] lg:items-end lg:gap-24">
            <div className="2xl:grid 2xl:grid-cols-[minmax(0,1fr)_minmax(0,32ch)] 2xl:items-end 2xl:gap-16">
              <div>
                <p className="eyebrow">Rental terms</p>
                <RippleHeading
                  as="h1"
                  className="mt-5 max-w-[16ch] text-h1 text-ink-900 2xl:max-w-none"
                >
                  What we ask, and what we do.
                </RippleHeading>
              </div>
              <p className="mt-8 max-w-[58ch] text-ink-600 2xl:mt-0">
                The details behind every booking, kept plain and fair. Here is what each
                part will cover once the shop confirms its terms.
              </p>
            </div>

            <dl className="border-t border-ink-900/15 text-caption">
              <div className="flex justify-between gap-6 border-b border-ink-900/15 py-3">
                <dt className="eyebrow">Applies to</dt>
                <dd className="text-ink-900">Rentals</dd>
              </div>
              <div className="flex justify-between gap-6 border-b border-ink-900/15 py-3">
                <dt className="eyebrow">Status</dt>
                <dd className="text-ink-900">Being finalised</dd>
              </div>
              <div className="flex justify-between gap-6 border-b border-ink-900/15 py-3">
                <dt className="eyebrow">Languages</dt>
                <dd className="text-ink-900">English and Hindi</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ---------- The document --------------------------------------------
          Index in the left margin, clauses in the wide column. The index is a
          grid column that sticks inside its own track, which is why it can never
          run over the text: `top-24` clears the 64px sticky nav. */}
      <section className="relative bg-porcelain-100 py-24 md:py-32">
        <SectionEdge
          seed={31}
          paper="var(--color-porcelain-50)"
          reveal="var(--color-porcelain-100)"
        />

        <div className="shell-wide">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,15rem)_1fr] lg:gap-24">
            <nav aria-label="The terms" className="lg:sticky lg:top-24 lg:self-start">
              <p className="eyebrow">Contents</p>
              <ol className="mt-5 border-t border-ink-900/15">
                {TERMS.map((t) => (
                  <li key={t.id} className="border-b border-ink-900/15">
                    <a
                      href={`#${t.id}`}
                      className="flex items-baseline gap-4 py-3 text-ink-600 transition-colors duration-[180ms] hover:text-ink-900"
                    >
                      <span className="tabular text-caption text-gold-700">{t.n}</span>
                      <span>{t.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-caption text-ink-600">Four sections.</p>
            </nav>

            <div>
              {/* The ledger head. Hidden on the phone, where the stacked rows
                  label themselves and a column head would be noise, and hidden
                  again at 2xl, where the clauses go two up and a single set of
                  column heads would label only the left one. */}
              <div
                className={`hidden border-b border-ink-900/25 pb-4 text-caption text-ink-600 md:grid 2xl:hidden ${LEDGER}`}
              >
                <span className="eyebrow">No.</span>
                <span className="eyebrow">Term</span>
                <span className="eyebrow">What it will cover</span>
              </div>

              {/* Two clauses per row past 2xl. Four short clauses stacked down a
                  1640px column is the "made for phones" read: each rule runs the
                  full width while its text stops at 62ch. Two up halves the
                  track so the text fills what it is ruled against, and the
                  document is half as tall. Reading order is unchanged. */}
              <Reveal className="2xl:grid 2xl:grid-cols-2 2xl:gap-x-16 2xl:border-t 2xl:border-ink-900/25">
                {TERMS.map((t) => (
                  <article
                    key={t.id}
                    id={t.id}
                    data-reveal
                    className={`grid scroll-mt-28 gap-3 border-b border-ink-900/15 py-8 md:items-baseline md:py-10 ${LEDGER}`}
                  >
                    <p className="tabular text-caption text-gold-700">{t.n}</p>
                    <h2 className="text-h3 text-ink-900">{t.title}</h2>
                    <p className="max-w-[62ch] text-ink-600">{t.covers}</p>
                  </article>
                ))}
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Close ---------------------------------------------------
          The old page's "Being finalised" panel, kept whole and given the last
          screen: it is the most important sentence on the page, because it says
          the terms above are not yet the terms. */}
      <section className="grain relative bg-violet-950 py-24 on-dark md:py-32">
        <SectionEdge
          seed={32}
          paper="var(--color-porcelain-100)"
          reveal="var(--color-violet-950)"
        />

        <div className="shell-wide">
          <Ornament className="max-w-[7rem]" />

          {/* Same three-part spread as the masthead, and for the same reason:
              a heading held to 18ch beside a panel pinned right left a ~980px
              hole at 2560. At 2xl the body and the two doors move into their
              own track between the heading and the panel. */}
          <div className="mt-10 grid items-start gap-12 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-24">
            <div className="2xl:grid 2xl:grid-cols-[minmax(0,1fr)_minmax(0,38ch)] 2xl:gap-16">
              <div>
                <p className="eyebrow">Being finalised</p>
                <RippleHeading className="mt-5 max-w-[18ch] text-h2 text-porcelain-50 2xl:max-w-[26ch]">
                  Full terms are being set by the shop.
                </RippleHeading>
              </div>
              <div>
                <p className="mt-8 max-w-[62ch] text-violet-300 2xl:mt-0">
                  Full terms are being set by the shop through its admin panel, and will
                  appear here in both English and Hindi. Until then, our team will walk you
                  through everything in person or over the phone.
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                  <Button href="/visit" variant="primary-dark">
                    Visit the shop
                  </Button>
                  <Button href="/rentals" variant="ghost-dark">
                    Explore rentals
                  </Button>
                </div>
              </div>
            </div>

            <dl className="border-t border-porcelain-50/20 text-caption">
              <div className="border-b border-porcelain-50/20 py-4">
                <dt className="eyebrow">Ask in person</dt>
                <dd className="mt-2 text-porcelain-50">{SHOP.address}</dd>
                <dd className="tabular mt-1 text-violet-300">{SHOP.hours}</dd>
              </div>
              <div className="border-b border-porcelain-50/20 py-4">
                <dt className="eyebrow">Ask by phone</dt>
                <dd className="mt-2">
                  <a
                    href={`tel:${SHOP.phone.replace(/\s/g, "")}`}
                    className="tabular text-porcelain-50 underline-offset-4 hover:underline"
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
