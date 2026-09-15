"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import { gsap } from "gsap";
import { Parallax } from "@/components/site/Parallax";
import { SakuraTree } from "@/components/site/SakuraTree";
import { RETAIL_CATEGORIES } from "@/lib/categories";

/**
 * The retail head's picture: an arcade of three planes, and the rail turning
 * over inside it.
 *
 * Why (owner, 14 Sep 2026: the head "looks plain and damped"). Every other
 * page opens on depth — the garden behind the name on `/`, the film on
 * `/rentals`, the vault on `/jewellery` — and retail opened on three small
 * arches floating on white. So the arch, the site's own shape, is used at full
 * scale here, in three planes that part as the page scrolls:
 *
 *   back    a violet-950 doorway with a gold keyline drawn inside its arch
 *   middle  the photograph, one category at a time
 *   front   a small plate with the category that comes next
 *
 * The turnover is the page's one fact made visible: the stock changes most
 * days. It walks the real category list (their own photographs and names,
 * nothing invented), and the name in the doorway is a link to that category,
 * so the motion is also the fastest way into the rail.
 *
 * The hold is a CSS animation on the gold hairline, and the plate advances on
 * its `animationend`, so the bar and the photograph can never drift apart and
 * pausing is exact. It pauses under a mouse, while anything inside has focus,
 * while the arcade is off screen, and on the visitor's own pause button
 * (WCAG 2.2.2: moving content longer than five seconds needs one).
 *
 * Reduced motion, and the server render: the first category, still. No
 * turnover, no wipe, no parallax (`Parallax` stands down on its own).
 */

// How long each category holds the plate. Long enough to read a two-line name
// and reach it with a pointer; short enough that the rail visibly moves.
const HOLD_MS = 3400;

const CATS = RETAIL_CATEGORIES.filter((c) => c.image);

export function RetailArcade() {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  // Only the plates that have been on show, plus the one coming up, are in the
  // DOM: nine photographs is ~800 KB, and a visitor who reads the head and
  // scrolls on should not pay for the ones she never saw.
  const [mounted, setMounted] = useState(() => new Set([0, 1]));
  // True until the client says motion is welcome, so the server render and the
  // reduced-motion render are the same still frame.
  const [still, setStill] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [onScreen, setOnScreen] = useState(true);

  const next = (i + 1) % CATS.length;
  const playing = !still && !paused && !hover && !focus && onScreen;

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setStill(false);

    // The planes come up off the floor, back to front, the way a garment is
    // lifted onto the rail. The clip is cleared afterwards: left in place,
    // `inset(0)` would cut off the keyline, which is drawn just outside the edge.
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-plane]",
        { clipPath: "inset(100% 0 0 0)" },
        {
          clipPath: "inset(0% 0 0 0)",
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.14,
          clearProps: "clipPath",
        }
      );
    }, el);

    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);

    return () => {
      io.disconnect();
      ctx.revert();
    };
  }, []);

  const advance = () => {
    const n = (i + 1) % CATS.length;
    setI(n);
    setMounted((m) => new Set(m).add(n).add((n + 1) % CATS.length));
  };

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false);
  };

  const plates = (show: number) =>
    CATS.map((c, k) =>
      mounted.has(k) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={c.slug}
          src={c.image}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-out-strong ${
            k === show ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null
    );

  const cat = CATS[i];

  return (
    <div
      ref={ref}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={onBlur}
      /* Width is capped by a height budget so the arcade and the fact rail
         under it fit one screen; `aspect-ratio` then sets the height. Capping
         the height directly would narrow the box from an unknown side. From md
         the width is explicit: the column is `auto`, and a percentage width
         inside an auto track has nothing to resolve against. */
      className="relative isolate mx-auto aspect-[7/8] w-full max-w-[26rem] md:mx-0 md:w-[min(calc(min(66svh,48rem)*7/8),48vw)] md:max-w-none"
    >
      {/* The sakura branch behind every plane. Its box is drawn against the
          arcade (see SakuraTree's header), hence the offsets. */}
      <SakuraTree className="absolute -z-10 left-[-60%] top-[-19.26%] w-[220%] max-w-none" />

      {/* ---- back: the doorway ------------------------------------------ */}
      <Parallax distance={14} className="absolute right-0 top-0 h-[84%] w-[68%]">
        <div
          data-plane
          className="on-dark grain arch relative h-full w-full overflow-hidden bg-violet-950"
        >
          {/* The drawn keyline, GoldFrame's hairline turned to follow the arch
              rather than a rectangle laid over it. */}
          <div
            aria-hidden="true"
            className="arch pointer-events-none absolute inset-3 border border-gold-500/35 md:inset-4"
          />

          {/* The readout sits in the part of the doorway the two photographs
              leave open: right of the plate, below the dome, above the front
              plate. Percentages of the doorway, so it holds at every width. */}
          <div className="absolute left-[43%] right-[9%] top-[24%]">
            <div className="flex items-center gap-2">
              {!still && (
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? "Play the rail" : "Pause the rail"}
                  className="press -ml-1.5 flex h-6 w-6 shrink-0 items-center justify-center text-gold-500"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    {paused ? (
                      <path d="M2 1L9 5L2 9Z" fill="currentColor" />
                    ) : (
                      <path d="M2 1H4V9H2ZM6 1H8V9H6Z" fill="currentColor" />
                    )}
                  </svg>
                </button>
              )}
              <span className="relative h-px flex-1 overflow-hidden bg-gold-500/25">
                {!still && (
                  <span
                    key={i}
                    onAnimationEnd={advance}
                    className="retail-hold absolute inset-0 bg-gold-500"
                    style={{ animationPlayState: playing ? "running" : "paused" }}
                  />
                )}
              </span>
            </div>

            <Link
              key={cat.slug}
              href={`/retail?category=${cat.slug}`}
              className="retail-name group mt-3 block font-display text-[1.0625rem] leading-tight text-porcelain-50 sm:text-h3"
            >
              {cat.name}
              <span
                aria-hidden="true"
                className="ml-2 hidden text-gold-500 sm:inline-block transition-transform duration-[180ms] ease-out-strong group-hover:translate-x-1"
              >
                &#8594;
              </span>
            </Link>
          </div>
        </div>
      </Parallax>

      {/* ---- middle: the photograph -------------------------------------- */}
      <Parallax distance={40} className="absolute bottom-[6%] left-0 h-[80%] w-[58%]">
        <div
          data-plane
          className="keyline arch relative h-full w-full overflow-hidden bg-porcelain-200 shadow-card"
        >
          {plates(i)}
        </div>
      </Parallax>

      {/* ---- front: what comes next -------------------------------------- */}
      <Parallax distance={76} className="absolute bottom-0 right-[6%] w-[30%]">
        <div
          data-plane
          className="keyline arch relative aspect-[3/4] w-full overflow-hidden bg-porcelain-200 shadow-lift"
        >
          {plates(next)}
        </div>
      </Parallax>
    </div>
  );
}
