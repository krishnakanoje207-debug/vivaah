"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";

/**
 * Heading that distorts under the pointer (DESIGN_SPEC_V3 §3.5).
 *
 * feTurbulence + feDisplacementMap; the map's `scale` is driven by pointer
 * velocity and capped at 18px so no letterform ever tears free of its
 * neighbours. Desktop pointer only: one media query covers hover + fine
 * pointer + no motion preference, so on touch and under prefers-reduced-motion
 * the SVG never mounts, no listener is attached, and this is plain static type.
 *
 * The `filter` property is set on pointer-enter and removed only once the
 * ease-back to 0 has finished, so a resting heading is never rasterised
 * through a filter and keeps its subpixel rendering. The text is always real,
 * selectable, translatable heading markup. Only `filter` is touched: no
 * width/height/top/left, no `transition: all`.
 *
 * Spec caps this at three headings site-wide. Not mounted anywhere yet.
 */

const MAX_SCALE = 18; // §3.5 hard cap on displacement
const GAIN = 6; // scale per (px/ms) of pointer speed
const SETTLE = 0.9; // per-tick decay, so a pointer held still relaxes to rest
const LERP = 0.25; // approach rate toward the velocity target

export function DistortHeading({
  children,
  as: Tag = "h2",
  className = "",
}: {
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  // Unique per instance: a duplicate filter id silently breaks rendering.
  const filterId = `distort-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mapRef = useRef<SVGFEDisplacementMapElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    );
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = headingRef.current;
    const map = mapRef.current;
    if (!enabled || !el || !map) return;

    const state = { scale: 0 };
    let target = 0;
    let x = 0;
    let y = 0;
    let t = 0;
    let running = false;

    const write = () => map.setAttribute("scale", state.scale.toFixed(2));

    const tick = () => {
      target *= SETTLE;
      state.scale += (target - state.scale) * LERP;
      write();
    };

    const onEnter = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      t = e.timeStamp;
      gsap.killTweensOf(state); // re-entry mid-exit: keep the filter applied
      el.style.filter = `url(#${filterId})`;
      if (!running) {
        gsap.ticker.add(tick);
        running = true;
      }
    };

    const onMove = (e: PointerEvent) => {
      const dt = e.timeStamp - t;
      if (dt <= 0) return;
      const v = Math.hypot(e.clientX - x, e.clientY - y) / dt;
      x = e.clientX;
      y = e.clientY;
      t = e.timeStamp;
      target = Math.min(MAX_SCALE, v * GAIN);
    };

    const onLeave = () => {
      if (running) {
        gsap.ticker.remove(tick);
        running = false;
      }
      target = 0;
      gsap.to(state, {
        scale: 0,
        duration: 0.4,
        ease: "power2.out",
        onUpdate: write,
        // Rest state carries no filter at all, so the type stays pixel-perfect.
        onComplete: () => {
          el.style.filter = "";
        },
      });
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (running) gsap.ticker.remove(tick);
      gsap.killTweensOf(state);
      el.style.filter = "";
    };
  }, [enabled, filterId]);

  return (
    <>
      {enabled && (
        /* Zero-size and absolute so it is never a flex/grid item of the parent.
           sRGB interpolation keeps the ink colour true through the filter (the
           linearRGB default shifts it). The region is oversized because the map
           displaces pixels by up to ±scale/2 in each direction. */
        <svg aria-hidden="true" focusable="false" className="absolute h-0 w-0">
          <filter
            id={filterId}
            x="-10%"
            y="-25%"
            width="120%"
            height="150%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              ref={mapRef}
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
      )}
      <Tag ref={headingRef as never} className={className}>
        {children}
      </Tag>
    </>
  );
}
