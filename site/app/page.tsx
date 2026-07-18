import Link from "next/link";
import { Hero } from "@/components/site/Hero";
import { Reveal } from "@/components/site/Reveal";
import { Ornament } from "@/components/site/Ornament";
import { Button } from "@/components/ui/Button";
import { SHOP } from "@/lib/site";
import { featuredRentals } from "@/lib/rentals";
import { RentalCard } from "@/components/site/RentalCard";
import { CategoryShowcase } from "@/components/site/CategoryShowcase";
import { SareesFlagship } from "@/components/site/SareesFlagship";
import { LehengasFlagship } from "@/components/site/LehengasFlagship";

const STEPS = [
  { n: "01", t: "Reserve your look", d: "Discover pieces that speak to you and secure your dates online. Our calendar tracks availability in real time." },
  { n: "02", t: "Secure with UPI", d: "Pay a small advance to hold your bridal or festive ensemble. Once reserved, your dates are locked." },
  { n: "03", t: "Final collection", d: "Visit our boutique for a personal fitting, collect your outfit, and return it after your celebration." },
];

export default function Home() {
  return (
    <>
      <Hero />

      {/* Featured rentals — Asymmetric editorial composition */}
      <section className="bg-porcelain-50 py-24 md:py-36">
        <div className="shell">
          <Reveal>
            <p data-reveal className="eyebrow">
              The bridal edit
            </p>
            <div data-reveal className="mt-4 flex flex-wrap items-end justify-between gap-6">
              <h2 className="text-h2 max-w-2xl leading-tight">
                Silhouettes worth <em className="italic">remembering</em>
              </h2>
              <Link
                href="/rentals"
                className="text-[0.9375rem] font-medium text-gold-600 hover:underline underline-offset-8 decoration-gold-500/40"
              >
                View the full rental collection →
              </Link>
            </div>
          </Reveal>

          <Reveal className="mt-20 grid grid-cols-1 gap-x-10 gap-y-20 sm:grid-cols-2 lg:grid-cols-3 items-start">
            {featuredRentals.slice(0, 3).map((p, i) => (
              <div 
                key={p.slug} 
                data-reveal 
                className={i === 1 ? "lg:mt-32" : i === 2 ? "lg:mt-16" : ""}
              >
                <RentalCard p={p} />
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Sarees flagship — full-viewport immersive room (CATEGORY_IMMERSION_PLAN W3) */}
      <SareesFlagship />

      {/* Lehengas flagship — light porcelain-stage room (CATEGORY_IMMERSION_PLAN W4) */}
      <LehengasFlagship />

      {/* How it works — Refined horizontal timeline */}
      <section className="bg-porcelain-100 py-24 md:py-40">
        <div className="shell">
          <Reveal>
            <p data-reveal className="eyebrow">
              Crafted for ease
            </p>
            <h2 data-reveal className="mt-4 text-h2">
              The <em className="italic">ritual</em> of renting
            </h2>
          </Reveal>
          <Reveal className="mt-24 grid gap-16 md:grid-cols-3 relative">
            {/* Timeline connector line (desktop) */}
            <div className="hidden md:block absolute top-10 left-12 right-12 h-px bg-gold-500/25" aria-hidden="true" />
            
            {STEPS.map((s, i) => (
              <div key={s.n} data-reveal className="relative z-10">
                <div className="flex items-center justify-between md:block">
                  <p className="font-display text-[4rem] leading-none text-gold-600/30 tabular">{s.n}</p>
                  {i < STEPS.length - 1 && (
                    <span className="md:hidden text-gold-500/30 text-xs">✦</span>
                  )}
                </div>
                <h3 className="mt-6 text-h3">{s.t}</h3>
                <p className="mt-4 text-ink-600 leading-relaxed max-w-sm">{s.d}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Browse by category — two big-card rails (rent / own), CATEGORY_IMMERSION_PLAN W6 */}
      <CategoryShowcase />

      {/* Visit — Dark editorial bookend split */}
      <section className="on-dark grain bg-violet-900 py-28 md:py-40 text-porcelain-50">
        <div className="shell">
          <div className="grid items-center gap-20 md:grid-cols-[1fr_1.2fr]">
            <Reveal>
              <p data-reveal className="eyebrow on-dark">
                The boutique experience
              </p>
              <h2 data-reveal className="mt-5 text-h2 text-porcelain-50 leading-[1.1]">
                Adorn yourself in <em className="italic">person</em>
              </h2>
              <p data-reveal className="mt-8 max-w-md text-violet-300 leading-relaxed text-[1.0625rem]">
                Step into our private boutique for a guided fitting. Our team assists with silhouette selection, 
                sizing, and pairing with our heirloom jewellery collection.
              </p>
              <div data-reveal className="mt-10 flex flex-wrap gap-5">
                <Button href={SHOP.mapsUrl} variant="primary-dark">
                  Get directions
                </Button>
                <Button href="/visit" variant="ghost-dark">
                  Book a private trial
                </Button>
              </div>
              <div data-reveal className="mt-14 flex flex-col gap-2 text-[0.9375rem] text-violet-300/70 border-t border-violet-800 pt-8">
                <p className="font-medium text-porcelain-50/60 uppercase tracking-widest text-[0.7rem]">Location & Hours</p>
                <p>{SHOP.address} · <span className="tabular">{SHOP.hours}</span></p>
              </div>
            </Reveal>

            <div className="relative group flex justify-center md:justify-end">
              <div className="arch aspect-[3/4] w-full max-w-md overflow-hidden border border-violet-700/40 bg-violet-800 shadow-lift relative">
                {/* Map embed ships with /visit; placeholder until then (no stock imagery). */}
                <div className="flex h-full items-center justify-center text-violet-500">
                  <span className="text-[0.9375rem]">Map</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/50 via-transparent to-transparent" />
              </div>
              {/* Floating accent ornament */}
              <Ornament className="absolute -bottom-6 -left-6 w-40 opacity-20 pointer-events-none md:-left-12" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
