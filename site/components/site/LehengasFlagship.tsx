"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Reveal } from "@/components/site/Reveal";

gsap.registerPlugin(ScrollTrigger);

/**
 * Lehengas flagship — full-viewport immersive homepage "room" (CATEGORY_IMMERSION_PLAN W4).
 * Redesigned as a DARK immersive room (matching var_0486628442ff) with background video 
 * and the "Fluid" transformation idiom.
 * 
 * This section acts as the regal bridal vault, using deep violet tones and gold 
 * accents to contrast with the airy rental collection. It mirrors the transformation
 * behavior of the Saree room but with right-anchored copy to maintain the room-to-room
 * editorial narrative.
 */
export function LehengasFlagship() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const media = mediaRef.current;
    const content = contentRef.current;
    const video = videoRef.current;
    if (!container || !media) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Static full-bleed layout is the correct reduced state — skip the
      // scale/round/fade scrub entirely and don't autoplay the background video.
      video?.pause();
      return;
    }

    const ctx = gsap.context(() => {
      // Fluid Hero Transformation: scale-down and round-off
      gsap.to(media, {
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
        scale: 0.6,
        borderRadius: "24px",
        y: "20vh",
        opacity: 0.4,
        ease: "none",
      });

      // Content fade-out parallax
      if (content) {
        gsap.to(content, {
          scrollTrigger: {
            trigger: container,
            start: "top top",
            end: "40% top",
            scrub: true,
          },
          opacity: 0,
          y: -60,
          ease: "none",
        });
      }
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={containerRef}
      id="lehengas-flagship"
      className="on-dark relative flex h-[110svh] flex-col items-center justify-center overflow-hidden bg-violet-950 text-porcelain-50 text-center isolate"
    >
      {/* Background Media: Immersive Video Transformation */}
      <div 
        ref={mediaRef}
        className="absolute inset-0 -z-10 overflow-hidden will-change-transform" 
        aria-hidden="true"
      >
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          poster="/rentals/lahenga1/360/020.webp"
          preload="metadata"
          className="h-full w-full object-cover opacity-60"
        >
          <source src="/hero/hero-intro.mp4" type="video/mp4" />
        </video>
        
        {/* Deep vault scrims */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/40 via-transparent to-violet-950/80" />
        <div className="absolute inset-0 bg-violet-950/10" />
      </div>

      {/* Hero Content */}
      <div 
        ref={contentRef}
        className="relative z-10 shell py-20"
      >
        <Reveal>
          <p data-reveal className="eyebrow on-dark mb-8">
            Rentals · The Bridal Vault
          </p>
          <h1 data-reveal data-delay="0.1" className="text-6xl md:text-8xl max-w-4xl mx-auto leading-[1.1] font-display font-[340]">
            The lehenga, <br />
            <em className="italic text-gold-500 font-[400]">reimagined</em>.
          </h1>
          <p data-reveal data-delay="0.2" className="mt-10 max-w-md mx-auto text-violet-100/80 leading-relaxed text-[1.125rem]">
            Hand-embroidered ghagras and heirloom dupattas — reserved online
            for your date, collected in person at our boutique.
          </p>
          <div data-reveal data-delay="0.3" className="mt-14 flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/rentals?category=bridal-lehengas"
              className="inline-flex items-center justify-center rounded-[10px] bg-gold-500 px-10 py-4 font-semibold text-violet-950 transition-all duration-300 hover:bg-gold-600 hover:text-white"
            >
              Explore lehenga rentals
            </Link>
            <Link
              href="/visit"
              className="inline-flex items-center justify-center rounded-[10px] border border-porcelain-50/30 px-10 py-4 font-semibold text-porcelain-50 transition-all duration-300 hover:bg-white/5"
            >
              Visit the shop
            </Link>
          </div>
        </Reveal>
      </div>

      {/* Dusk Veil Transition */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-porcelain-50 to-transparent pointer-events-none" />
      
      {/* Scroll Seam Ornament */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xs opacity-40">
        <div className="ornament">
          <span className="text-[0.625rem]">✦</span>
        </div>
      </div>
    </section>
  );
}
