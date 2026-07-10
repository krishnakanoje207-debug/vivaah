"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/Button";
import { Ornament } from "@/components/site/Ornament";
import { SHOP } from "@/lib/site";

/**
 * Hero (§5a + IMPLEMENTATION_PLAN §5). Play-once intro crossfades into a seamless
 * ping-pong loop; overlay copy fades in as the camera settles.
 *
 * R1.1 playback fixes: if autoplay is blocked the video is NOT hidden — the still
 * shows as poster and we retry play() on the first user interaction (the v1 bug
 * was silently swapping to the still, which read as "video not playing"). On
 * `ended`, the loop is started BEFORE the opacity swap (same frame) so there is
 * no flash. Reduced-motion shows the settled still with copy visible immediately.
 */
export function Hero() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const hairlineRef = useRef<HTMLSpanElement>(null);
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const [showLoop, setShowLoop] = useState(false);
  const [playVideo, setPlayVideo] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const overlay = overlayRef.current;
    const items = overlay ? overlay.querySelectorAll<HTMLElement>("[data-hero]") : [];

    const reveal = () => {
      gsap.to(items, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out", stagger: 0.08 });
      if (hairlineRef.current) {
        gsap.fromTo(
          hairlineRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.6, ease: "power2.out", delay: 0.2 }
        );
      }
    };

    gsap.set(items, { y: 16 });

    if (reduce) {
      setPlayVideo(false);
      gsap.set(items, { opacity: 1, y: 0 });
      if (hairlineRef.current) gsap.set(hairlineRef.current, { scaleX: 1 });
      return;
    }

    const settle = window.setTimeout(reveal, 4600);
    const intro = introRef.current;

    const onEnded = () => {
      const loop = loopRef.current;
      if (!loop) return;
      // Start the loop first, then swap opacity next frame → no flash of still.
      loop.play().catch(() => {});
      requestAnimationFrame(() => setShowLoop(true));
    };
    intro?.addEventListener("ended", onEnded);

    // Retry playback on first interaction if autoplay was blocked.
    const onInteract = () => {
      intro?.play().then(removeInteract).catch(() => {});
    };
    const removeInteract = () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("touchstart", onInteract);
      window.removeEventListener("scroll", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
    const addInteract = () => {
      window.addEventListener("pointerdown", onInteract);
      window.addEventListener("touchstart", onInteract, { passive: true });
      window.addEventListener("scroll", onInteract, { passive: true });
      window.addEventListener("keydown", onInteract);
    };

    intro?.play().catch((err: unknown) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[hero] autoplay blocked, will retry on interaction:", err);
      }
      addInteract();
    });

    return () => {
      window.clearTimeout(settle);
      intro?.removeEventListener("ended", onEnded);
      removeInteract();
    };
  }, []);

  return (
    <section
      data-dark-hero
      className="relative isolate overflow-hidden bg-violet-950 text-porcelain-50 on-dark"
    >
      {/* Media stack. NOTE: do not add `.grain` here — it sets position:relative
          and would override `absolute`, collapsing this layer (that was the
          "no video/still visible" bug). */}
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {/* Base: settled still (fallback + reduced-motion + pre-play/poster) */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero/hero-still.webp')" }}
        />
        {playVideo && (
          <>
            <video
              ref={introRef}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
              style={{ opacity: showLoop ? 0 : 1 }}
              src="/hero/hero-intro.mp4"
              poster="/hero/hero-poster.webp"
              muted
              playsInline
              preload="auto"
            />
            <video
              ref={loopRef}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
              style={{ opacity: showLoop ? 1 : 0 }}
              src="/hero/hero-loop.mp4"
              muted
              playsInline
              loop
              preload="auto"
            />
          </>
        )}
        {/* Scrim for text legibility (tokens only) */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/55 via-violet-950/25 to-violet-950/65" />
      </div>

      {/* Overlay copy */}
      <div
        ref={overlayRef}
        className="shell flex min-h-[88svh] flex-col items-center justify-center py-28 text-center"
      >
        <p data-hero className="eyebrow on-dark">
          Rent · Buy · Adorn
        </p>
        <h1 data-hero className="mt-5 max-w-3xl text-h1 text-porcelain-50">
          Dressed for every <em className="italic">celebration</em>.
        </h1>
        <span
          ref={hairlineRef}
          aria-hidden="true"
          className="mt-6 block h-px w-24 origin-center bg-gold-500/70"
        />
        <p data-hero className="mt-6 max-w-xl text-violet-100 text-[1.0625rem] leading-relaxed">
          Rent bridal &amp; festive wear, shop dresses and suits, and add jewellery to match —
          reserved online, collected at our shop.
        </p>
        <div data-hero className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Button href="/rentals" variant="primary-dark">
            Explore rentals
          </Button>
          <Button href="/visit" variant="ghost-dark">
            Visit the shop
          </Button>
        </div>
      </div>

      {/* Dusk veil — gradient into the light body, with the ✦ seam (§5) */}
      <div className="relative">
        <div
          className="pointer-events-none h-40 w-full"
          style={{ background: "linear-gradient(to bottom, transparent, var(--color-porcelain-50))" }}
          aria-hidden="true"
        />
        <div className="shell -mt-6 pb-2">
          <Ornament />
        </div>
      </div>
    </section>
  );
}
