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
  return { title: p ? p.name : "Lehenga" };
}

const PAIRINGS = ["Kundan set", "Polki earrings", "Maang tikka"];

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
    <>
      {/* ── Act 1: the stage (full uncropped frame; capped to native width so
          it never upscales; studio-vignette backdrop blends the frame edges) ── */}
      <section
        className="relative pt-16"
        style={{
          // Studio backdrop mimicking the frames' own spotlight vignette so the
          // photo edges dissolve into the page (the frames aren't bg-removed).
          background:
            "radial-gradient(ellipse at 50% 42%, #d8d7d2 0%, #bcbbb6 55%, #9c9b94 100%)",
        }}
      >
        <div className="relative mx-auto w-full max-w-[1100px]">
          {p.spin ? (
            // Feather the photo edges so they dissolve into the studio backdrop
            // (the frames aren't background-removed, so this hides the seam).
            <div
              style={{
                maskImage:
                  "radial-gradient(ellipse 100% 100% at 50% 46%, #000 84%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 100% 100% at 50% 46%, #000 84%, transparent 100%)",
              }}
            >
              <SpinViewer config={p.spin} alt={`${p.name} lehenga`} autoplay />
            </div>
          ) : (
            <div className="flex min-h-[60svh] items-center justify-center text-center text-ink-600">
              <span className="max-w-[16rem] text-[0.9375rem]">
                Turntable photos coming soon for this piece.
              </span>
            </div>
          )}

          {/* Name overlaid on the stage (lower-left, over the studio floor) */}
          <div className="pointer-events-none absolute bottom-6 left-6 z-10 md:bottom-8 md:left-8">
            <nav className="pointer-events-auto text-caption text-ink-600" aria-label="Breadcrumb">
              <Link href="/rentals" className="hover:text-ink-900">
                Rent
              </Link>
              <span className="mx-2">/</span>
              <span className="text-ink-900">{p.name}</span>
            </nav>
            <h1 className="mt-1 font-display text-[2rem] leading-none text-ink-900 md:text-[2.5rem]">
              {p.name}
            </h1>
          </div>
        </div>
      </section>

      {/* ── Act 2: the details ─────────────────────────────────────────── */}
      <section className="bg-porcelain-50 py-20 md:py-28">
        <div className="shell grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          {/* Left: story */}
          <div>
            <p className="eyebrow">{p.occasion}</p>
            <h2 className="mt-3 text-h2">{p.name}</h2>
            <div className="mt-4 flex items-center gap-3">
              <span
                className="inline-block h-4 w-4 rounded-full ring-1 ring-ink-400"
                style={{ backgroundColor: p.colourHex }}
                aria-hidden="true"
              />
              <span className="text-[0.9375rem] text-ink-600">{p.colourName}</span>
              {p.reviews.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-2 text-[0.9375rem] text-ink-600">
                  <ReviewStars rating={avg} />
                  <span className="text-ink-400">({p.reviews.length})</span>
                </span>
              )}
            </div>
            <p className="mt-6 max-w-prose text-ink-600">{p.description}</p>
          </div>

          {/* Right: booking panel */}
          <div>
            <div className="lg:sticky lg:top-24 rounded-card border border-porcelain-200 bg-porcelain-100 p-6">
              {p.pricePerDay ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-ink-600">Rent</span>
                    <span className="tabular text-[1.25rem] font-semibold text-ink-900">
                      ₹{formatINR(p.pricePerDay)}
                      <span className="text-[0.9375rem] font-normal text-ink-400"> / day</span>
                    </span>
                  </div>
                  {p.prebook != null && (
                    <div className="mt-2 flex items-baseline justify-between text-[0.9375rem]">
                      <span className="text-ink-600">Advance to reserve</span>
                      <span className="tabular text-ink-900">₹{formatINR(p.prebook)}</span>
                    </div>
                  )}
                  <p className="mt-1 text-caption text-ink-400">Indicative rate — set by the shop.</p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <DateField label="Pickup" />
                    <DateField label="Return" />
                  </div>

                  <div className="mt-5">
                    <Button href="/visit" variant="primary">
                      Check availability
                    </Button>
                  </div>
                  <p className="mt-3 text-caption text-ink-400">
                    Live availability &amp; UPI booking arrive in the next build phase.
                  </p>
                </>
              ) : (
                <p className="text-ink-600">
                  This piece is being photographed. Ask us in the shop to reserve it in the
                  meantime.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Swipeable gallery */}
        {p.spin && (
          <div className="mt-16 md:mt-20">
            <div className="shell">
              <p className="eyebrow">Every angle</p>
              <h3 className="mt-2 text-h3">See the detail</h3>
            </div>
            <div className="mt-6 pl-[max(1.25rem,calc((100vw-1200px)/2+2rem))] pr-5">
              <SwipeGallery images={galleryFrames(p.spin, 5)} alt={p.name} />
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="shell mt-16 md:mt-20">
          <div className="flex items-center gap-3">
            <h3 className="text-h3">Reviews</h3>
            {p.reviews.length > 0 && (
              <span className="rounded-full bg-porcelain-100 px-2.5 py-0.5 text-caption text-ink-600">
                sample
              </span>
            )}
          </div>
          {p.reviews.length > 0 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {p.reviews.map((r) => (
                <figure key={r.name} className="rounded-card bg-porcelain-100 p-5">
                  <ReviewStars rating={r.rating} />
                  <blockquote className="mt-3 text-[0.9375rem] text-ink-600">“{r.body}”</blockquote>
                  <figcaption className="mt-4 flex items-center gap-2 text-caption text-ink-900">
                    {r.name}
                    {r.verified && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[0.6875rem] text-violet-700">
                        verified renter
                      </span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-ink-600">Be the first to review after your event.</p>
          )}
        </div>

        {/* Complete the look */}
        <div className="shell mt-16 md:mt-20">
          <div className="my-8">
            <Ornament className="max-w-[10rem]" />
          </div>
          <p className="eyebrow">Complete the look</p>
          <h3 className="mt-2 text-h3">Jewellery to match</h3>
          <p className="mt-2 max-w-lg text-ink-600">
            Most renters add jewellery for the same dates. When booking opens, matching pieces will
            slide in as you reserve.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {PAIRINGS.map((j) => (
              <div key={j} className="group">
                <div className="arch aspect-square overflow-hidden bg-stage shadow-card" />
                <p className="mt-3 text-[0.9375rem] text-ink-900">{j}</p>
                <p className="text-caption text-ink-400">Rentable · coming soon</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Button href="/visit" variant="ghost">
              Book a trial visit
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function DateField({ label }: { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption text-ink-600">{label}</span>
      <input
        type="date"
        className="tabular w-full rounded-control border border-porcelain-200 bg-porcelain-50 px-3 py-2 text-[0.9375rem] text-ink-900 focus:border-gold-600 focus:outline-none"
      />
    </label>
  );
}
