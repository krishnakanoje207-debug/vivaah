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

// Studio backdrop mimicking the frames' own spotlight vignette so the photo
// edges dissolve into the stage card (the frames aren't background-removed).
const STUDIO_BG =
  "radial-gradient(ellipse at 50% 42%, #d8d7d2 0%, #bcbbb6 55%, #9c9b94 100%)";

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
      {/* ── Act 1: split stage — turntable on the LEFT, the piece's story on the
          RIGHT. Pairing the wide 16:9 frame with the description turns the
          studio margins into a deliberate editorial gutter instead of dead
          whitespace, and vertical centring closes the gap above the garment. ── */}
      <section className="bg-porcelain-50 pt-24 pb-16 md:pt-28 md:pb-20">
        <div className="shell grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          {/* Left: the stage card (leads on mobile too — it's the hero) */}
          <div className="relative">
            {p.spin ? (
              // The frames carry their own even grey studio backdrop, so the card
              // just clips them with rounded corners — full contrast, crisp hem.
              // (The old full-bleed stage needed a feather mask to melt the frame
              // into the page; a contained card wants clean edges instead.)
              <div className="overflow-hidden rounded-card bg-stage shadow-card">
                <SpinViewer config={p.spin} alt={`${p.name} lehenga`} autoplay />
              </div>
            ) : (
              <div
                className="flex aspect-[4/3] items-center justify-center rounded-card text-center text-ink-600 shadow-card"
                style={{ background: STUDIO_BG }}
              >
                <span className="max-w-[16rem] text-[0.9375rem]">
                  Turntable photos coming soon for this piece.
                </span>
              </div>
            )}
          </div>

          {/* Right: the story + booking */}
          <div>
            <nav className="text-caption text-ink-600" aria-label="Breadcrumb">
              <Link href="/rentals" className="hover:text-ink-900">
                Rent
              </Link>
              <span className="mx-2">/</span>
              <span className="text-ink-900">{p.name}</span>
            </nav>

            <p className="eyebrow mt-5">{p.occasion}</p>
            <h1 className="mt-2 font-display text-[2.25rem] leading-[1.05] text-ink-900 md:text-[2.75rem]">
              {p.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded-full ring-1 ring-ink-400"
                  style={{ backgroundColor: p.colourHex }}
                  aria-hidden="true"
                />
                <span className="text-[0.9375rem] text-ink-600">{p.colourName}</span>
              </span>
              {p.reviews.length > 0 && (
                <span className="inline-flex items-center gap-2 text-[0.9375rem] text-ink-600">
                  <ReviewStars rating={avg} />
                  <span className="text-ink-400">({p.reviews.length})</span>
                </span>
              )}
            </div>

            <p className="mt-6 max-w-prose text-ink-600">{p.description}</p>

            {/* Booking panel */}
            <div className="mt-8 rounded-card border border-porcelain-200 bg-porcelain-100 p-6">
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
      </section>

      {/* ── Act 2: supporting detail (gallery · reviews · pairings) ───────── */}
      <section className="bg-porcelain-50 pb-20 md:pb-28">
        {/* Swipeable gallery */}
        {p.spin && (
          <div>
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
