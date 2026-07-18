"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

/**
 * Jewellery Teaser — "Dark Immersive" vault content (var_0486628442ff).
 * Extracted from the page wrapper to support Next.js App Router metadata.
 */
export function JewelleryContent() {
  const containerRef = useRef<HTMLElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    // Spotlight only where a cursor exists; on touch the vignette would sit
    // frozen at 50%/50% and permanently darken the page edges.
    const moveSpotlight = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty("--x", `${x}%`);
      document.documentElement.style.setProperty("--y", `${y}%`);
    };

    if (finePointer && !reduce) {
      window.addEventListener("mousemove", moveSpotlight);
    } else if (spotlightRef.current) {
      spotlightRef.current.style.display = "none";
    }

    if (reduce) {
      gsap.set(el.querySelectorAll("[data-reveal]"), { opacity: 1, y: 0 });
      return;
    }

    // Ambient hero film plays only when motion is welcome; under reduced-motion
    // the <video> keeps its poster and never animates (early-returned above).
    heroVideoRef.current?.play().catch(() => {});

    // Scoped orchestrated entrance animations
    const ctx = gsap.context(() => {
      const targets = el.querySelectorAll("[data-reveal]");
      targets.forEach((target) => {
        gsap.to(target, {
          scrollTrigger: {
            trigger: target,
            start: "top 88%",
            once: true,
          },
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power3.out",
          delay: Number((target as HTMLElement).dataset.delay) || 0,
        });
      });
    }, el);

    return () => {
      ctx.revert();
      window.removeEventListener("mousemove", moveSpotlight);
    };
  }, []);

  return (
    <main 
      ref={containerRef}
      className="relative min-h-screen grain bg-violet-950 text-porcelain-50 font-sans selection:bg-gold-500 selection:text-violet-950 overflow-x-hidden"
    >
      {/* Interactive Spotlight Overlay (Vault Atmosphere) */}
      {/* z-40: the sticky Nav is z-50 and must stay readable above the vignette */}
      <div
        className="spotlight-overlay pointer-events-none fixed inset-0 z-40 mix-blend-multiply"
        style={{
          background: "radial-gradient(circle at var(--x, 50%) var(--y, 50%), transparent 10%, rgba(50, 23, 77, 0.95) 42%)"
        }}
        aria-hidden="true"
        ref={spotlightRef}
      />

      {/* Reveal state overrides */}
      <style>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(24px);
        }
      `}</style>

      {/* Hero: The Adornment Room */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden isolate">
        {/* Ambient vault film — muted loop under deep violet scrims; poster stands in under reduced-motion (play() is gated in the effect) */}
        <div className="absolute inset-0 -z-20 overflow-hidden" aria-hidden="true">
          <video
            ref={heroVideoRef}
            loop
            muted
            playsInline
            poster="/hero/hero-poster.webp"
            className="h-full w-full object-cover opacity-40"
          >
            <source src="/hero/hero-loop.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-violet-950/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-violet-950/60 via-violet-950/40 to-violet-950" />
        </div>
        <div className="absolute inset-0 opacity-20 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(110,86,166,0.5)_0%,transparent_70%)]" />
        
        <div className="max-w-5xl relative z-10">
          <p data-reveal className="text-[0.7rem] tracking-[0.35em] uppercase text-gold-500 font-medium mb-10">
            The Private Collection
          </p>
          <h1 data-reveal data-delay="0.2" className="font-display text-h1 text-porcelain-50 mb-14 leading-[1.05] font-[340]">
            The <em className="italic text-gold-500 font-[400]">Adornment</em> Room.
          </h1>
          
          <div data-reveal data-delay="0.4" className="flex justify-center items-center mb-14 opacity-50">
            <div className="w-20 h-px bg-gold-500" />
            <span className="mx-6 text-gold-500 text-xs">✦</span>
            <div className="w-20 h-px bg-gold-500" />
          </div>
          
          <p data-reveal data-delay="0.6" className="text-lg md:text-xl text-violet-100 max-w-2xl mx-auto leading-relaxed opacity-70">
            An intimate sanctuary for the curated bride. Where heritage craft meets the modern silhouette in a dance of light and gold.
          </p>
        </div>

        {/* Enter the Vault Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-gold-500/30 flex flex-col items-center gap-5">
          <span className="text-[0.625rem] uppercase tracking-[0.25em]">Enter the vault</span>
          <div className="w-px h-20 bg-gradient-to-b from-gold-500/50 to-transparent" />
        </div>
      </section>

      {/* Experience: Hand-picked Vows */}
      <section className="py-48 md:py-64 relative isolate">
        <div className="shell">
          <div className="grid md:grid-cols-2 gap-24 items-center">
            <div data-reveal>
              <p className="text-[0.7rem] tracking-[0.3em] uppercase text-gold-500 font-medium mb-8">
                A Private Viewing
              </p>
              <h2 className="text-h2 font-display text-porcelain-50 mb-10 leading-[1.1] font-[340]">
                Final vows, <br />
                <em className="italic text-gold-500 font-[400]">hand-picked</em> for her.
              </h2>
              <div className="space-y-10 text-violet-100 text-lg leading-relaxed max-w-md opacity-80">
                <p>
                  Jewellery is not an accessory; it is the final vow of an outfit. It is the detail that anchors a silhouette and turns a celebration into a memory.
                </p>
                <p>
                  At Vivaah, we believe the choosing should be as cherished as the wearing. Our boutique viewing room offers a space for reflection, styling, and the quiet joy of discovery.
                </p>
              </div>
            </div>
            
            <div data-reveal data-delay="0.3" className="relative group">
              <div className="relative aspect-[4/5] border border-gold-500/15 overflow-hidden">
                {/* Editorial still (the vault's favourite bridal angle) sits under a deep violet scrim so the quote stays legible */}
                <img
                  src="/rentals/lahenga1/360/020.webp"
                  alt="A hand-embroidered bridal lehenga from the Vivaah rental vault"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-violet-950/75" />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950 via-violet-950/45 to-violet-950/55" />
                <div className="relative z-10 flex h-full items-center justify-center p-14 text-center">
                  <div className="max-w-xs">
                    <span className="text-gold-500 text-3xl block mb-10 opacity-60">✦</span>
                    <p className="font-display text-[1.625rem] italic leading-relaxed text-porcelain-50">
                      "We do not just dress the bride; we help her find her unique sparkle."
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -inset-5 border border-gold-600/5 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Heritage Craft Spotlight */}
      <section className="py-48 bg-black/5 relative isolate">
        <div className="shell">
          <div className="text-center mb-36">
            <h2 data-reveal className="text-h2 font-display text-porcelain-50 mb-8 font-[340]">
              Heritage <em className="italic text-gold-500 font-[400]">Craft</em>
            </h2>
            <div data-reveal data-delay="0.2" className="h-px bg-gradient-to-r from-transparent via-gold-600/40 to-transparent w-full max-w-md mx-auto" />
          </div>
          
          <div className="grid md:grid-cols-3 gap-20">
            {[
              { t: "The Kundan Edit", d: "Uncut stones set in 24k gold foil. A legacy of the Mughal courts, reimagined for the contemporary reception.", img: "/categories/bridal-lehengas.jpg" },
              { t: "Polki & Pearls", d: "Natural diamonds in their rawest form, paired with Basra pearls for a timeless, ethereal bridal glow.", img: "/categories/sarees.jpg" },
              { t: "Temple Gold", d: "Intricately carved gold depicting celestial motifs. Heavy in tradition, light in the soul.", img: "/categories/rajasthani-poshak.jpg" }
            ].map((item, i) => (
              <div key={item.t} data-reveal data-delay={0.15 * (i + 1)}>
                {/* Category still as evocative texture — held under a violet scrim, never full-brightness */}
                <div className="relative aspect-[3/4] mb-8 overflow-hidden border border-gold-500/10">
                  <img
                    src={item.img}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 bg-violet-950/55" />
                  <div className="absolute inset-0 bg-gradient-to-t from-violet-950 via-transparent to-transparent" />
                </div>
                <h3 className="font-display text-2xl text-gold-500 mb-6 font-[380]">{item.t}</h3>
                <p className="text-violet-100/60 leading-relaxed text-[1.0625rem]">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action: The Invitation */}
      <section className="py-48 md:py-64 text-center relative isolate">
        <div className="shell max-w-4xl mx-auto">
          <div data-reveal>
            <p className="text-[0.7rem] tracking-[0.3em] uppercase text-gold-500 font-medium mb-12">
              The Boutique Invite
            </p>
            <h2 className="text-h1 font-display text-porcelain-50 mb-14 leading-[1.05] font-[340]">
              Experience <br />
              <em className="italic text-gold-500 font-[400]">Vivaah</em>.
            </h2>
            <p className="text-xl text-violet-100/70 mb-20 max-w-2xl mx-auto leading-relaxed">
              The collection is currently being photographed for our digital vault. Until then, we invite you to book a private trial at our boutique.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
              <Button href="/visit" variant="primary-dark">
                Book a private trial
              </Button>
              <Link href="/rentals" className="text-gold-500/50 hover:text-gold-500 text-sm uppercase tracking-[0.2em] font-medium transition-colors no-underline">
                Browse Rentals →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
