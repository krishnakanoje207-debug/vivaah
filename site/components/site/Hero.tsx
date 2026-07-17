"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/Button";
import { Ornament } from "@/components/site/Ornament";

/**
 * Editorial Luxe Hero (§5a). 
 * 60/40 Split: High-fashion video on the left, refined bridal edit on the right.
 * Separated by a signature gold hairline. Keeps the ping-pong playback logic.
 */
export function Hero() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const separatorRef = useRef<HTMLSpanElement>(null);
  const [showLoop, setShowLoop] = useState(false);
  const [playVideo, setPlayVideo] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const overlay = overlayRef.current;
    const items = overlay ? overlay.querySelectorAll<HTMLElement>("[data-hero]") : [];

    const reveal = () => {
      gsap.to(items, { opacity: 1, y: 0, duration: 1, ease: "power2.out", stagger: 0.1 });
      if (separatorRef.current) {
        gsap.to(separatorRef.current, { scaleY: 1, duration: 1.2, ease: "power2.inOut", delay: 0.3 });
      }
    };

    gsap.set(items, { opacity: 0, y: 24 });
    if (separatorRef.current) gsap.set(separatorRef.current, { scaleY: 0, transformOrigin: "top" });

    if (reduce) {
      setPlayVideo(false);
      gsap.set(items, { opacity: 1, y: 0 });
      if (separatorRef.current) gsap.set(separatorRef.current, { scaleY: 1 });
      return;
    }

    const settle = window.setTimeout(reveal, 4200);
    const intro = introRef.current;

    const onEnded = () => {
      const loop = loopRef.current;
      if (!loop) return;
      loop.play().catch(() => {});
      requestAnimationFrame(() => setShowLoop(true));
    };
    intro?.addEventListener("ended", onEnded);

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

    intro?.play().catch(() => addInteract());

    return () => {
      window.clearTimeout(settle);
      intro?.removeEventListener("ended", onEnded);
      removeInteract();
    };
  }, []);

  return (
    // -mt-16 pulls the hero under the sticky nav so the transparent nav shows
    // the hero (not the porcelain body) behind it.
    <section
      data-dark-hero
      className="relative isolate -mt-16 min-h-screen overflow-hidden bg-violet-950 text-porcelain-50 on-dark"
    >
      <div className="grid grid-cols-1 md:grid-cols-[6fr_4fr] min-h-screen">
        {/* Media Block (60%) */}
        <div className="relative w-full h-[50vh] md:h-auto overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/hero/hero-still.webp')" }}
          />
          {playVideo && (
            <>
              <video
                ref={introRef}
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
                style={{ opacity: showLoop ? 0 : 1 }}
                src="/hero/hero-intro.mp4"
                poster="/hero/hero-poster.webp"
                muted
                playsInline
                preload="auto"
              />
              <video
                ref={loopRef}
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
                style={{ opacity: showLoop ? 1 : 0 }}
                src="/hero/hero-loop.mp4"
                muted
                playsInline
                loop
                preload="auto"
              />
            </>
          )}
          {/* Top edge gradient to settle the video into the dark frame */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-violet-950/60 to-transparent pointer-events-none" />
        </div>

        {/* Separator Line */}
        <span 
          ref={separatorRef}
          className="hidden md:block absolute left-[60%] top-0 bottom-0 w-px bg-gold-500/20" 
          aria-hidden="true" 
        />

        {/* Content Block (40%) */}
        <div 
          ref={overlayRef}
          className="w-full flex flex-col justify-center px-8 py-20 md:px-16 lg:px-24"
        >
          <p data-hero className="eyebrow on-dark">
            The Bridal Edit
          </p>
          <h1 data-hero className="mt-6 text-h1 max-w-md leading-[1.1] text-porcelain-50">
            Find your <em className="italic">bridal glow</em>.
          </h1>
          <p data-hero className="mt-8 max-w-sm text-violet-300 text-[1.0625rem] leading-relaxed">
            Rent heirloom-quality lehengas, shop evening gowns, and add jewellery to match — reserved online, collected at our boutique.
          </p>
          <div data-hero className="mt-10 flex flex-wrap gap-4">
            <Button href="/rentals" variant="primary-dark">
              Explore rentals
            </Button>
            <Button href="/visit" variant="ghost-dark">
              Visit the boutique
            </Button>
          </div>
        </div>
      </div>

      {/* Dusk veil transition */}
      <div className="absolute bottom-0 left-0 right-0">
        <div
          className="pointer-events-none h-40 w-full"
          style={{ background: "linear-gradient(to bottom, transparent, var(--color-porcelain-50))" }}
          aria-hidden="true"
        />
        <div className="shell -mt-8 pb-3">
          <Ornament />
        </div>
      </div>
    </section>
  );
}
