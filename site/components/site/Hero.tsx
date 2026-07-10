"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/Button";
import { Ornament } from "@/components/site/Ornament";
import { SHOP } from "@/lib/site";

/**
 * Hero (§5 + IMPLEMENTATION_PLAN §5). Play-once intro crossfades into a seamless
 * ping-pong loop; the overlay copy fades in as the camera settles. Under
 * prefers-reduced-motion the videos never play and the settled still shows,
 * with copy visible immediately. The still is also the base layer / ultimate
 * fallback if autoplay is blocked.
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
      gsap.to(items, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power2.out",
        stagger: 0.08,
      });
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

    // Reveal copy as the scene settles (~4.6s), loop takes over at intro end.
    const settle = window.setTimeout(reveal, 4600);

    const intro = introRef.current;
    const onEnded = () => {
      setShowLoop(true);
      loopRef.current?.play().catch(() => {});
    };
    intro?.addEventListener("ended", onEnded);
    intro?.play().catch(() => {
      // Autoplay blocked — fall back to the still and reveal copy now.
      window.clearTimeout(settle);
      setPlayVideo(false);
      reveal();
    });

    return () => {
      window.clearTimeout(settle);
      intro?.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-dusk-950 text-silk-50 on-dark">
      {/* Media stack */}
      <div className="grain absolute inset-0 -z-10" aria-hidden="true">
        {/* Base: settled still (fallback + reduced-motion + pre-play) */}
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
        <div className="absolute inset-0 bg-gradient-to-b from-dusk-950/55 via-dusk-950/25 to-dusk-950/65" />
      </div>

      {/* Overlay copy */}
      <div
        ref={overlayRef}
        className="shell flex min-h-[88svh] flex-col items-center justify-center py-28 text-center"
      >
        <p data-hero className="eyebrow on-dark">
          Bridal rental &amp; boutique
        </p>
        <h1 data-hero className="mt-5 max-w-3xl text-h1 text-silk-50">
          The lehenga you dreamed of, <em className="italic text-marigold-500">for a day</em>.
        </h1>
        <span
          ref={hairlineRef}
          aria-hidden="true"
          className="mt-6 block h-px w-24 origin-center bg-gold-400/70"
        />
        <p data-hero className="mt-6 max-w-xl text-dusk-100 text-[1.0625rem] leading-relaxed">
          {SHOP.tagline} Reserve online, collect at our shop.
        </p>
        <div data-hero className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Button href="/rentals" variant="primary">
            Explore lehengas
          </Button>
          <Button href="/visit" variant="ghost-dark">
            Book a trial visit
          </Button>
        </div>
      </div>

      {/* Dusk veil — gradient into the light body, with the ✦ seam (§5) */}
      <div className="relative">
        <div
          className="pointer-events-none h-40 w-full"
          style={{ background: "linear-gradient(to bottom, transparent, var(--color-silk-50))" }}
          aria-hidden="true"
        />
        <div className="shell -mt-6 pb-2">
          <Ornament />
        </div>
      </div>
    </section>
  );
}
