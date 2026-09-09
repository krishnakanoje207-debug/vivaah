"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { formatINR } from "@/lib/format";

gsap.registerPlugin(ScrollTrigger);

/**
 * Room II's device: `count` (DESIGN_SPEC_V3 §2.6). A real figure lands by
 * counting to itself once, when the room is reached. Real figures only, never a
 * number invented to have something to animate.
 *
 * The final string is rendered invisibly underneath to reserve the box, so a
 * figure growing from one digit to five never reflows the line beside it.
 *
 * Reduced motion: the final value, immediately, no tween.
 */
export function CountFigure({
  value,
  prefix = "",
  className = "",
}: {
  value: number;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(() => `${prefix}${formatINR(value)}`);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(`${prefix}${formatINR(value)}`);
      return;
    }

    const state = { n: 0 };
    setDisplay(`${prefix}${formatINR(0)}`);

    const ctx = gsap.context(() => {
      gsap.to(state, {
        n: value,
        duration: 1.1,
        ease: "power2.out",
        onUpdate: () => setDisplay(`${prefix}${formatINR(Math.round(state.n))}`),
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
      });
    }, el);

    return () => ctx.revert();
  }, [value, prefix]);

  return (
    <span ref={ref} className={`relative inline-block tabular ${className}`}>
      {/* Reserves the width of the settled figure. */}
      <span aria-hidden="true" className="invisible">
        {prefix}
        {formatINR(value)}
      </span>
      <span className="absolute inset-0">{display}</span>
    </span>
  );
}
