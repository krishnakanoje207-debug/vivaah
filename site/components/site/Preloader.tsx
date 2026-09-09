"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { SHOP } from "@/lib/site";

/**
 * The preloader (DESIGN_SPEC_V3 §4.1).
 *
 * Once per session, 1.2s hard cap, and it resolves INTO the nav's wordmark slot
 * rather than curtaining up: the mark travels and scales to the nav's own
 * coordinates, then the ground fades on `opacity` alone and the page is already
 * standing behind it.
 *
 * Rendered only from the home page, which is what "skipped entirely on any deep
 * link" means here. It is server-rendered so it paints with the first frame, and
 * a blocking inline script removes it before paint for a visitor who has already
 * seen it this session or who asks for reduced motion. Without that script the
 * page would flash the preloader at someone it is meant to skip.
 *
 * §3.4's stroke-dashoffset technique wants one continuous path with
 * pathLength="1". The shop's logo has not arrived yet (BRIEF.md §8), so the
 * interim wordmark is real Bodoni Moda text: its outline is drawn left to right
 * by a `clip-path` wipe and then fills. `clip-path` and `opacity` are both
 * permitted by §3's global rule. When the logo SVG lands, swap this for the
 * literal §3.4 technique.
 */

const KEY = "vivaah:preloader-seen";
const CAP = 1200; // §4.1 hard ceiling, in ms
const DRAW = 0.7; // §3.4 wordmark draw, in seconds

// Runs during HTML parse, before the overlay below is painted.
const SKIP_SCRIPT = `(function(){try{
  if(sessionStorage.getItem(${JSON.stringify(KEY)})||matchMedia("(prefers-reduced-motion: reduce)").matches){
    document.documentElement.setAttribute("data-preloader","skip");
  }
}catch(e){}})();`;

export function Preloader() {
  const [gone, setGone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const outlineRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const lockupRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const mark = markRef.current;
    const outline = outlineRef.current;
    const fill = fillRef.current;
    const lockup = lockupRef.current;
    if (!root || !mark || !outline || !fill || !lockup) return;

    let seen = false;
    try {
      seen =
        sessionStorage.getItem(KEY) !== null ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      sessionStorage.setItem(KEY, "1"); // set immediately, so a reload cannot replay it
    } catch {
      // Private mode with storage disabled: play it, never block on it.
    }
    if (seen) {
      setGone(true);
      return;
    }

    document.documentElement.style.overflow = "hidden";

    const ctx = gsap.context(() => {
      gsap.set(outline, { clipPath: "inset(0 100% 0 0)" });
      gsap.to(outline, {
        clipPath: "inset(0 0% 0 0)",
        duration: DRAW,
        ease: "power1.inOut",
      });
      // The lockup arrives with the fill, so the drawn line is alone until the
      // wordmark is complete.
      gsap.to([fill, lockup], { opacity: 1, duration: 0.32, delay: DRAW - 0.16 });
    }, root);

    // The release waits for the wordmark to finish drawing and for the fonts and
    // the hero poster to be in, whichever is later, and the cap ends it either
    // way. Cutting the draw short to "release immediately" would show a
    // half-drawn mark, which is not what §4.1 is asking for.
    const poster = new Image();
    poster.src = "/threshold/threshold-poster.jpg";
    const assets = Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      poster.decode().catch(() => undefined),
    ]);
    const drawn = new Promise((r) => setTimeout(r, DRAW * 1000));
    const capped = new Promise((r) => setTimeout(r, CAP));

    let released = false;
    const release = () => {
      if (released) return;
      released = true;

      // Resolve into the nav's wordmark slot: same coordinates, same size. The
      // wordmark itself is measured, not the block around it, so the two marks
      // land on each other rather than merely near each other. `fill` is at the
      // mark's top-left corner, which is why a top-left origin is enough.
      const slot = document.querySelector<HTMLElement>("header [data-brand-slot]");
      const from = fill.getBoundingClientRect();
      const tl = gsap.timeline({
        onComplete: () => {
          document.documentElement.style.overflow = "";
          setGone(true);
        },
      });

      if (slot) {
        const to = slot.getBoundingClientRect();
        const scale = to.height / from.height;
        tl.to(mark, {
          x: to.left - from.left,
          y: to.top - from.top,
          scale,
          duration: 0.4,
          ease: "power2.inOut",
        });
      }
      // Ground fades on opacity only. No curtain, no wipe (§4.1).
      tl.to(root, { opacity: 0, duration: 0.26, ease: "power2.out" }, "-=0.1");
    };

    Promise.all([drawn, assets]).then(release);
    capped.then(release);

    return () => {
      ctx.revert();
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (gone) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SKIP_SCRIPT }} />
      <div
        ref={rootRef}
        aria-hidden="true"
        /* No `grain` here: that utility sets position:relative and, being a
           later rule in the same layer, beats `fixed`. The ground is flat. */
        className="vv-preloader fixed inset-0 z-[60] flex items-center justify-center bg-violet-950"
      >
        <div ref={markRef} className="origin-top-left leading-none">
          <div className="relative">
            {/* The fill sits in flow and sets the box; the outline lies exactly
                over it and is what gets drawn. */}
            <span
              ref={fillRef}
              className="block font-display text-[clamp(2.75rem,9vw,5rem)] tracking-tight text-porcelain-50 opacity-0"
            >
              {SHOP.short}
            </span>
            <span
              ref={outlineRef}
              className="absolute inset-0 block font-display text-[clamp(2.75rem,9vw,5rem)] tracking-tight text-transparent"
              style={{ WebkitTextStroke: "0.7px var(--color-porcelain-50)" }}
            >
              {SHOP.short}
            </span>
          </div>
          <span
            ref={lockupRef}
            className="mt-1 block text-[0.5rem] font-medium uppercase tracking-[0.22em] text-violet-300 opacity-0"
          >
            {SHOP.lockup}
          </span>
        </div>
      </div>
    </>
  );
}
