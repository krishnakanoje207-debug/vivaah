import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpinViewer } from "@/components/site/SpinViewer";
import { SwipeGallery } from "@/components/site/SwipeGallery";
import { ReviewStars } from "@/components/site/ReviewStars";
import { Button } from "@/components/ui/Button";
import { RequestButton } from "@/components/site/RequestButton";
import { SelectionButton } from "@/components/site/SelectionButton";
import { Ornament } from "@/components/site/Ornament";
import { Reveal } from "@/components/site/Reveal";
import { WipeIn } from "@/components/site/WipeIn";
import { Parallax } from "@/components/site/Parallax";
import { GoldFrame } from "@/components/site/GoldFrame";
import { SectionEdge } from "@/components/site/SectionEdge";
import { RippleHeading } from "@/components/site/RippleHeading";
import { getRental, formatINR, galleryFrames } from "@/lib/rentals";

/**
 * One rental product — grammar: "two acts".
 *
 * Rebuilt 10 Sep 2026 to join the remade site. It was the last page still on
 * the v2 skin: an ad-hoc warm grey stage that belonged to no palette, arbitrary
 * `text-[NNrem]` sizes instead of the scale tokens, two classes naming tokens
 * that do not exist (`ring-ink-200`, `border-violet-200`, both silently doing
 * nothing), `text-ink-400` on real prose, and none of the motion vocabulary.
 *
 *   Act    Ground                     Composition                    Device
 *   Stage  studio plate → violet-950  one garment, chrome at the     parallax
 *                                     edges                          (+ turntable)
 *   Detail porcelain-50               narrative left, booking right  ripple, reveal, wipe
 *   Close  violet-950                 one door back to the rack      reveal
 *
 * The stage is the whole argument of the page, so it keeps the garment's own
 * colours true: the centre stays the photograph's own studio grey and the
 * palette enters at the periphery only, fading outward to violet-950. A rental
 * customer is judging fabric colour, and a violet wash over the middle of the
 * frame would lie to her.
 *
 * Boundaries are torn, never blended (`SectionEdge`), the same as every other
 * page. Seeds 41 and 42 — every other seed in the tree is taken.
 */

// The studio plate the lead derives from the frames' own background pixels, so
// the studio continues past the frame edges instead of stopping at a rectangle.
// One plate serves every stage: it is neutral studio grey, and lahenga1's is the
// only turntable set that exists. It becomes per-product when a second one does.
const STAGE_BACKDROP = "/rentals/lahenga1/stage-backdrop.webp";

// The 225° turntable is shot on lehengas only — it exists to let her walk around
// a skirt, which is the one silhouette whose back is worth the frames.
const SPIN_CATEGORIES: readonly string[] = ["bridal-lehengas", "side-lehengas"];

// Feathers the photo edges so they dissolve into the studio plate rather than
// showing the frame rectangle's seam (DESIGN_SPEC §8 checklist).
const FEATHER = {
  // `black`/`transparent` here are the mask's alpha stops, not palette colour.
  maskImage:
    "radial-gradient(ellipse 54% 62% at 50% 46%, black 0%, black 70%, transparent 100%)",
  WebkitMaskImage:
    "radial-gradient(ellipse 54% 62% at 50% 46%, black 0%, black 70%, transparent 100%)",
} as const;

// The studio is a lit room inside a dark violet one. Rather than washing violet
// OVER the photograph, which would lie about the fabric colour, the plate is
// masked so it fades out and the section's own violet-950 ground shows through
// around it. Nothing is ever laid on top of the garment.
//
// The first attempt was an overlay at `ellipse 86% 96%`. Those are radii, not
// diameters, so the tinted stops sat outside the visible box: the corner of a
// 1920x1080 stage reached only 78% of the gradient and the edge midpoints
// landed exactly on the last transparent stop. The violet never appeared.
const PLATE_MASK = {
  maskImage:
    "radial-gradient(ellipse 58% 62% at 50% 46%, black 0%, black 20%, rgba(0,0,0,0.6) 56%, rgba(0,0,0,0.22) 80%, transparent 100%)",
  WebkitMaskImage:
    "radial-gradient(ellipse 58% 62% at 50% 46%, black 0%, black 20%, rgba(0,0,0,0.6) 56%, rgba(0,0,0,0.22) 80%, transparent 100%)",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getRental(slug);
  // Not "Bridal Rental": this route serves every rental category, and the
  // turntable gating below is what surfaced the non-lehenga ones.
  return { title: p ? `${p.name} | To rent | Vivaah` : "Not found | Vivaah" };
}

export default async function RentalProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getRental(slug);
  if (!p) notFound();

  const avg =
    p.reviews.length > 0
      ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
      : 0;

  const showSpin = p.spin !== null && SPIN_CATEGORIES.includes(p.category);
  // The front view, for the still stage every non-lehenga gets. Asking
  // `galleryFrames` for one frame divides by zero, so it is asked for two.
  const still = p.spin ? galleryFrames(p.spin, 2)[0] : null;

  return (
    <div className="relative">
      {/* ---------- Act 1: the stage ----------------------------------------
          One garment, one viewport, and nothing else competing with it. The
          chrome is pushed to the two edges the vignette has already darkened.
          `data-dark-hero` (it was `data-stage-hero`) puts Nav into its
          transparent on-dark tone, which is what the periphery now needs.
          `-mt-16` slides the stage under that transparent nav. */}
      <section
        data-dark-hero=""
        /* The flight launches from here: the stage is the garment, and there is
           no <img> to aim at because the turntable draws into a canvas. */
        data-piece
        aria-label={`${p.name} on the stage`}
        className="on-dark relative -mt-16 flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-violet-950"
      >
        {/* The studio, continuing past the frame. It drifts as the stage leaves,
            so the room has depth and the garment does not move with it. The
            overscan covers the parallax travel at every width. */}
        <Parallax distance={48} className="absolute inset-[-4%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={STAGE_BACKDROP}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
            style={PLATE_MASK}
          />
        </Parallax>

        <div className="relative w-full max-w-5xl px-5 md:px-8">
          {showSpin && p.spin ? (
            // The frames are 16:9. Letterboxed into a portrait phone that left
            // the lehenga about 200px tall in a 844px stage, which is no way to
            // show the one thing the page is about. Below md the viewer is
            // cropped to 3:4 instead: the garment is centred in every frame,
            // so widening it loses only backdrop. 237% is the width at which a
            // 16:9 canvas is exactly as tall as a 3:4 box, but exactly is wrong
            // here: it leaves the feather nothing to dissolve into at the top
            // and bottom, and both edges read as seams. 206% keeps the garment
            // large and leaves a band of the studio plate showing above and
            // below, which is the same studio, so the fade has somewhere to go.
            <div
              style={FEATHER}
              className="relative left-1/2 aspect-[3/4] w-[min(100vw,calc(64svh_*_0.75))] -translate-x-1/2 overflow-hidden md:left-auto md:aspect-auto md:w-full md:translate-x-0 md:overflow-visible"
            >
              <div className="absolute left-1/2 top-1/2 w-[206%] -translate-x-1/2 -translate-y-1/2 md:static md:w-full md:translate-x-0 md:translate-y-0">
                <SpinViewer config={p.spin} alt={p.name} autoplay />
              </div>
            </div>
          ) : still && p.spin ? (
            // No turntable outside the lehengas, so the stage is one still and
            // carries neither the arc badge nor the drag affordance.
            <div style={FEATHER}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={still}
                alt={p.name}
                className="w-full object-cover"
                style={{ aspectRatio: `${p.spin.width} / ${p.spin.height}` }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-7 py-24 text-center">
              <Ornament className="on-dark w-40" />
              <p className="font-display text-h2 text-porcelain-50">
                Silhouette arriving soon
              </p>
            </div>
          )}
        </div>

        {/* Chrome, top: where you are. */}
        <div className="absolute inset-x-0 top-20">
          <div className="shell">
            <nav aria-label="Breadcrumb" className="flex items-center gap-4">
              <Link
                href="/rentals"
                /* No hover colour: `.on-dark .eyebrow` outranks a `hover:text-*`
                   utility on source order, so the underline is the affordance. */
                className="eyebrow inline-flex min-h-[44px] items-center underline-offset-4 hover:underline"
              >
                Rentals
              </Link>
              <span aria-hidden="true" className="text-gold-500/40">
                ✦
              </span>
              <span className="text-caption text-porcelain-50">{p.name}</span>
            </nav>
          </div>
        </div>

        {/* Chrome, bottom: the plinth.
            ------------------------------------------------------------------
            This band used to hold "Scroll to explore" and a bouncing chevron,
            which is to say the first viewport of a product page carried no
            name, no price and nothing to press — a breadcrumb over a turntable,
            and every fact about the piece a scroll away. A shopper who arrived
            ready could not act, which is the whole complaint in
            specs/ACTION_ROADMAP.md.

            The stage keeps its full height: it is the best thing on the page
            and shrinking it to make room would trade the argument for the
            label. The plinth sits in the band the garment never reaches, in the
            same register as the breadcrumb opposite it — the caption to an
            object, which is the voice this site already speaks in on the proof
            figures and the jewellery line.

            The chevron stays, demoted to the right: the plinth itself says
            there is more below, so the arrow no longer has to bounce to say it. */}
        <div className="absolute inset-x-0 bottom-0 pb-8 pt-16">
          <div className="shell">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <div className="min-w-0">
                <p className="eyebrow">{p.occasion}</p>
                <p className="mt-2 font-display text-h2 font-medium leading-[1.1] text-porcelain-50">
                  {p.name}
                </p>
                {p.pricePerDay !== null && (
                  <p className="mt-3 text-body text-porcelain-50">
                    <span className="tabular font-medium">
                      ₹{formatINR(p.pricePerDay)}
                    </span>
                    <span className="text-porcelain-50/70"> / day</span>
                  </p>
                )}
              </div>

              <div className="flex items-end gap-6">
                {/* The notice is suppressed here and carried by the booking
                    aside in Act 2 instead: on the stage it would be four lines
                    of small print over a photograph. */}
                <RequestButton
                  piece={p.name}
                  night={p.occasion}
                  tone="dark"
                  notice={false}
                />
                <span
                  aria-hidden="true"
                  className="hidden pb-3 text-gold-500 sm:block"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 13L12 18L17 13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Act 2: the detail page ----------------------------------
          One section, not four, because the booking aside is sticky beside all
          of it and a stack of sections would break that. So the rhythm inside
          it is carried by the devices rather than by grounds: the name arrives
          on a letter ripple, the facts reveal under it, and the gallery and the
          reviews wipe in per object, the way the rental catalogue does. */}
      <section className="relative bg-porcelain-50 pt-28 pb-28 md:pt-32 md:pb-32">
        <SectionEdge
          seed={41}
          paper="var(--color-violet-950)"
          reveal="var(--color-porcelain-50)"
        />

        <div className="shell relative">
          <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24 xl:gap-32">
            {/* Left: what the piece is, how it photographs, who has worn it. */}
            <div className="min-w-0 space-y-20 md:space-y-24">
              {/* The name is the only heading that carries the ripple on its
                  own; everything around it reveals. RippleHeading is inside the
                  Reveal but takes no [data-reveal], so the two devices never
                  animate the same element (the idiom on /visit). */}
              <Reveal>
                <p data-reveal className="eyebrow">
                  {p.occasion}
                </p>

                <RippleHeading as="h1" className="mt-5 text-h1 text-ink-900">
                  {p.name}
                </RippleHeading>

                <div
                  data-reveal
                  className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="inline-block h-6 w-6 rounded-full ring-1 ring-ink-900/20"
                      style={{ backgroundColor: p.colourHex }}
                    />
                    <span className="text-body font-medium text-ink-900">
                      {p.colourName}
                    </span>
                  </div>
                  {p.reviews.length > 0 && (
                    <div className="flex items-center gap-4 sm:border-l sm:border-porcelain-200 sm:pl-8">
                      <ReviewStars rating={avg} className="text-h3" />
                      <span className="text-body text-ink-600">
                        ({p.reviews.length} perspectives)
                      </span>
                    </div>
                  )}
                </div>

                {/* The gold hairline is the paragraph's own left border, so it
                    cannot fall outside the gutter on a phone the way an
                    absolutely positioned rule at -2rem did. */}
                <p
                  data-reveal
                  className="mt-14 max-w-[46ch] border-l border-gold-500/30 pl-6 font-display text-h3 italic leading-[1.6] text-ink-600 md:pl-8"
                >
                  {p.description}
                </p>
              </Reveal>

              {/* The stills, for the details the turntable moves past. */}
              {p.spin && (
                <div>
                  <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-4 border-b border-porcelain-200 pb-6">
                    <div>
                      <p data-reveal className="eyebrow mb-2">
                        Detailed View
                      </p>
                      <RippleHeading className="text-h2 text-ink-900">
                        Studio Perspectives
                      </RippleHeading>
                    </div>
                    <span
                      data-reveal
                      className="text-caption italic uppercase tracking-widest text-ink-600"
                    >
                      Swipe to zoom
                    </span>
                  </Reveal>
                  <WipeIn>
                    <SwipeGallery images={galleryFrames(p.spin, 6)} alt={p.name} />
                  </WipeIn>
                </div>
              )}

              {/* What she said afterwards. */}
              <div>
                <Reveal className="mb-12">
                  <p data-reveal className="eyebrow mb-3">
                    Customer Perspective
                  </p>
                  <RippleHeading className="text-h2 text-ink-900">
                    Reflections of her day
                  </RippleHeading>
                </Reveal>

                {p.reviews.length > 0 ? (
                  <WipeIn className="grid gap-8 md:grid-cols-2">
                    {p.reviews.map((r) => (
                      <figure
                        key={r.name}
                        data-wipe
                        className="arch group relative border border-porcelain-200/50 bg-porcelain-100/40 p-7 md:p-10"
                      >
                        <div
                          aria-hidden="true"
                          className="absolute right-8 top-8 text-h3 text-gold-500/25 transition-colors duration-[180ms] group-hover:text-gold-500/50"
                        >
                          ✦
                        </div>
                        <ReviewStars rating={r.rating} />
                        <blockquote className="mt-6 font-display text-body leading-relaxed text-ink-600">
                          &ldquo;{r.body}&rdquo;
                        </blockquote>
                        <figcaption className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-porcelain-200/60 pt-6">
                          <span className="text-body font-semibold text-ink-900">
                            {r.name}
                          </span>
                          {r.verified && (
                            <span className="rounded-full border border-violet-300/60 bg-violet-100/60 px-3 py-1.5 text-eyebrow font-semibold uppercase tracking-[0.12em] text-violet-700">
                              Verified Renter
                            </span>
                          )}
                        </figcaption>
                      </figure>
                    ))}
                  </WipeIn>
                ) : (
                  <div className="arch border border-dashed border-porcelain-200 bg-porcelain-100/30 px-8 py-12 text-center">
                    <p className="italic text-ink-600">
                      Be the first to share your experience with this silhouette.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: the dates and the pairing. Sticky from lg only — on a
                phone it is simply the last thing on the page. */}
            <aside className="min-w-0 space-y-12 lg:sticky lg:top-32">
              <Reveal>
                <div
                  data-reveal
                  className="rounded-card border border-porcelain-200 bg-porcelain-100 p-6 shadow-card sm:p-8 lg:p-10"
                >
                  {p.pricePerDay ? (
                    <div className="space-y-10">
                      <div className="flex flex-col gap-2">
                        <span className="eyebrow">Rental Rate</span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-display text-h2 leading-none text-ink-900">
                            ₹{formatINR(p.pricePerDay)}
                          </span>
                          <span className="text-body text-ink-600">/ day</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <DateField label="Event Pickup" />
                        <DateField label="Event Return" />
                      </div>

                      <div className="border-t border-porcelain-200 pt-8">
                        <div className="mb-8 flex flex-wrap items-center justify-between gap-2 text-body">
                          <span className="font-medium text-ink-600">
                            Reservation Advance
                          </span>
                          <span className="tabular font-semibold text-ink-900">
                            ₹{formatINR(p.prebook || 0)}
                          </span>
                        </div>
                        {/* Was a hardcoded /visit link reading "Reserve this
                            silhouette", under "Secure your dates with a small
                            advance." No dates were secured, no advance taken,
                            and it went to a directions page — it spent the
                            visitor's intent and returned nothing. The advance
                            figure above it is real and stays; what it buys is
                            Phase 2's job to promise. */}
                        <RequestButton piece={p.name} night={p.occasion} />

                        {/* Gathering is the quieter of the two: asking about
                            this one piece now is the primary act, and setting
                            it aside to ask about several later is the
                            alternative, so it takes the outline. */}
                        <SelectionButton
                          className="mt-4 w-full justify-center"
                          item={{
                            slug: p.slug,
                            name: p.name,
                            kind: "rental",
                            href: `/rentals/${p.slug}`,
                            image: still,
                            price: p.pricePerDay,
                          }}
                        />
                        <p className="mt-6 text-caption italic leading-relaxed text-ink-600">
                          Dates are confirmed by message, and the advance is
                          taken once a piece is held.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="mb-6 italic text-ink-600">
                        In-boutique exclusive silhouette.
                      </p>
                      <Button href="/visit" variant="ghost">
                        Enquire at Boutique
                      </Button>
                    </div>
                  )}
                </div>
              </Reveal>

              {/* The page's one decorative plate, so it is the one that wears
                  the drawn keyline (GoldFrame's own rule: it stops meaning
                  anything if everything wears one). */}
              <Reveal>
                <div data-reveal>
                  <GoldFrame tone="dark" className="on-dark">
                    <div className="grain group relative overflow-hidden rounded-card bg-violet-900 p-8 text-porcelain-50 shadow-lift lg:p-10">
                      <div className="relative z-10">
                        <p className="eyebrow mb-4">Complete the Look</p>
                        <h2 className="mb-5 text-h3 leading-tight text-porcelain-50">
                          Add matching jewellery
                        </h2>
                        <p className="mb-10 max-w-[38ch] leading-relaxed text-violet-300">
                          Most brides add matching jewellery for their dates.
                          Explore sets curated specifically for this lehenga.
                        </p>
                        <Button href="/jewellery" variant="ghost-dark">
                          Explore Jewellery Pairing
                        </Button>
                      </div>
                      <Ornament className="absolute -bottom-6 -right-6 w-32 opacity-10 transition-opacity duration-700 group-hover:opacity-20" />
                    </div>
                  </GoldFrame>
                </div>
              </Reveal>
            </aside>
          </div>
        </div>
      </section>

      {/* ---------- Close: back to the rack ---------------------------------
          One door, on the ground the footer already stands on, so the tear is
          the page's last edge and the footer continues it. */}
      <section className="grain on-dark relative bg-violet-950 pt-24 pb-16 md:pt-28 md:pb-20">
        <SectionEdge
          seed={42}
          paper="var(--color-porcelain-50)"
          reveal="var(--color-violet-950)"
        />

        <Reveal className="shell relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <div data-reveal>
            <p className="eyebrow">Rentals</p>
            <Ornament className="mt-5 w-28" />
          </div>
          <div data-reveal>
            <Button href="/rentals" variant="ghost-dark">
              See what else is in for rent
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function DateField({ label }: { label: string }) {
  return (
    <label className="block min-w-0">
      <span className="eyebrow mb-3 block">{label}</span>
      <input
        type="date"
        className="tabular w-full min-w-0 rounded-control border border-porcelain-200 bg-porcelain-50 px-4 py-3.5 text-body text-ink-900 transition-colors duration-[180ms] focus:border-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
      />
    </label>
  );
}
