import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PieceStage } from "@/components/retail/PieceStage";
import { ReviewStars } from "@/components/site/ReviewStars";
import { Button } from "@/components/ui/Button";
import { Ornament } from "@/components/site/Ornament";
import { Reveal } from "@/components/site/Reveal";
import { RippleHeading } from "@/components/site/RippleHeading";
import { SectionEdge } from "@/components/site/SectionEdge";
import { getRetailPiece } from "@/lib/retail";
import { formatINR } from "@/lib/format";
import { RETAIL_CATEGORIES } from "@/lib/categories";

/**
 * One retail piece — the half of the shop you keep.
 *
 * Built 17 Sep 2026 to specs/RETAIL_SPEC.md §3.2. It is deliberately NOT the
 * rental product page in another colourway:
 *
 *   - **No turntable.** The 225° arc is lehengas only (`SPIN_CATEGORIES`): it
 *     exists to let a renter walk around a skirt. Retail has no frame sets at
 *     all, and a page shaped around a viewer it does not have would be a hole.
 *   - **No dark stage.** `/retail` is the daylight half of the site — its head
 *     is porcelain and its grammar is "catalogue, not essay". A full-viewport
 *     violet stage would also push the size picker below the fold, and a size
 *     is the question this page exists to answer.
 *   - **The question comes first.** Colour and size sit beside the photograph
 *     in the first screen, because a shopper who knows her size has one thing
 *     to do here and specs/ACTION_ROADMAP.md is about how far she is from it.
 *
 *   Act      Ground        Composition                        Device
 *   Piece    porcelain-50  photograph left, the choice right  (none — it is a form)
 *   Detail   porcelain-100 description and what she said      ripple, reveal
 *   Close    violet-950    one door back to the shop          reveal
 *
 * Boundaries are torn, never blended: SectionEdge at each seam. Seeds 43 and
 * 44 — every lower seed in the tree is taken.
 *
 * The first act carries no motion device on purpose. Everywhere else on the
 * site a device introduces something to read; here the first screen is a
 * control she is about to use, and animating a size picker into place delays
 * the only thing she came for.
 */

const categoryName = (slug: string) =>
  RETAIL_CATEGORIES.find((c) => c.slug === slug)?.name ?? "Shop";

const categoryImage = (slug: string) =>
  RETAIL_CATEGORIES.find((c) => c.slug === slug)?.image ?? null;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getRetailPiece(slug);
  if (!p) return { title: "Piece not found" };

  const price = p.price !== null ? ` ₹${formatINR(p.price)}.` : "";
  const description = `${p.name}: ${categoryName(p.category).toLowerCase()} to buy at Vivaah Dresses and Suits.${price} Reserve your size online and collect it at the shop.`;
  const image = p.variants.find((v) => v.images.length > 0)?.images[0]?.path ?? null;

  return {
    title: `${p.name}, to keep`,
    description,
    openGraph: {
      title: `${p.name}, to keep`,
      description,
      // Only a real photograph of the piece. The category picture stands in on
      // the page, where it is labelled a sample; a share card has no room for
      // that label, and an unlabelled stand-in is a different claim.
      ...(image ? { images: [{ url: image, alt: p.name }] } : {}),
    },
  };
}

export default async function RetailProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getRetailPiece(slug);
  if (!p) notFound();

  const avg =
    p.reviews.length > 0 ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : 0;

  return (
    <div className="relative">
      {/* ---------- Act 1: the piece ---------------------------------------- */}
      <section className="relative bg-porcelain-50 pb-20 pt-28 md:pb-24 md:pt-32">
        <div className="shell">
          <nav aria-label="Breadcrumb" className="mb-10 flex flex-wrap items-center gap-4">
            <Link
              href="/retail"
              className="eyebrow inline-flex min-h-[44px] items-center text-ink-600 underline-offset-4 hover:underline"
            >
              Shop
            </Link>
            <span aria-hidden="true" className="text-gold-600/50">
              ✦
            </span>
            <Link
              href={`/retail?category=${p.category}`}
              className="eyebrow inline-flex min-h-[44px] items-center text-ink-600 underline-offset-4 hover:underline"
            >
              {categoryName(p.category)}
            </Link>
          </nav>

          <PieceStage
            slug={p.slug}
            name={p.name}
            variants={p.variants}
            sample={categoryImage(p.category)}
            category={categoryName(p.category)}
          />
        </div>
      </section>

      {/* ---------- Act 2: the detail --------------------------------------- */}
      <section className="relative bg-porcelain-100 pb-24 pt-24 md:pb-28 md:pt-28">
        <SectionEdge
          seed={43}
          paper="var(--color-porcelain-50)"
          reveal="var(--color-porcelain-100)"
        />

        <div className="shell relative grid grid-cols-1 gap-16 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
          <div className="min-w-0">
            {p.description && (
              <Reveal>
                <RippleHeading as="h2" className="text-h2 text-ink-900">
                  About this piece
                </RippleHeading>
                <p
                  data-reveal
                  className="mt-10 max-w-[46ch] border-l border-gold-500/30 pl-6 font-display text-h3 italic leading-[1.6] text-ink-600 md:pl-8"
                >
                  {p.description}
                </p>
              </Reveal>
            )}

            <div className={p.description ? "mt-20" : ""}>
              <RippleHeading as="h2" className="mb-10 text-h2 text-ink-900">
                What she said afterwards
              </RippleHeading>
              {p.reviews.length > 0 ? (
                <>
                  <div className="mb-10 flex items-center gap-4">
                    <ReviewStars rating={avg} className="text-h3" />
                    <span className="text-body text-ink-600">
                      ({p.reviews.length} {p.reviews.length === 1 ? "perspective" : "perspectives"})
                    </span>
                  </div>
                  <div className="grid gap-8 md:grid-cols-2">
                    {p.reviews.map((r) => (
                      <figure
                        key={r.name}
                        className="arch border border-porcelain-200/60 bg-porcelain-50 p-7 md:p-10"
                      >
                        <ReviewStars rating={r.rating} />
                        <blockquote className="mt-6 font-display text-body leading-relaxed text-ink-600">
                          &ldquo;{r.body}&rdquo;
                        </blockquote>
                        <figcaption className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-porcelain-200/60 pt-6">
                          <span className="text-body font-semibold text-ink-900">{r.name}</span>
                          {r.verified && (
                            <span className="rounded-full border border-violet-300/60 bg-violet-100/60 px-3 py-1.5 text-eyebrow font-semibold uppercase tracking-[0.12em] text-violet-700">
                              Bought here
                            </span>
                          )}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </>
              ) : (
                <div className="arch border border-dashed border-porcelain-200 bg-porcelain-50/60 px-8 py-12 text-center">
                  <p className="italic text-ink-600">
                    No one has written about this piece yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* What reserving actually means here, said once and plainly. It is
              a different promise from a rental's: nothing comes back. */}
          <aside className="min-w-0">
            <Reveal>
              <div
                data-reveal
                className="rounded-card border border-porcelain-200 bg-porcelain-50 p-8 shadow-card lg:p-10"
              >
                <h2 className="text-h3 text-ink-900">How reserving works</h2>
                <ol className="mt-8 space-y-6">
                  {[
                    ["It comes off the rail", "Held under your name in the size you chose, from the moment you ask."],
                    ["We ring to confirm", "And again about two hours before you come in."],
                    ["Try it on at the shop", "Small alterations are pinned there."],
                    ["Pay at the counter", "Nothing is paid online, and nothing is posted."],
                  ].map(([title, body], i) => (
                    <li key={title} className="flex gap-5">
                      <span className="tabular mt-1 shrink-0 text-caption text-gold-700">
                        0{i + 1}
                      </span>
                      <div>
                        <p className="font-medium text-ink-900">{title}</p>
                        <p className="mt-1 text-caption leading-relaxed text-ink-600">{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </aside>
        </div>
      </section>

      {/* ---------- Close: back to the shop --------------------------------- */}
      <section className="grain on-dark relative bg-violet-950 pb-16 pt-24 md:pb-20 md:pt-28">
        <SectionEdge
          seed={44}
          paper="var(--color-porcelain-100)"
          reveal="var(--color-violet-950)"
        />
        <Reveal className="shell relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <div data-reveal>
            <Ornament className="w-28" />
          </div>
          <div data-reveal>
            <Button href="/retail" variant="ghost-dark">
              See what else is in the shop
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
