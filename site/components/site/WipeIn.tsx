"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * `reveal` per object — Room V's device (DESIGN_SPEC_V3 §2.6): a wipe per
 * object, which is also the grammar the retail listing page will inherit.
 *
 * A `clip-path` wipe, not a fade, so it reads as a garment coming off the rail
 * rather than as one more section fading up. `clip-path` is one of the three
 * properties §3 permits. Children opt in with [data-wipe].
 *
 * Reduced motion: final state, no animation.
 */
export function WipeIn({
  children,
  stagger = 0.09,
  className = "",
}: {
  children: ReactNode;
  stagger?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = el.querySelectorAll<HTMLElement>("[data-wipe]");
    const items = targets.length ? targets : [el];

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(items, { clipPath: "inset(0 0 0% 0)" });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { clipPath: "inset(0 0 100% 0)" },
        {
          clipPath: "inset(0 0 0% 0)",
          duration: 0.7,
          ease: "power2.out",
          stagger,
          scrollTrigger: { trigger: el, start: "top 80%", once: true },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
