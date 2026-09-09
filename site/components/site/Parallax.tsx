"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

    const ctx = gsap.context(() => {
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

    return () => ctx.revert();
  }, [distance]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
