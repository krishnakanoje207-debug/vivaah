"use client";

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * A heading whose letters ripple.
 *
 * Two behaviours on the same split text, and the split is the point: the letters
 * are real spans, so the wave can travel along the line instead of the whole
 * block easing in as one lump.
 *
 *   1. On scroll in — a wave. Letters arrive left to right, each lifting from
 *      below with a slight rotation, so the line assembles rather than fades.
 *      This is the half that matters: it fires for everyone, including touch,
 *      where `DistortHeading`'s pointer effect can never run and the owner would
 *      never see it.
 *   2. Under the pointer — a travelling ripple. Letters near the cursor lift,
 *      falling off with distance on a gaussian, so moving across the line pushes
 *      a bump through it. Desktop fine-pointer only.
 *
 * Why this and not more `DistortHeading`: that component distorts the heading as
 * one raster through an SVG filter, which is a texture effect and costs a filter
 * pass per frame. This moves per-letter transforms only, which is what §3 (v3)
 * allows everywhere and what a mid-range Android can actually carry.
 *
 * Accessibility: the real string is on the heading as `aria-label` and every
 * span is `aria-hidden`, so assistive tech reads one heading, not a column of
 * letters, and translation still sees the label. Under reduced motion nothing
 * splits at all: the heading renders as plain text with no spans and no
 * listeners, which is also the no-JS state.
 */

// The wave. Element reveals are 0.7s/70ms (v2 §4); 70ms per LETTER would take
// four seconds on a line this long, so the stagger is per-letter here and the
// duration is the shared one.
const IN_DURATION = 0.7;
const IN_STAGGER = 0.022;
const IN_RISE = "0.44em";

// The pointer ripple.
const AMPLITUDE = 10; // px of lift at the cursor
const FALLOFF = 68; // px; distance at which the lift is ~37% of amplitude
const EASE_IN = 0.22; // approach rate toward the target, per tick

type Props = {
  children: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  /** Skip the pointer ripple and keep only the scroll wave. */
  staticAfterReveal?: boolean;
  /** One word in the heading to set in italic, matched without punctuation. */
  italic?: string;
};

export function RippleHeading({
  children,
  as: Tag = "h2",
  className = "",
  staticAfterReveal = false,
  italic,
}: Props) {
  const ref = useRef<HTMLHeadingElement>(null);

  // Split into words first so a word never breaks across a line, then letters
  // inside each word. Spaces stay as real text between the word spans.
  const words = useMemo(() => children.split(/(\s+)/), [children]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const letters = Array.from(el.querySelectorAll<HTMLElement>("[data-letter]"));
    if (!letters.length) return;

    const ctx = gsap.context(() => {
      // ---- 1. the wave in -------------------------------------------------
      gsap.set(letters, { yPercent: 0, y: IN_RISE, opacity: 0, rotate: 2.5 });
      gsap.to(letters, {
        y: 0,
        opacity: 1,
        rotate: 0,
        duration: IN_DURATION,
        stagger: IN_STAGGER,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
      });
    }, el);

    if (staticAfterReveal || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return () => ctx.revert();
    }

    // ---- 2. the pointer ripple -------------------------------------------
    // quickTo gives each letter its own interpolator, so the bump keeps its
    // shape instead of every letter chasing the same tween.
    const setters = letters.map((l) =>
      gsap.quickTo(l, "yPercent", { duration: EASE_IN, ease: "power3.out" })
    );
    let centres: number[] = [];

    const measure = () => {
      const base = el.getBoundingClientRect().left;
      centres = letters.map((l) => {
        const r = l.getBoundingClientRect();
        return r.left - base + r.width / 2;
      });
    };
    measure();

    const onMove = (e: PointerEvent) => {
      const base = el.getBoundingClientRect().left;
      const px = e.clientX - base;
      for (let i = 0; i < letters.length; i++) {
        const d = (px - centres[i]) / FALLOFF;
        // Gaussian bump, expressed in percent of the letter's own height so it
        // stays proportional across the fluid type scale.
        setters[i](-AMPLITUDE * Math.exp(-d * d));
      }
    };

    const onLeave = () => {
      for (const set of setters) set(0);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", measure);
    // The line rewraps as fonts settle; re-measure once they have.
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", measure);
      ctx.revert();
    };
  }, [children, staticAfterReveal]);

  return (
    <Tag ref={ref as never} className={className} aria-label={children}>
      {words.map((chunk, wi) =>
        /\s/.test(chunk) ? (
          <span key={wi} aria-hidden="true">
            {chunk}
          </span>
        ) : (
          // inline-block per word keeps the wrap on word boundaries; the letters
          // inside need their own inline-block to accept a transform at all.
          <span
            key={wi}
            aria-hidden="true"
            className={`inline-block whitespace-nowrap${
              italic && chunk.replace(/[^\p{L}]/gu, "").toLowerCase() === italic.toLowerCase()
                ? " italic"
                : ""
            }`}
          >
            {Array.from(chunk).map((ch, ci) => (
              <span key={ci} data-letter className="inline-block will-change-transform">
                {ch}
              </span>
            ))}
          </span>
        )
      )}
    </Tag>
  );
}
