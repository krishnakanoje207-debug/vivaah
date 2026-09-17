import Link from "next/link";
import { SelectionButton } from "@/components/site/SelectionButton";
import { formatINR } from "@/lib/format";
import type { RetailCard as Card } from "@/lib/retail";

/** The narrow copies `tools/make_image_variants.py` writes beside each shipped
 *  photograph, so a phone fetches a file its own size instead of the 660px one.
 *  Only the category stand-in has them; a piece's own uploaded path does not. */
function photoSrcSet(src: string) {
  const stem = src.slice(0, -".webp".length);
  return `${stem}-160.webp 160w, ${stem}-320.webp 320w, ${stem}-480.webp 480w, ${src} 660w`;
}

/**
 * One piece on the shop's rail — the retail counterpart of RentalCard.
 *
 * It is the same object in the same hand: an arch-topped plate, the name and
 * the price under it, the gather control laid over the far corner, and the
 * honest "Sample photo" label where the picture is the category's and not this
 * piece's. Three things differ, and each is a fact about the trade rather than
 * a style choice:
 *
 *   - the price is outright, not "/ day";
 *   - a piece that comes in several colours says so, because the card shows
 *     one of them and the page has the rest. It says how many COLOURS, never
 *     how many pieces: the owner shows sizes and not counts (RETAIL_SPEC R3);
 *   - there is no "Just in" badge here. `productBadges` earns that on the
 *     rental rail, where the shop's claim is that the rail turns over; the
 *     retail rail turns over too, but no owner decision has asked the card to
 *     say so, and a badge that appears on every card says nothing.
 */
export function PieceCard({ p }: { p: Card }) {
  return (
    /* The card is a link, so the gather control is a sibling laid over it, not
       a button nested in an anchor. `data-piece` marks the flight's origin. */
    <div data-piece className="relative">
      <Link href={`/retail/${p.slug}`} className="press-card group block">
        <div className="keyline arch relative aspect-[4/5] overflow-hidden bg-stage shadow-card transition-shadow duration-[180ms] ease-out-strong group-hover:shadow-lift">
          {p.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                srcSet={p.sample ? photoSrcSet(p.image) : undefined}
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                alt={p.sample ? "" : p.name}
                {...(p.sample ? { "aria-hidden": "true" as const } : {})}
                width={660}
                height={880}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-400 ease-out-strong group-hover:scale-[1.03]"
              />
              {p.sample && (
                <span className="absolute bottom-4 left-3 rounded-full bg-porcelain-50/90 px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide text-ink-900">
                  Sample photo
                </span>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-porcelain-100">
              <span aria-hidden="true" className="text-2xl text-gold-600/50">
                &#10022;
              </span>
              <span className="text-caption text-ink-600">Photograph coming</span>
            </div>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-4 px-1 pt-4">
          <div className="min-w-0">
            <h3 className="text-[1.35rem] leading-tight transition-colors duration-[180ms] ease-out-strong group-hover:text-violet-700">
              {p.name}
            </h3>
            <p className="mt-0.5 text-caption text-ink-600">
              {p.colours > 1 ? `${p.colours} colours` : p.colourName}
            </p>
          </div>
          <p className="tabular shrink-0 whitespace-nowrap text-[0.9375rem] font-semibold text-ink-900">
            {p.price ? (
              <>₹{formatINR(p.price)}</>
            ) : (
              <span className="font-normal text-ink-600">Ask at the shop</span>
            )}
          </p>
        </div>
      </Link>

      <SelectionButton
        item={{
          slug: p.slug,
          name: p.name,
          kind: "retail",
          href: `/retail/${p.slug}`,
          image: p.image,
          price: p.price,
        }}
        size="icon"
        className="absolute right-3 top-4"
      />
    </div>
  );
}
