import Link from "next/link";
import type { Category } from "@/lib/categories";

/** The narrow copies `tools/make_image_variants.py` writes beside each shipped
 *  photograph, so a phone fetches a file its own size instead of the 660px one.
 *  Without this the five pending cards were 459 KB of the home page's 1.1 MB,
 *  every one of them a 660x880 picture drawn into a 247px box. */
function photoSrcSet(src: string) {
  const stem = src.slice(0, -".webp".length);
  return `${stem}-160.webp 160w, ${stem}-320.webp 320w, ${stem}-480.webp 480w, ${src} 660w`;
}

/** The same run of widths `RentalCard` is laid out at, because these two sit in
 *  one rail and are deliberately the same box. */
const CARD_SIZES = "(min-width: 1024px) 24vw, (min-width: 640px) 38vw, 60vw";

/**
 * A category with nothing photographed yet.
 *
 * The catalogue is 3 pieces against 8 categories (10 Sep 2026) — the owner has
 * not handed over the garment photography. Five categories would otherwise be
 * invisible on the front door, and the rail would read as a shop with almost
 * nothing in it, which is the opposite of true: the rack is full, the pictures
 * are not taken.
 *
 * So this says exactly that, and says it in the shop's own voice. It does NOT
 * invent a garment: no made-up name, no made-up price, no stock photo dressed
 * up as inventory. The site's standing rule is that a visible placeholder is
 * honest and an invented sentence is not (the owner's facts on the home page
 * stay hidden until she gives them), and a fake product card would be the most expensive possible
 * violation of it — a renter would arrive asking for a piece that never existed.
 *
 * The device: the category's own photograph sits under a porcelain scrim, and
 * the scrim lifts on hover. That is a real state being shown, not decoration —
 * "there is something here, it just has not been shot yet" — which is the one
 * thing this card has to communicate. It carries the same arch, the same ratio
 * and the same caption geometry as `RentalCard`, so a rail of both reads as one
 * rail rather than as products plus apologies.
 */
export function PendingCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/rentals?category=${category.slug}`}
      className="press-card group block"
      aria-label={`${category.name} — being photographed. See this category.`}
    >
      <div className="keyline arch relative aspect-[4/5] overflow-hidden bg-stage shadow-card transition-shadow duration-[180ms] ease-out-strong group-hover:shadow-lift">
        {category.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.image}
            srcSet={photoSrcSet(category.image)}
            sizes={CARD_SIZES}
            alt=""
            aria-hidden="true"
            width={660}
            height={880}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-400 ease-out-strong group-hover:scale-[1.03]"
          />
        ) : null}

        {/* The scrim. Heavy enough that the photograph reads as withheld rather
            than as the product shot, and it lifts — not away — on hover: at
            0.62 the garment is legible but plainly not on offer yet. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-porcelain-50/[0.88] transition-opacity duration-300 ease-out-strong group-hover:opacity-[0.62]"
        />

        <span className="absolute left-3 top-4 rounded-full bg-porcelain-100 px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide text-ink-600">
          Being photographed
        </span>

        {/* The ornament that closes every other band on this site, used here as
            the stand-in for the garment itself. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center text-2xl text-gold-600/50 transition-opacity duration-300 ease-out-strong group-hover:opacity-0"
        >
          &#10022;
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-4 px-1 pt-4">
        <div>
          <h3 className="text-[1.35rem] leading-tight transition-colors duration-[180ms] ease-out-strong group-hover:text-violet-700">
            {category.name}
          </h3>
          <p className="mt-0.5 text-caption text-ink-600">On the rack at the shop</p>
        </div>
        <p className="whitespace-nowrap text-caption text-gold-700">Ask us</p>
      </div>
    </Link>
  );
}
