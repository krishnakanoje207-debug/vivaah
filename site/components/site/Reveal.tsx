"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Reveal-on-scroll (§4): opacity 0→1, y 14→0, 0.7s power2.out, optional stagger,
 * fires once at 80% viewport. Under prefers-reduced-motion it renders the final
 * state immediately (no motion). Children each get the reveal via [data-reveal].
 */
export function Reveal({
  children,
  stagger = 0.07,
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
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
