import Link from "next/link";
import { SelectionButton } from "@/components/site/SelectionButton";
import { formatINR } from "@/lib/format";
import { jewelleryImage } from "@/app/jewellery/images";
import type { JewelleryPiece } from "@/lib/jewellery";

/** The narrow copies `tools/make_image_variants.py` writes beside each shipped
 *  photograph, so a phone fetches a file its own size instead of the 660px one.
 *  Only the stand-ins have them; a piece's own uploaded path does not. */
function photoSrcSet(src: string) {
  const stem = src.slice(0, -".webp".length);
  return `${stem}-160.webp 160w, ${stem}-320.webp 320w, ${stem}-480.webp 480w, ${src} 660w`;
}

/**
 * One jewellery piece on /jewellery. RentalCard's shape (arch plate, name and
 * price under it, the gather control over the far corner) so the two
 * catalogues read as one shop; no badges, because none of RentalCard's apply.
 *
 * The picture is the piece's own first still. Until the shelf is photographed
 * a piece borrows its category's stand-in, labelled "Sample photo" on the plate
 * the way a rental card does.
 */
export function JewelleryCard({ p }: { p: JewelleryPiece }) {
  const own = p.images[0] ?? null;
  const sample = own ? null : jewelleryImage(p.category);
  return (
    <div data-piece className="relative">
      <Link href={`/jewellery/${p.slug}`} className="press-card group block">
        <div className="keyline arch relative aspect-[4/5] overflow-hidden bg-stage shadow-card transition-shadow duration-[180ms] ease-out-strong group-hover:shadow-lift">
          {own || sample ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={own?.path ?? sample!}
                srcSet={sample ? photoSrcSet(sample) : undefined}
                sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                alt={own ? own.alt : ""}
                aria-hidden={own ? undefined : true}
                width={660}
                height={880}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-400 ease-out-strong group-hover:scale-[1.03]"
              />
              {sample && (
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
          <div>
            <h3 className="text-[1.35rem] leading-tight transition-colors duration-[180ms] ease-out-strong group-hover:text-violet-700">
              {p.name}
            </h3>
            <p className="mt-0.5 text-caption text-ink-600">{p.categoryName}</p>
          </div>
          <p className="tabular shrink-0 whitespace-nowrap text-[0.9375rem] font-semibold text-ink-900">
            {p.pricePerDay ? (
              <>
                ₹{formatINR(p.pricePerDay)} <span className="font-normal text-ink-600">/ day</span>
              </>
            ) : (
              <span className="font-normal text-ink-600">Ask us</span>
            )}
          </p>
        </div>
      </Link>

      <SelectionButton
        item={{
          slug: p.slug,
          name: p.name,
          kind: "jewellery",
          href: `/jewellery/${p.slug}`,
          image: own?.path ?? null,
          price: p.pricePerDay,
        }}
        size="icon"
        className="absolute right-3 top-4"
      />
    </div>
  );
}
