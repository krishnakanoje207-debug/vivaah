import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SwipeGallery } from "@/components/site/SwipeGallery";
import { RequestButton } from "@/components/site/RequestButton";
import { SelectionButton } from "@/components/site/SelectionButton";
import { Reveal } from "@/components/site/Reveal";
import { WipeIn } from "@/components/site/WipeIn";
import { Parallax } from "@/components/site/Parallax";
import { SectionEdge } from "@/components/site/SectionEdge";
import { RippleHeading } from "@/components/site/RippleHeading";
import { Button } from "@/components/ui/Button";
import { getJewelleryPiece } from "@/lib/jewellery";
import { formatINR } from "@/lib/format";
import { jewelleryImage } from "@/app/jewellery/images";

/**
 * One jewellery piece (15 Sep 2026). Stills only: jewellery is photographed
 * flat, so there is no turntable and no studio stage to continue.
 *
 *   Act     Ground        Composition                          Device
 *   Plate   violet-950    the still in an arch, facts beside   parallax, ripple
 *   Detail  porcelain-50  description and the other stills     reveal, wipe
 *   Close   violet-950    back to the category                 reveal
 *
 * The request is for this piece alone: jewellery can go out without an outfit
 * now, so the plate carries the ask directly and the outfit is the aside.
 * Seeds 43-44 are new; every lower one is taken.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getJewelleryPiece(slug);
  if (!p) return { title: "Piece not found" };
  const price = p.pricePerDay !== null ? ` ₹${formatINR(p.pricePerDay)} a day.` : "";
  const description = `${p.name}: ${p.categoryName} jewellery to rent from Vivaah Dresses and Suits, on its own or with an outfit.${price} Try it on and collect it at the shop.`;
  const image = p.images[0]?.path;
  return {
    title: `${p.name}, to rent`,
    description,
    openGraph: {
      title: `${p.name}, to rent`,
      description,
      ...(image ? { images: [{ url: image, alt: p.images[0].alt }] } : {}),
    },
  };
}

export default async function JewelleryPiecePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getJewelleryPiece(slug);
  if (!p) notFound();

  const lead = p.images[0] ?? null;
  const sample = lead ? null : jewelleryImage(p.category);
  const rest = p.images.slice(1).map((i) => i.path);
  const hasDetail = !!p.description || p.occasions.length > 0 || rest.length > 0;
  const categoryHref = p.category ? `/jewellery?category=${p.category}#pieces` : "/jewellery#pieces";

  return (
    <div className="relative">
      {/* ---------- Plate ------------------------------------------------------ */}
      <section
        data-dark-hero="scrim"
        aria-label={p.name}
        className="on-dark grain relative -mt-16 flex min-h-[100svh] items-center bg-violet-950 pt-28 pb-20 md:pt-32"
      >
        <div className="shell-wide relative z-[1] w-full">
          <nav aria-label="Breadcrumb" className="mb-10 flex flex-wrap items-center gap-4 md:mb-14">
            <Link
              href="/jewellery"
              className="eyebrow inline-flex min-h-[44px] items-center underline-offset-4 hover:underline"
            >
              Jewellery
            </Link>
            {p.categoryName && (
              <>
                <span aria-hidden="true" className="text-gold-500/40">
                  ✦
                </span>
                <Link
                  href={categoryHref}
                  className="eyebrow inline-flex min-h-[44px] items-center underline-offset-4 hover:underline"
                >
                  {p.categoryName}
                </Link>
              </>
            )}
          </nav>

          <div className="grid items-center gap-12 md:grid-cols-[auto_minmax(0,30rem)] md:justify-center lg:gap-24">
            <Parallax
              distance={30}
              className="w-full max-w-[26rem] justify-self-center md:w-[clamp(18rem,32vw,32rem)] md:max-w-none"
            >
              <div data-piece className="keyline arch relative aspect-[4/5] overflow-hidden bg-porcelain-100 shadow-lift">
                {lead || sample ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={lead?.path ?? sample!}
                      alt={lead ? lead.alt : ""}
                      aria-hidden={lead ? undefined : true}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {sample && (
                      <span className="absolute bottom-4 left-4 rounded-full bg-porcelain-50/90 px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide text-ink-900">
                        Sample photo
                      </span>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <span aria-hidden="true" className="text-2xl text-gold-600/60">
                      &#10022;
                    </span>
                    <span className="text-caption text-ink-600">Photograph coming</span>
                  </div>
                )}
              </div>
            </Parallax>

            <div>
              <RippleHeading as="h1" className="text-h1 text-porcelain-50">
                {p.name}
              </RippleHeading>

              {p.pricePerDay !== null && (
                <p className="mt-6 text-body text-porcelain-50">
                  <span className="tabular font-display text-h2 leading-none">
                    ₹{formatINR(p.pricePerDay)}
                  </span>
                  <span className="text-porcelain-50/70"> / day</span>
                </p>
              )}
              {/* Paid over the counter: nothing is taken online
                  (BOOKING_ENGINE_SPEC_V2 D1). */}
              {p.prebook !== null && p.prebook > 0 && (
                <p className="mt-2 text-caption text-violet-300">
                  Advance, paid at the shop:{" "}
                  <span className="tabular text-porcelain-50">₹{formatINR(p.prebook)}</span>
                </p>
              )}

              <div className="mt-10 space-y-4">
                <RequestButton
                  piece={p.name}
                  slug={p.slug}
                  kind="jewellery"
                  tone="dark"
                  ask
                />
                <SelectionButton
                  tone="dark"
                  item={{
                    slug: p.slug,
                    name: p.name,
                    kind: "jewellery",
                    href: `/jewellery/${p.slug}`,
                    image: lead?.path ?? null,
                    price: p.pricePerDay,
                  }}
                />
              </div>

              <p className="mt-10 border-l border-gold-500/40 pl-5 text-caption text-violet-300">
                Renting an outfit too? Reserve this set for the same dates.{" "}
                <Link href="/rentals" className="text-gold-500 underline-offset-4 hover:underline">
                  See what is in for rent
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Detail -----------------------------------------------------
          Only what exists: a piece with no description, no occasions and one
          still has nothing more to say, and the page closes after the plate. */}
      {hasDetail && (
        <section className="relative bg-porcelain-50 pt-28 pb-24 md:pt-32 md:pb-28">
          <SectionEdge
            seed={43}
            paper="var(--color-violet-950)"
            reveal="var(--color-porcelain-50)"
          />

          <div className="shell relative space-y-20">
            {(p.description || p.occasions.length > 0) && (
              <Reveal>
                {p.occasions.length > 0 && (
                  <ul data-reveal className="flex flex-wrap gap-2">
                    {p.occasions.map((o) => (
                      <li
                        key={o}
                        className="rounded-full border border-ink-900/15 px-3 py-1 text-caption text-ink-900"
                      >
                        {o}
                      </li>
                    ))}
                  </ul>
                )}
                {p.description && (
                  <p
                    data-reveal
                    className="mt-10 max-w-[46ch] border-l border-gold-500/30 pl-6 font-display text-h3 italic leading-[1.6] text-ink-600 md:pl-8"
                  >
                    {p.description}
                  </p>
                )}
              </Reveal>
            )}

            {rest.length > 0 && (
              <WipeIn>
                <SwipeGallery images={rest} alt={p.name} />
              </WipeIn>
            )}
          </div>
        </section>
      )}

      {/* ---------- Close ------------------------------------------------------ */}
      <section className="grain on-dark relative bg-violet-950 pt-24 pb-16 md:pt-28 md:pb-20">
        {/* Straight on from the plate when there is no detail: the same
            ground on both sides of a tear would draw nothing. */}
        {hasDetail && (
          <SectionEdge
            seed={44}
            paper="var(--color-porcelain-50)"
            reveal="var(--color-violet-950)"
          />
        )}

        <Reveal className="shell relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <p data-reveal className="font-display text-h3 text-porcelain-50">
            {p.categoryName ? `More ${p.categoryName} jewellery.` : "More jewellery."}
          </p>
          <div data-reveal>
            <Button href={categoryHref} variant="ghost-dark">
              See the pieces
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
