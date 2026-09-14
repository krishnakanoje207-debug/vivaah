import type { CSSProperties } from "react";
import { SHOP } from "@/lib/site";

/**
 * The name, drawing itself, with a running stitch sewn under it while the page
 * is on its way. One mark for both of the site's waits: `app/loading.tsx`
 * (every dynamic route while Neon answers) and the first-visit Preloader on
 * `/`, which picks it up where the loading screen left it and hands it to the
 * nav. Before this they were two unrelated screens shown back to back on a
 * first visit: a breathing hairline, then a wordmark drawn from nothing.
 *
 * Everything here is CSS (the `vv-mark` block at the end of globals.css), and
 * that is the point rather than a preference. The loading screen is on screen
 * BEFORE any JavaScript has arrived: it is the fallback in the first HTML chunk
 * of a response that is waiting on the database, so a GSAP or React animation
 * would start only after the wait it was meant to fill.
 *
 * Why a stitch. A wait of several seconds (3.9s measured on the front door)
 * needs a sign that something is still happening, and a spinner says only
 * "busy". A row of stitches pulled through one after another, then let go, and
 * sewn again, is a thing this shop does all day, it never implies a percentage
 * it cannot know, and it reads as calm at any length of wait. The idea is the
 * "trace while loading, resolve when ready" loader pattern; a trace around the
 * logo's contour is the literal version, for when the logo SVG exists.
 *
 * Reduced motion: the base styles ARE the finished state (name filled, stitches
 * sewn), and every animation is declared only under `no-preference`.
 */

const STITCHES = 11;

export function LoadingMark() {
  return (
    <div aria-hidden="true" className="vv-mark inline-flex flex-col leading-none">
      <span className="relative block">
        {/* The fill sits in flow and sets the box; the outline lies exactly
            over it and is what gets drawn. */}
        <span
          data-mark-fill
          className="vv-mark-fill block font-display text-[clamp(2.75rem,9vw,5rem)] tracking-tight text-porcelain-50"
        >
          {SHOP.short}
        </span>
        <span
          className="vv-mark-outline absolute inset-0 block font-display text-[clamp(2.75rem,9vw,5rem)] tracking-tight text-transparent"
          style={{ WebkitTextStroke: "0.7px var(--color-porcelain-50)" }}
        >
          {SHOP.short}
        </span>
      </span>
      <span className="vv-mark-lockup mt-1 block self-start text-[0.5rem] font-medium uppercase tracking-[0.22em] text-violet-300">
        {SHOP.lockup}
      </span>
      <span className="vv-stitch mt-6 flex gap-[6px]">
        {Array.from({ length: STITCHES }, (_, i) => (
          <span
            key={i}
            className="block h-[3px] flex-1 origin-left rounded-full bg-gold-500"
            style={{ "--i": i } as CSSProperties}
          />
        ))}
      </span>
    </div>
  );
}
