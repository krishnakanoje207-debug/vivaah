"use client";

import { useEffect, useRef, type ReactNode } from "react";

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
 *
 * CSS, not GSAP (17 Sep 2026), for the reason set out in RippleHeading's header:
 * a GSAP tween reads computed style once per target and writes between the
 * reads, so a page of reveals is a page of forced style recalculations. Nothing
 * here is different to look at — the distance, the duration, the curve, the
 * stagger and the 80% line are the tween's own numbers, and `power3.out` is
 * easeOutQuart. Because it is the most-used motion on the site, it is also
 * where GSAP and ScrollTrigger were pulled onto almost every page; they are not
 * imported here any more.
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // One pass of writes, no reads between them, so the whole group costs a
    // single style recalculation instead of one per child.
    const targets = el.querySelectorAll<HTMLElement>("[data-reveal]");
    targets.forEach((t, i) => t.style.setProperty("--i", String(i)));
    el.style.setProperty("--reveal-step", `${stagger}s`);
    el.classList.add("vv-reveal");
    if (!targets.length) el.classList.add("vv-reveal-self");

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.setAttribute("data-revealed", "");
        io.disconnect();
      },
      // ScrollTrigger's `start: "top 80%"`.
      { rootMargin: "0px 0px -20% 0px" }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      el.classList.remove("vv-reveal", "vv-reveal-self");
      el.removeAttribute("data-revealed");
    };
  }, [stagger]);

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
