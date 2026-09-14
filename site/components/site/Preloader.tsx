"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { LoadingMark } from "@/components/site/LoadingMark";

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
 * It CONTINUES the loading screen instead of following it (14 Sep 2026). The
 * home page is `force-dynamic`, so a first visit always shows `loading.tsx`
 * first, for as long as Neon takes, and the two used to be different screens:
 * a hairline for seconds, then this mark drawn again from nothing. Now both
 * render the same `LoadingMark`, in the same place (both are centred in the
 * area under the nav, which is why this ground starts at `top-16` and no longer
 * covers the nav), and the inline script reads how far the loading screen's
 * draw had got and starts this one's animations at exactly that point. The
 * visitor sees one name drawn once and one stitch still running, which then
 * lifts into the nav.
 *
 * The draw is CSS now (see LoadingMark), and this component only times the
 * release. That also removes a flash the GSAP draw had: the server HTML showed
 * the outline fully drawn until hydration clipped it back to nothing and drew
 * it again.
 *
 * The interim wordmark is still real Bodoni Moda text wiped by `clip-path`
 * (§7.2). When the logo SVG lands, swap LoadingMark for the literal §3.4
 * technique and both screens follow.
 */

const KEY = "vivaah:preloader-seen";
const CAP = 1200; // §4.1 hard ceiling, in ms

// Runs during HTML parse, before the overlay below is painted. When the page
// streamed in behind a loading screen, that screen is still in the DOM at this
// moment (React swaps it out just after), so how long its mark has been
// running can be read and handed on as a negative animation delay. Measured
// from the timeline, not `currentTime`: a finished draw reports its own end
// (700ms) however long ago it finished, which restarted the stitch.
const SKIP_SCRIPT = `(function(){try{
  var d=document.documentElement;
  if(sessionStorage.getItem(${JSON.stringify(KEY)})||matchMedia("(prefers-reduced-motion: reduce)").matches){
    d.setAttribute("data-preloader","skip");return;
  }
  var o=document.querySelector("[data-vv-loading] .vv-mark-outline");
  var a=o&&o.getAnimations&&o.getAnimations()[0];
  if(a&&a.startTime!=null)d.style.setProperty("--vv-mark-at",-Math.round(document.timeline.currentTime-a.startTime)+"ms");
}catch(e){}})();`;

export function Preloader() {
  const [gone, setGone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const ground = groundRef.current;
    const mark = markRef.current;
    const fill = mark?.querySelector<HTMLElement>("[data-mark-fill]");
    const stitch = mark?.querySelector<HTMLElement>(".vv-stitch");
    const html = document.documentElement;
    if (!root || !ground || !mark || !fill || !stitch) return;

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

    html.style.overflow = "hidden";

    // The release waits for the name to be drawn and filled (the CSS
    // animations' own `finished`, which already accounts for however much of
    // the draw the loading screen did) and for the fonts and the hero poster,
    // whichever is later; the cap ends it either way. The stitch loops forever,
    // so it is not waited on.
    const drawn = Promise.all(
      mark
        .getAnimations({ subtree: true })
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    );
    const poster = new Image();
    poster.src = "/threshold/threshold-poster.jpg";
    const assets = Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      poster.decode().catch(() => undefined),
    ]);
    const capped = new Promise((r) => setTimeout(r, CAP));

    let tl: gsap.core.Timeline | null = null;
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
      // The nav's own name (and its lockup) is hidden by globals.css while this
      // is up. It fades back in on THIS timeline, as the travelling mark lands
      // on it and fades out, so the porcelain mark becomes the nav's ink one
      // where they meet. A CSS transition did the same on its own clock and
      // drifted from the flight whenever hydration held the main thread.
      const home = slot ? [slot, slot.nextElementSibling].filter(Boolean) : [];
      gsap.set(home, { opacity: 0 }); // inline, so lifting the CSS hide cannot flash it
      root.setAttribute("data-released", "");
      tl = gsap.timeline({
        onComplete: () => {
          gsap.set(home, { clearProps: "opacity" });
          html.style.overflow = "";
          html.style.removeProperty("--vv-mark-at");
          setGone(true);
        },
      });
      tl.to(stitch, { opacity: 0, duration: 0.2, ease: "power2.out" }, 0);
      if (slot) {
        const to = slot.getBoundingClientRect();
        tl.to(
          mark,
          {
            x: to.left - from.left,
            y: to.top - from.top,
            scale: to.height / from.height,
            duration: 0.45,
            ease: "power2.inOut",
          },
          0,
        );
      }
      tl.to(mark, { opacity: 0, duration: 0.14, ease: "power1.in" }, 0.33);
      tl.to(home, { opacity: 1, duration: 0.18, ease: "power1.out" }, 0.31);
      // Ground fades on opacity only. No curtain, no wipe (§4.1).
      tl.to(ground, { opacity: 0, duration: 0.3, ease: "power2.out" }, 0.15);
    };

    Promise.all([drawn, assets]).then(release);
    capped.then(release);

    return () => {
      tl?.kill();
      html.style.overflow = "";
      html.style.removeProperty("--vv-mark-at");
    };
  }, []);

  if (gone) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SKIP_SCRIPT }} />
      <div
        ref={rootRef}
        aria-hidden="true"
        className="vv-preloader fixed inset-x-0 bottom-0 top-16 z-[60] flex items-center justify-center"
      >
        {/* The ground is its own layer so it can fade while the mark, which
            has somewhere to go, stays solid until it arrives. No `grain`: that
            utility sets position:relative and would beat `absolute`. */}
        <div ref={groundRef} className="absolute inset-0 bg-violet-950" />
        <div ref={markRef} className="relative origin-top-left">
          <LoadingMark />
        </div>
      </div>
    </>
  );
}
