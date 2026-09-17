import { SectionEdge } from "@/components/site/SectionEdge";

/**
 * What stands where the rail will be, while Neon is answering.
 *
 * LAUNCH_CHECKLIST P2.2, which asks for "the page's real skeleton — the hero
 * panel and the rail's card geometry — not a spinner". The front door is the
 * only thing on `/` that needs the database (one query, feeding
 * `RentalRail`), so with a boundary around it the hero, the story, the proof
 * frames and the footer all paint immediately and only this strip waits.
 *
 * EVERY MEASUREMENT BELOW IS RENTALRAIL'S OWN, copied rather than approximated,
 * because the point of a skeleton is that nothing moves when the real thing
 * arrives: the same `SectionEdge` seed so the torn boundary is the identical
 * shape, the same section padding, the same `mt-10 md:mt-14` above the track,
 * the same card widths and 4/5 cards, and the same restated `shell-wide`
 * padding on the scroller. A skeleton that is close but not exact is a layout
 * shift with extra steps.
 *
 * Four cards, not eight. It only has to fill the width at the widest breakpoint
 * where a card is 22vw, and rendering the four that can be seen keeps this out
 * of the way of the real content behind it.
 *
 * `aria-hidden` and no text: a screen reader should hear the finished rail
 * announce itself, not a row of empty boxes. `role="status"` on the section
 * would announce "loading" on every visit, which is noise for a strip that is
 * usually filled in under a second.
 */
export function RentalRailSkeleton() {
  return (
    <section className="relative bg-porcelain-50 py-12 md:py-16" aria-hidden="true">
      <SectionEdge
        seed={15}
        paper="var(--color-violet-950)"
        reveal="var(--color-porcelain-50)"
      />

      <div className="shell-wide relative">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-16">
          {/* The heading's two lines at its own measure, so the block below
              starts at the height it will keep. */}
          <div className="flex max-w-[20ch] flex-col gap-3">
            <span className="block h-[1.1em] w-full rounded-[0.2rem] bg-ink-900/10 text-h2" />
            <span className="block h-[1.1em] w-2/3 rounded-[0.2rem] bg-ink-900/10 text-h2" />
          </div>
          <span className="block h-[1.2em] w-[9rem] rounded-[0.2rem] bg-ink-900/10 text-caption" />
        </div>
      </div>

      <ul className="mt-10 flex gap-6 overflow-hidden px-[calc(max(3vw,(100vw-2100px)/2)+1.25rem)] pb-4 md:mt-14 md:gap-8 md:px-[calc(max(3vw,(100vw-2100px)/2)+2.5rem)]">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="w-[60vw] max-w-[280px] shrink-0 sm:w-[38vw] lg:w-[22vw]">
            <div className="keyline arch aspect-[4/5] bg-stage shadow-card" />
            {/* The card's name and price lines, at the card's own rhythm. */}
            <div className="mt-4 flex flex-col gap-2">
              <span className="block h-[1.1em] w-3/4 rounded-[0.2rem] bg-ink-900/10" />
              <span className="block h-[1em] w-1/3 rounded-[0.2rem] bg-ink-900/10" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
