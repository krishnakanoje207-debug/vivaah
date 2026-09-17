"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * `reveal` per object — Room V's device (DESIGN_SPEC_V3 §2.6): a wipe per
 * object, which is also the grammar the retail listing page will inherit.
 *
 * A `clip-path` wipe, not a fade, so it reads as a garment coming off the rail
 * rather than as one more section fading up. `clip-path` is one of the three
 * properties §3 permits. Children opt in with [data-wipe].
 *
 * Reduced motion: final state, no animation.
 *
 * CSS, not GSAP (17 Sep 2026) — same reasoning and the same numbers as Reveal:
 * 0.7s, power2.out (easeOutCubic), 90ms between objects, once at 80% viewport.
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = el.querySelectorAll<HTMLElement>("[data-wipe]");
    targets.forEach((t, i) => t.style.setProperty("--i", String(i)));
    el.style.setProperty("--wipe-step", `${stagger}s`);
    el.classList.add("vv-wipe");
    if (!targets.length) el.classList.add("vv-wipe-self");

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.setAttribute("data-wiped", "");
        io.disconnect();
      },
      { rootMargin: "0px 0px -20% 0px" }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      el.classList.remove("vv-wipe", "vv-wipe-self");
      el.removeAttribute("data-wiped");
    };
  }, [stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
