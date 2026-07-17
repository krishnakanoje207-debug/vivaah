import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpinViewer } from "@/components/site/SpinViewer";
import { SwipeGallery } from "@/components/site/SwipeGallery";
import { ReviewStars } from "@/components/site/ReviewStars";
import { Button } from "@/components/ui/Button";
import { Ornament } from "@/components/site/Ornament";
import { RENTALS, getRental, formatINR, galleryFrames } from "@/lib/rentals";

export function generateStaticParams() {
  return RENTALS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getRental(slug);
  return { title: p ? `${p.name} | Bridal Rental | Vivaah` : "Lehenga" };
}

export default async function RentalProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getRental(slug);
  if (!p) notFound();

  const avg =
    p.reviews.length > 0
      ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
      : 0;

  return (
    <div className="relative">
      {/* ── Act 1: The Stage (100svh; -mt-16 slides it under the transparent nav) ── */}
      <section
        data-stage-hero
        className="relative -mt-16 h-[100svh] w-full overflow-hidden flex items-center justify-center"
        style={{
          // Studio backdrop mimicking the frames' own spotlight vignette so the
          // photo edges dissolve into the stage (frames aren't bg-removed).
          background:
            "radial-gradient(ellipse at 50% 42%, #d8d7d2 0%, #bcbbb6 55%, #9c9b94 100%)",
        }}
      >
        {/* The Garment Stage */}
        <div className="w-full max-w-5xl px-4">
          {p.spin ? (
            // Feather the photo edges so they dissolve into the studio backdrop
            // (hides the frame rectangle seam — DESIGN_SPEC §8 checklist).
            <div
              className="relative group"
              style={{
                maskImage:
                  "radial-gradient(ellipse 100% 100% at 50% 46%, #000 84%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 100% 100% at 50% 46%, #000 84%, transparent 100%)",
              }}
            >
              <SpinViewer config={p.spin} alt={p.name} autoplay />
            </div>
          ) : (
            <div className="aspect-[3/4] flex items-center justify-center text-ink-400">
              <span className="uppercase tracking-[0.25em] text-[0.85rem] font-medium">Silhouette arriving soon</span>
            </div>
          )}
        </div>

        {/* Minimal Chrome: Top Left */}
        <div className="absolute top-24 left-6 md:left-12 pointer-events-auto">
          <nav className="text-caption text-ink-400 uppercase tracking-[0.15em] flex items-center gap-4" aria-label="Breadcrumb">
            <Link href="/rentals" className="hover:text-gold-600 transition-colors">Rentals</Link>
            <span className="text-[0.6rem] opacity-30">✦</span>
            <span className="text-ink-900 font-semibold">{p.name}</span>
          </nav>
        </div>

        {/* Minimal Chrome: Bottom Centre (Scroll Cue) */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
           <span className="text-caption text-gold-600/60 uppercase tracking-[0.3em] text-[0.65rem]">Scroll to explore</span>
           <div className="animate-bounce">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gold-600 opacity-60">
                <path d="M7 13L12 18L17 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
           </div>
        </div>
      </section>

      {/* ── Act 2: The Details (Scroll) ── */}
      <section className="bg-porcelain-50 pt-24 pb-32">
        <div className="shell">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-16 lg:gap-32 items-start">
            {/* Left Column: Narrative & Details */}
            <div className="space-y-24">
              <div>
                <p className="eyebrow">{p.occasion}</p>
                <h1 className="mt-5 font-display text-[3.5rem] leading-[1] text-ink-900 md:text-[5rem] tracking-tight">
                  {p.name}
                </h1>
                
                <div className="mt-10 flex flex-wrap items-center gap-8">
                  <div className="flex items-center gap-4">
                    <span
                      className="inline-block h-6 w-6 rounded-full ring-1 ring-ink-200"
                      style={{ backgroundColor: p.colourHex }}
                    />
                    <span className="text-[1.125rem] font-medium text-ink-900 tracking-tight">{p.colourName}</span>
                  </div>
                  {p.reviews.length > 0 && (
                    <div className="flex items-center gap-4 border-l border-porcelain-200 pl-8">
                      <ReviewStars rating={avg} className="text-xl" />
                      <span className="text-ink-400 font-medium tracking-tight">({p.reviews.length} perspectives)</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-16 max-w-2xl relative">
                  <div className="absolute -left-8 top-0 bottom-0 w-px bg-gold-500/20" />
                  <p className="text-[1.25rem] leading-[1.6] text-ink-600 italic font-display">
                    {p.description}
                  </p>
                </div>
              </div>

              {/* Studio Gallery */}
              {p.spin && (
                <div className="pt-8">
                  <div className="flex items-end justify-between mb-12 border-b border-porcelain-200 pb-6">
                    <div>
                      <p className="text-[0.625rem] font-bold tracking-[0.2em] uppercase text-gold-600 mb-2">Detailed View</p>
                      <h3 className="text-h3">Studio Perspectives</h3>
                    </div>
                    <span className="text-caption text-ink-400 uppercase tracking-widest italic opacity-60">Swipe to zoom</span>
                  </div>
                  <SwipeGallery images={galleryFrames(p.spin, 6)} alt={p.name} />
                </div>
              )}

              {/* Customer Reviews Block */}
              <div className="pt-8">
                <div className="mb-12">
                   <p className="eyebrow mb-3">Customer Perspective</p>
                   <h3 className="text-h3">Reflections of her day</h3>
                </div>
                
                {p.reviews.length > 0 ? (
                  <div className="grid gap-8 md:grid-cols-2">
                    {p.reviews.map((r) => (
                      <figure key={r.name} className="p-10 bg-porcelain-100/40 arch border border-porcelain-200/50 relative group">
                        <div className="absolute top-8 right-8 text-gold-500/20 group-hover:text-gold-500/40 transition-colors">
                           <span className="text-[1.5rem]">✦</span>
                        </div>
                        <ReviewStars rating={r.rating} />
                        <blockquote className="mt-6 text-[1.0625rem] leading-relaxed text-ink-600 font-display">“{r.body}”</blockquote>
                        <figcaption className="mt-10 pt-6 border-t border-porcelain-200/40 flex items-center justify-between gap-4">
                          <span className="text-[0.9375rem] font-semibold text-ink-900 tracking-tight">{r.name}</span>
                          {r.verified && (
                            <span className="text-[0.6rem] font-bold tracking-[0.15em] uppercase px-3 py-1.5 bg-violet-100/60 text-violet-700 rounded-full border border-violet-200/30">
                              Verified Renter
                            </span>
                          )}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 px-8 bg-porcelain-100/30 arch border border-dashed border-porcelain-200 text-center">
                    <p className="text-ink-400 italic">Be the first to share your experience with this silhouette.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Sticky Booking Panel & Pairing */}
            <aside className="lg:sticky lg:top-32 space-y-12">
               {/* Reservation Card */}
               <div className="bg-porcelain-100 border border-porcelain-200 rounded-card p-10 shadow-card">
                  {p.pricePerDay ? (
                    <div className="space-y-10">
                      <div className="flex flex-col gap-2">
                        <span className="text-eyebrow text-gold-600">Rental Rate</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[2.5rem] font-display text-ink-900 leading-none">₹{formatINR(p.pricePerDay)}</span>
                          <span className="text-ink-400 text-[1.125rem]">/ day</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <DateField label="Event Pickup" />
                        <DateField label="Event Return" />
                      </div>

                      <div className="pt-8 border-t border-porcelain-200">
                        <div className="flex items-center justify-between text-[1rem] mb-8">
                           <span className="text-ink-600 font-medium">Reservation Advance</span>
                           <span className="text-ink-900 font-semibold tabular text-[1.125rem]">₹{formatINR(p.prebook || 0)}</span>
                        </div>
                        <Button href="/visit" variant="primary">
                           Reserve this silhouette
                        </Button>
                        <p className="mt-6 text-center text-caption text-ink-400 italic leading-relaxed">
                          Secure your dates with a small advance.<br/>Live availability arriving soon.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-ink-600 italic mb-6">In-boutique exclusive silhouette.</p>
                      <Button href="/visit" variant="ghost">Enquire at Boutique</Button>
                    </div>
                  )}
               </div>

               {/* Jewellery Cross-sell / Pairing */}
               <div className="bg-violet-900 text-porcelain-50 rounded-card p-10 grain relative overflow-hidden shadow-lift group">
                  <div className="relative z-10">
                    <p className="text-[0.625rem] font-bold tracking-[0.3em] uppercase text-gold-500 mb-4 opacity-80">Complete the Look</p>
                    <h4 className="text-[1.5rem] font-display mb-5 leading-tight">Add Heirloom <br/>Jewellery</h4>
                    <p className="text-violet-300 text-[1rem] leading-relaxed mb-10 opacity-90">
                      Most brides add matching jewellery for their dates. Explore sets curated specifically for this lehenga.
                    </p>
                    <Button href="/jewellery" variant="ghost-dark">
                       Explore Jewellery Pairing
                    </Button>
                  </div>
                  <Ornament className="absolute -bottom-6 -right-6 w-32 opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
               </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

function DateField({ label }: { label: string }) {
  return (
    <label className="block group">
      <span className="mb-3 block text-[0.625rem] font-semibold text-ink-400 uppercase tracking-[0.2em] group-hover:text-gold-600 transition-colors">{label}</span>
      <input
        type="date"
        className="tabular w-full rounded-control border border-porcelain-200 bg-porcelain-50 px-4 py-3.5 text-[1rem] text-ink-900 focus:ring-2 focus:ring-gold-500/10 focus:border-gold-600 focus:outline-none transition-all"
      />
    </label>
  );
}
