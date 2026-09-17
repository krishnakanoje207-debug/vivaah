"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";

/**
 * `parallax` — the device the score assigns to Rooms III and IV
 * (DESIGN_SPEC_V3 §2.6). Depth inside a room, on a dark ground in IV, without a
 * second film anywhere.
 *
 * §2.5 bans the `scrub` *device* past the threshold, meaning a scroll-bound
 * playhead over a continuous surface. Parallax is scroll-linked by definition
 * and is separately licensed by the score, so it is not that ban.
 *
 * Only `transform` moves. Reduced motion: nothing moves at all.
 *
 * ScrollTrigger arrives late and only if it is wanted (17 Sep 2026). Every
 * parallax on the site is below the fold, and importing ScrollTrigger at mount
 * put its module, its scroll listeners, its rAF loop and its `100vh` probe on
 * the critical path of a page that could not move for another two screens. Now
 * an IntersectionObserver two viewports ahead loads it, which is far enough out
 * that the trigger is built and positioned long before `top bottom` — the
 * moment this tween actually starts — comes round. Nothing looks different; it
 * begins existing later.
 */
export function Parallax({
  children,
  distance = 40,
  className = "",
}: {
  children: ReactNode;
  /** Total travel in px across the element's pass through the viewport. */
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ctx: gsap.Context | null = null;
    let cancelled = false;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
          if (cancelled) return;
          gsap.registerPlugin(ScrollTrigger);
          ctx = gsap.context(() => {
            gsap.fromTo(
              el,
              { y: distance / 2 },
              {
                y: -distance / 2,
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.5,
                },
              }
            );
          }, el);
        });
      },
      { rootMargin: "200% 0px" }
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      ctx?.revert();
    };
  }, [distance]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
