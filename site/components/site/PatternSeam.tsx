"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The pattern-draft seam — the signature move (DESIGN_SPEC_V3 §3.3).
 *
 * One photograph, one technical line drawing of the same garment, and a seam the
 * visitor drags between them. It moves only when dragged: no scrub, no autoplay
 * sweep. Only `clip-path` is animated, per §3's global rule.
 *
 * The drawing is a precomputed PNG from `tools/pattern_draft.py`, not a live SVG
 * edge-detect filter as §3.3 first specified. A live `feConvolveMatrix` over a
 * full-column image costs a filter pass per frame of the drag on the mid-range
 * Android this shop's customers use (BRIEF.md §4); the offline pass is free at
 * runtime and lets the lines be hand-cleaned. Recorded as an amendment in
 * DESIGN_SPEC_V3 §3.3.
 *
 * Reduced motion: static two-up, both sides fully visible, no drag implied.
 */

const STEP = 5; // §3.3: arrow keys move the seam 5% per press

// Both pictures are lazy. The seam is Room III of /rentals, some 6000px down a
// 10926px page, and the pair was 133 KB fetched before first paint by everyone
// including the shopper who never scrolled that far. No srcset to go with it:
// the stage is the full shell width on a phone (339px at 412, so 678 device
// pixels at 2x) and half the shell from md (732px at 1920), and the sources are
// 660px wide, so every candidate a ladder could offer is one the browser would
// pass over. Nor intrinsic width/height: this takes arbitrary paths and cannot
// know them, and both layouts already fix the box at aspect-[3/4], so there is
// no shift for an attribute ratio to prevent.

export function PatternSeam({
  photo,
  draft,
  alt,
  className = "",
}: {
  photo: string;
  draft: string;
  alt: string;
  className?: string;
}) {
  const [seam, setSeam] = useState(56); // percent from the left edge
  const [reduced, setReduced] = useState(false);
  const [decided, setDecided] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    setDecided(true);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const seamFromEvent = (clientX: number) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSeam(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    stageRef.current?.setPointerCapture(e.pointerId);
    seamFromEvent(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    seamFromEvent(e.clientX);
  };

  const endDrag = (e: React.PointerEvent) => {
    dragging.current = false;
    stageRef.current?.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSeam((s) => Math.max(0, s - STEP));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSeam((s) => Math.min(100, s + STEP));
    }
  };

  // Two-up until the media query has been read, so the first paint is never a
  // seam that a reduced-motion visitor is about to be denied.
  if (!decided || reduced) {
    return (
      <div className={`grid grid-cols-2 gap-3 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="keyline aspect-[3/4] w-full bg-porcelain-50 object-cover"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={draft}
          alt={`${alt}, drawn as a pattern draft`}
          loading="lazy"
          decoding="async"
          className="keyline aspect-[3/4] w-full bg-porcelain-50 object-cover"
        />
      </div>
    );
  }

  return (
    <div
      ref={stageRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`keyline relative aspect-[3/4] w-full cursor-ew-resize touch-pan-y select-none overflow-hidden bg-porcelain-50 ${className}`}
      style={{ ["--seam-x" as string]: `${seam}%` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt={alt}
        draggable={false}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* The draft sits above the photograph and is clipped back to the seam. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={draft}
        alt=""
        aria-hidden="true"
        draggable={false}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: "inset(0 calc(100% - var(--seam-x)) 0 0)" }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-px bg-gold-600"
        style={{ left: "var(--seam-x)" }}
      />

      {/* 44px hit target; the drawn ring inside it is the visible handle. */}
      <button
        type="button"
        role="slider"
        aria-label="Drag to reveal the pattern draft"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(seam)}
        aria-valuetext={`Pattern draft covers ${Math.round(seam)} percent`}
        onKeyDown={onKeyDown}
        className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{ left: "var(--seam-x)" }}
      >
        <span
          aria-hidden="true"
          className="h-9 w-9 rounded-full border border-gold-600 bg-porcelain-50/90"
        />
      </button>
    </div>
  );
}
