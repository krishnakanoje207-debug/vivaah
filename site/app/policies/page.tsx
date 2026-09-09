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
const LEDGER = "md:grid-cols-[minmax(0,4rem)_minmax(0,20rem)_1fr] md:gap-10";

export default function PoliciesPage() {
  return (
    <>
      {/* ---------- Masthead ------------------------------------------------
          The heading takes the width and the meta panel holds the right edge,
          so the top of the page is a spread rather than one column down the
          middle (shared contract §H.1). */}
      <section className="bg-porcelain-50 pt-24 pb-20 md:pt-28 md:pb-24">
        <div className="shell-wide">
          <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,20rem)] lg:items-end lg:gap-24">
            <div>
              <p className="eyebrow">Rental terms</p>
              <RippleHeading as="h1" className="mt-5 max-w-[16ch] text-h1 text-ink-900">
                What we ask, and what we do.
              </RippleHeading>
              <p className="mt-8 max-w-[58ch] text-ink-600">
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
                  label themselves and a column head would be noise. */}
              <div
                className={`hidden border-b border-ink-900/25 pb-4 text-caption text-ink-600 md:grid ${LEDGER}`}
              >
                <span className="eyebrow">No.</span>
                <span className="eyebrow">Term</span>
                <span className="eyebrow">What it will cover</span>
              </div>

              <Reveal>
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

          <div className="mt-10 grid items-start gap-12 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-24">
            <div>
              <p className="eyebrow">Being finalised</p>
              <RippleHeading className="mt-5 max-w-[18ch] text-h2 text-porcelain-50">
                Full terms are being set by the shop.
              </RippleHeading>
              <p className="mt-8 max-w-[62ch] text-violet-300">
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
