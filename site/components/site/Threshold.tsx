"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The threshold (DESIGN_SPEC_V3 §2.2 + §3.1).
 *
 * The home page's only full-bleed moving surface and the only `scrub` on the
 * page. Scroll drives the film's playhead through a lerp (factor 0.12), never a
 * direct binding: the direct one reads mechanical, the lerp reads like a surface
 * being pushed by hand. The film is never played; it is only seeked.
 *
 * Exactly one line of type sits over it, and the scrim sits behind that type
 * only, never across the whole frame.
 *
 * Reduced motion: no video element at all. The poster frame renders as a plain
 * image, the playhead is never bound to scroll, and the section collapses to one
 * viewport because there is no scrub span left to travel.
 */

const LERP = 0.12; // §3.1, fixed

export function Threshold({ line }: { line: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // null until the media query has been read on the client, so we never load
  // both encodes or guess wrong during SSR.
  const [src, setSrc] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) {
      setReduced(true);
      setDecided(true);
      return;
    }
    // 1080p encode above the mobile breakpoint, 720p below it (3.9 MB vs 6.8 MB
    // on the audience's mid-range Android).
    setSrc(
      window.matchMedia("(min-width: 860px)").matches
        ? "/threshold/threshold.mp4"
        : "/threshold/threshold-m.mp4"
    );
    setDecided(true);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (reduced || !section || !video) return;

    let target = 0;
    let current = 0;
    let raf = 0;
    let ready = video.readyState >= 1; // metadata may already be in

    const onMeta = () => {
      ready = true;
    };

    const measure = () => {
      const travel = section.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      const scrolled = -section.getBoundingClientRect().top;
      target = Math.min(1, Math.max(0, scrolled / travel));
    };

    const tick = () => {
      current += (target - current) * LERP;
      if (ready && video.duration) {
        // Stop just shy of the end: seeking to exactly duration fires `ended`
        // on some browsers and parks the element on a blank frame.
        video.currentTime = current * (video.duration - 0.05);
      }
      raf = requestAnimationFrame(tick);
    };

    video.addEventListener("loadedmetadata", onMeta);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    measure();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("loadedmetadata", onMeta);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [reduced, src]);

  return (
    <section
      ref={sectionRef}
      id="threshold"
      data-room="threshold"
      data-dark=""
      /* Puts Nav into its transparent on-dark tone for the whole threshold, so
         the film runs to the top of the viewport and is genuinely full-bleed
         (§2.2). Nav restores its porcelain bar at the first room boundary. */
      data-dark-hero=""
      aria-label="Threshold"
      /* -mt-16 pulls the film under the sticky nav, which is in normal flow and
         would otherwise hold a 64px porcelain band above it. Same pattern the
         v2 hero used. */
      className={`relative -mt-16 bg-violet-950 ${reduced ? "h-screen" : "h-[280vh]"}`}
    >
      <div className="sticky top-0 h-screen overflow-hidden bg-violet-950">
        {decided && !reduced && src && (
          <video
            ref={videoRef}
            src={src}
            poster="/threshold/threshold-poster.jpg"
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {(reduced || !decided) && (
          /* Also the pre-decision paint, so the first frame is never an empty
             violet rectangle while the media query is read. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/threshold/threshold-poster.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* The nav's own ground, and nothing wider: the film now runs under a
            transparent nav, and its light type needs something to sit on when a
            bright frame is showing. Same rule as the type scrim below. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-32"
          style={{
            // Held strong across the nav's own 64px band, then released. The
            // nav's violet-300 links measured 3.2:1 over a bright frame at 56%
            // coverage; they need about 70%, so the band holds above that for
            // the whole height the links occupy.
            backgroundImage:
              "linear-gradient(to bottom, color-mix(in srgb, var(--color-violet-950) 88%, transparent) 0%, color-mix(in srgb, var(--color-violet-950) 76%, transparent) 50%, transparent 100%)",
          }}
        />

        {/* Scrim: the lower band where the type sits, not the frame (§2.2). */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[52%]"
          style={{
            backgroundImage:
              "linear-gradient(to top, color-mix(in srgb, var(--color-violet-950) 88%, transparent), color-mix(in srgb, var(--color-violet-950) 55%, transparent) 42%, transparent)",
          }}
        />

        {/* Exactly one line of type (§2.2), written by the page. Everything else
            the page has to say waits for Room I. */}
        <div className="absolute inset-x-0 bottom-[9vh]">
          <div className="shell">
            <h1 className="text-threshold font-display text-porcelain-50">{line}</h1>
            <div className="mt-7 h-px w-[120px] bg-gold-500/75" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
