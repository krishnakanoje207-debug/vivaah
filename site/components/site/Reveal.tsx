"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Reveal-on-scroll (§4): opacity 0→1, y 14→0, 0.45s power3.out, optional stagger,
 * fires once at 80% viewport. Under prefers-reduced-motion it renders the final
 * state immediately (no motion). Children each get the reveal via [data-reveal].
 *
 * 0.45s, not the 0.7s this shipped with. This is the most-used motion on the
 * site — nearly every block on every page arrives through it — and at 0.7s with
 * a 0.07s stagger a five-item group took 1.05s to finish assembling, which is
 * long enough to be waited on rather than just seen. Scroll reveals are not UI
 * feedback so they are not held to the 300ms ceiling, but they do have to finish
 * before the reader's eye does. power3.out over power2.out for the same reason
 * the CSS curves were strengthened: more of the travel happens in the first few
 * frames, so the block reads as already-arrived rather than still-arriving.
 */
export function Reveal({
  children,
  stagger = 0.05,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  stagger?: number;
  className?: string;
  as?: "div" | "section" | "ul" | "li";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = el.querySelectorAll<HTMLElement>("[data-reveal]");
    const items = targets.length ? targets : [el];

    if (reduce) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: "power3.out",
          stagger,
          scrollTrigger: { trigger: el, start: "top 80%", once: true },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [stagger]);

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
