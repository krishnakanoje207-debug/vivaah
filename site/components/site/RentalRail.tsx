import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { RentalCard } from "@/components/site/RentalCard";
import { PendingCard } from "@/components/site/PendingCard";
import { SectionEdge } from "@/components/site/SectionEdge";
import type { Rental } from "@/lib/rentals";
import type { Category } from "@/lib/categories";

/**
 * The rail — real stock, on the front door.
 *
 * Why this exists (10 Sep 2026): the hero's own headline is "The rail changes
 * every day. Come and see what arrived this week," and the page under it then
 * showed no garment at all. A visitor who arrived ready to rent met a
 * photograph, an essay about two partners, three doors, five proof pictures and
 * a map before anything they could actually book. The shortest path to one
 * piece was `/` → `/rentals` → past ~10,900px of the rent-versus-buy argument →
 * the card. This section keeps the headline's promise in the place it is made.
 *
 * A rail and not a grid, for three reasons that all point the same way:
 *   - it is the thing itself. The shop's stock hangs on a rail, and the copy
 *     already says so; a horizontal run of garments is the literal object.
 *   - height is the scarce resource here. Eight cards in a grid is ~2,000px of
 *     new page between the hero and everything else, which would have made the
 *     navigation complaint worse while appearing to answer it. The rail spends
 *     ~520px and still shows eight.
 *   - it needs no JavaScript. Native overflow with scroll-snap gives touch
 *     drag, trackpad, shift-wheel and keyboard for free, keeps every card a
 *     real focusable link, and degrades to a plain scrollable row if anything
 *     fails. A drag library would have bought mouse-drag and nothing else.
 *
 * The snap is `proximity`, not `mandatory`: mandatory fights the reader on a
 * trackpad, yanking the rail to the nearest card on every small movement.
 */
export function RentalRail({
  items,
  total,
  pending,
}: {
  items: Rental[];
  total: number;
  /** Categories with nothing photographed yet — see PendingCard. */
  pending: Category[];
}) {
  if (items.length === 0 && pending.length === 0) return null;

  return (
    <section className="relative bg-porcelain-50 py-12 md:py-16">
      {/* Tears the hero's violet away to reveal the paper. This also settles a
          boundary that was previously mismatched: the story section below tears
          porcelain → violet, but the hero above it was violet, so there was no
          paper for it to tear. With the rail between them the chain reads
          violet → porcelain → violet → porcelain the whole way down. */}
      <SectionEdge
        seed={15}
        paper="var(--color-violet-950)"
        reveal="var(--color-porcelain-50)"
      />

      <div className="shell-wide relative">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-16">
          <Reveal>
            <p data-reveal className="eyebrow">
              On the rail this week
            </p>
            <h2 data-reveal className="mt-5 max-w-[20ch] text-h2 text-ink-900">
              Here is what is hanging up <em className="italic">right now</em>.
            </h2>
          </Reveal>

          <Reveal>
            <Link
              data-reveal
              href="/rentals#collection"
              className="press group inline-flex items-baseline gap-3 text-caption text-gold-700"
            >
              {/* The real figure, not a rounded-up claim: it is the count of
                  rentable rows the same query returned. */}
              See all {total} {total === 1 ? "piece" : "pieces"}
              <span
                aria-hidden="true"
                className="transition-transform duration-[180ms] ease-out-strong group-hover:translate-x-1"
              >
                &#8594;
              </span>
            </Link>
          </Reveal>
        </div>
      </div>

      {/* The rail bleeds off both edges rather than stopping at the shell, so it
          reads as continuing past the frame instead of as a row that happens to
          be eight long. Padding on the scroller (not margin on the cards) keeps
          the first card on the shell's own left margin while still letting the
          last one scroll fully clear of the right edge. */}
      <Reveal
        as="ul"
        /* The inline padding is `.shell-wide`'s own geometry restated, not an
           approximation of it: its margin is (100vw - min(94vw, 2100px)) / 2,
           which is max(3vw, (100vw - 2100px) / 2), plus its 1.25rem/2.5rem
           padding. Restated rather than reused because the rail must bleed to
           both window edges while its FIRST CARD starts on the shell's text
           margin, which no single wrapper can do.
           `scroll-pl` then has to repeat that value, and is not optional: a
           `snap-start` target aligns to the SCROLLPORT's start edge, which
           ignores padding, so on first layout the browser scrolled the rail
           right by exactly its own padding-left (measured: 120px at 1920, 58 at
           1440, 16 at 390) and put the first card hard against the window edge. */
        className="mt-10 flex snap-x snap-proximity gap-6 overflow-x-auto overscroll-x-contain px-[calc(max(3vw,(100vw-2100px)/2)+1.25rem)] pb-4 scroll-pl-[calc(max(3vw,(100vw-2100px)/2)+1.25rem)] md:mt-14 md:gap-8 md:px-[calc(max(3vw,(100vw-2100px)/2)+2.5rem)] md:scroll-pl-[calc(max(3vw,(100vw-2100px)/2)+2.5rem)]"
      >
        {items.map((p) => (
          <li
            key={p.slug}
            data-reveal
            className="w-[60vw] max-w-[280px] shrink-0 snap-start sm:w-[38vw] lg:w-[22vw]"
          >
            <RentalCard p={p} />
          </li>
        ))}

        {/* Photographed pieces first, then the categories still waiting on
            photography. Kept in one run rather than split into two sections:
            the rail is the rack, and the rack does not sort itself into
            "shootable" and "not yet". */}
        {pending.map((c) => (
          <li
            key={c.slug}
            data-reveal
            className="w-[60vw] max-w-[280px] shrink-0 snap-start sm:w-[38vw] lg:w-[22vw]"
          >
            <PendingCard category={c} />
          </li>
        ))}

        {/* The rail's end. A card-shaped door rather than a dead stop, so the
            run finishes on something you can act on instead of on whitespace. */}
        <li className="w-[60vw] max-w-[280px] shrink-0 snap-start sm:w-[38vw] lg:w-[22vw]">
          <Link
            href="/rentals#collection"
            className="press-card group flex aspect-[4/5] flex-col items-center justify-center border border-ink-900/12 bg-porcelain-100/50 p-8 text-center transition-colors duration-200 ease-out-strong hover:border-ink-900/25"
          >
            <span aria-hidden="true" className="text-2xl text-gold-600 opacity-70">
              &#10022;
            </span>
            <span className="mt-5 font-display text-h3 text-ink-900">
              The full collection
            </span>
            <span className="mt-2 text-caption text-ink-600">
              {total} {total === 1 ? "piece" : "pieces"} to rent
            </span>
          </Link>
        </li>
      </Reveal>
    </section>
  );
}
