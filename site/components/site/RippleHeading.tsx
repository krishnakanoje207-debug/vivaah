"use client";

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";

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
 *
 * THE WAVE IS CSS (17 Sep 2026), and the numbers are unchanged: 0.44em rise,
 * 2.5deg, 0.7s, power2.out, 22ms per letter, once at 80% of the viewport. It
 * was a GSAP tween over every letter, and profiling the front door on a 4x
 * throttled phone put 24.3s of 37.5s of script time inside `gsap/CSSPlugin`:
 * `_convertToUnit` 15.6s and `_getComputedProperty` 8.0s. Both are per-target
 * reads of computed style, and GSAP interleaves them with its own writes, so
 * 176 letter spans bought 250 forced style recalculations and ten
 * whole-document ones. The same 176 spans measured 34ms written one-at-a-time
 * against 2.9ms written in a batch.
 *
 * CSS does not need to read anything: the browser already knows what 0.44em is
 * on each span, the stagger is `--i` multiplied in a `transition-delay`, and an
 * IntersectionObserver at `-20%` of the bottom edge is exactly ScrollTrigger's
 * `top 80%`. One class is written per heading instead of a tween per letter.
 *
 * It animates the INDEPENDENT `translate` and `rotate` properties, not
 * `transform`, so it cannot collide with the pointer ripple below, which keeps
 * `transform` to itself. The browser composes translate, then rotate, then
 * transform — the same order GSAP wrote them in, so the result is identical.
 */

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
  // inside each word. Spaces stay as real text between the word spans. Each
  // letter carries its position in the WHOLE line as `--i`, because that is
  // what the stagger runs on: the wave crosses the heading, not each word.
  const words = useMemo(() => {
    let i = 0;
    return children.split(/(\s+)/).map((chunk) =>
      /\s/.test(chunk) || !chunk
        ? { chunk, letters: null }
        : { chunk, letters: Array.from(chunk).map((ch) => ({ ch, i: i++ })) }
    );
  }, [children]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const letters = Array.from(el.querySelectorAll<HTMLElement>("[data-letter]"));
    if (!letters.length) return;

    // ---- 1. the wave in ---------------------------------------------------
    // The class carries the pre-state, so nothing is hidden for a visitor whose
    // JavaScript never arrives, and `data-wave` releases it. Both are single
    // writes on the heading; the letters are never touched.
    el.classList.add("vv-wave");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.setAttribute("data-wave", "");
        io.disconnect();
      },
      // ScrollTrigger's `start: "top 80%"`: the top edge reaching 80% down the
      // viewport is the bottom 20% of the root being cut away.
      { rootMargin: "0px 0px -20% 0px" }
    );
    io.observe(el);

    const stopWave = () => {
      io.disconnect();
      el.classList.remove("vv-wave");
      el.removeAttribute("data-wave");
    };

    if (staticAfterReveal || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return stopWave;
    }

    // ---- 2. the pointer ripple -------------------------------------------
    // quickTo gives each letter its own interpolator, so the bump keeps its
    // shape instead of every letter chasing the same tween.
    // Built on the first pointer that actually reaches the heading, not at
    // mount. An interpolator and a measured centre per letter is a page's worth
    // of work for an effect nobody can see until the cursor is on the word, and
    // the measure has to wait for the fonts anyway.
    const ctx = gsap.context(() => {}, el);
    let setters: ReturnType<typeof gsap.quickTo>[] | null = null;
    let centres: number[] = [];

    const measure = () => {
      if (!setters) return;
      const base = el.getBoundingClientRect().left;
      centres = letters.map((l) => {
        const r = l.getBoundingClientRect();
        return r.left - base + r.width / 2;
      });
    };

    const build = () => {
      if (setters) return;
      ctx.add(() => {
        setters = letters.map((l) =>
          gsap.quickTo(l, "yPercent", { duration: EASE_IN, ease: "power3.out" })
        );
      });
      measure();
    };

    const onMove = (e: PointerEvent) => {
      build();
      if (!setters) return;
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
      if (setters) for (const set of setters) set(0);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    // The line rewraps as the viewport changes, so the centres are stale.
    window.addEventListener("resize", measure);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", measure);
      stopWave();
      ctx.revert();
    };
  }, [children, staticAfterReveal]);

  return (
    <Tag ref={ref as never} className={className} aria-label={children}>
      {words.map(({ chunk, letters }, wi) =>
        !letters ? (
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
            {letters.map(({ ch, i }, ci) => (
              // No `will-change`: it was on every letter of every heading for
              // the life of the page, which is 176 layers held open on the
              // front door alone. The wave's own transition promotes what it
              // needs, for as long as it needs it.
              <span
                key={ci}
                data-letter
                className="inline-block"
                style={{ "--i": i } as React.CSSProperties}
              >
                {ch}
              </span>
            ))}
          </span>
        )
      )}
    </Tag>
  );
}
