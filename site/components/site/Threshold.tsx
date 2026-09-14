"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The threshold (DESIGN_SPEC_V3 §2.2 + §3.1).
 *
 * The home page's only full-bleed moving surface and the only `scrub` on the
 * page. Scroll drives the film's playhead through a lerp (factor 0.12), never a
 * direct binding: the direct one reads mechanical, the lerp reads like a surface
 * being pushed by hand. The film is never played; it is only seeked, and the
 * loop that seeks it runs only while the film is on screen, the tab is in
 * front, and the playhead still has somewhere to go.
 *
 * Exactly one line of type sits over it, and the scrim sits behind that type
 * only, never across the whole frame.
 *
 * Reduced motion: no video element at all. The poster frame renders as a plain
 * image, the playhead is never bound to scroll, and the section collapses to one
 * viewport because there is no scrub span left to travel.
 */

const LERP = 0.12; // §3.1, fixed
// The film's own rate (both encodes are 24fps, 240 frames). Seeks are snapped
// to a frame so a playhead that moves by less than one never asks for a decode.
const FPS = 24;

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
    let raf = 0; // 0 means no frame is scheduled; rAF ids are always positive
    let onScreen = true; // until the observer says otherwise
    let ready = video.readyState >= 1; // metadata may already be in

    let asked = -1; // the frame the element was last told to show

    // One seek in flight at a time. Setting currentTime while a seek is still
    // decoding abandons it and starts over, so a fast scroll used to issue 118
    // seeks and finish 28, with the picture frozen for up to 600ms in between
    // (threshold-smooth.mjs, 14 Sep). Now a seek that arrives mid-decode is
    // dropped, and `seeked` catches up to wherever the playhead has got to.
    const seek = () => {
      if (!ready || !video.duration || video.seeking) return;
      const last = Math.floor(video.duration * FPS) - 1;
      const frame = Math.round(current * last);
      if (frame === asked) return;
      asked = frame;
      // The middle of the frame, not its edge, so rounding cannot land on the
      // neighbour; and never exactly duration, which fires `ended` on some
      // browsers and parks the element on a blank frame.
      video.currentTime = Math.min((frame + 0.5) / FPS, video.duration - 0.05);
    };

    const onMeta = () => {
      ready = true;
      // The loop may already have settled while the metadata was still coming
      // in, in which case nothing will wake it — apply the position it settled
      // on now rather than waiting for the next scroll.
      seek();
    };

    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const tick = () => {
      raf = 0;
      const delta = target - current;
      // Under half a thousandth of the film is well inside a single frame of
      // it, so there is nothing left to show: land exactly and stop scheduling.
      // A page that has stopped scrolling then runs no loop at all.
      if (Math.abs(delta) < 0.0005) {
        current = target;
        seek();
        return;
      }
      current += delta * LERP;
      seek();
      raf = requestAnimationFrame(tick);
    };

    // Only ever one frame in flight, and none at all while the film cannot be
    // seen: off-screen or in a background tab, this section costs nothing.
    const wake = () => {
      if (raf || !onScreen || document.hidden) return;
      raf = requestAnimationFrame(tick);
    };

    const measure = () => {
      const travel = section.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      const scrolled = -section.getBoundingClientRect().top;
      target = Math.min(1, Math.max(0, scrolled / travel));
      wake();
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else wake();
    };

    // The section is the scroll track and the film is sticky inside it, so the
    // track intersecting the viewport is exactly the film being on screen.
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) measure();
      else stop();
    });
    io.observe(section);

    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("seeked", seek);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    measure();
    wake();

    return () => {
      stop();
      io.disconnect();
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("seeked", seek);
      document.removeEventListener("visibilitychange", onVisibility);
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
      /* Two different questions, so two different units. The scroll track is a
         budget — 2.8 screens of travel — and `vh` is the one that does not
         resize when a phone's URL bar retracts, so the scrub keeps a steady
         length instead of jumping mid-gesture. The frame is a composition, and
         is measured in `svh` below so it fits the visible viewport. */
      className={`relative -mt-16 bg-violet-950 ${reduced ? "h-[100svh]" : "h-[280vh]"}`}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-violet-950">
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
            aria-hidden="true"
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
        {/* Offset in the same unit as the frame it sits in, or the line drops
            behind a phone's URL bar at the very moment it should be read. */}
        <div className="absolute inset-x-0 bottom-[9svh]">
          <div className="shell">
            <h1 className="text-threshold font-display text-porcelain-50">{line}</h1>
            <div className="mt-7 h-px w-[120px] bg-gold-500/75" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
