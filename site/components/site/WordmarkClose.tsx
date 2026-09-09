"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * The close: the shop's name, oversized, cropped by the bottom of the page.
 *
 * This is the landing page's ending, and it is deliberately the one thing the
 * page does that `/rentals` does not. v3 §8.2 forbids the home page reusing the
 * room sequence or carrying a second scrubbed film; a typographic close breaks
 * neither, and it still lands where SCORE.md says a close should land, "back to
 * the threshold's dark, now still, the shop, plainly".
 *
 * Three decisions worth recording, because the obvious version of this effect
 * fails on this site specifically:
 *
 *   1. **It is ornament, not information.** The mark is `aria-hidden` and the
 *      real close (the invitation, the address, the hours) sits above it in
 *      normal type at normal contrast. A giant word at 1.4:1 is a texture. If it
 *      were carrying the shop's name for a screen reader or for a customer on a
 *      dim phone, the contrast would have to clear AA and the effect would die.
 *   2. **Bodoni Moda is a Didone, so it cannot go as faint as a grotesque can.**
 *      The reference for this pattern uses a fat sans, whose stems survive at
 *      almost no contrast. Bodoni's hairlines would vanish outright on a
 *      mid-range Android at low brightness. So the fill is violet-900 on
 *      violet-950 (a real step, not a whisper) and the weight is pushed to 600
 *      with `opsz` pinned to the top of its axis, which is the cut with the
 *      thickest hairline the family has.
 *   3. **It is cropped, not centred.** The descender line sits below the section
 *      edge, so the word runs out of the page rather than sitting in it. That is
 *      what stops it reading as a logo dropped into a box.
 *
 * Motion: the mark drifts up slower than the page, so it settles as the section
 * arrives. Transform only. Under reduced motion it renders in its final position
 * and nothing moves.
 */
export function WordmarkClose({
  word = "Vivaah",
  children,
}: {
  /** The mark itself. Kept a prop so the real logo can replace it when it lands. */
  word?: string;
  /** The actual close: the invitation and the practical detail, in real type. */
  children: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const mark = markRef.current;
    if (!section || !mark) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        mark,
        { yPercent: 14 },
        {
          yPercent: 0,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom bottom",
            scrub: true,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      data-dark=""
      className="on-dark grain relative overflow-hidden bg-violet-950 text-porcelain-50"
    >
      <div className="shell relative z-10 pt-28 pb-40 md:pt-40 md:pb-56">{children}</div>

      {/* The mark. Pinned to the bottom and allowed to run off it: `bottom` is
          negative by a fraction of its own size, so the baseline and everything
          under it leaves the page. */}
      <div
        ref={markRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-[0.30em] select-none text-center"
      >
        <span
          className="block font-display leading-none text-violet-900"
          style={{
            fontSize: "clamp(5rem, 22vw, 20rem)",
            fontWeight: 600,
            fontVariationSettings: '"opsz" 96',
            letterSpacing: "-0.02em",
          }}
        >
          {word}
        </span>
      </div>
    </section>
  );
}
