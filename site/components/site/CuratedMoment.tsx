import { Reveal } from "@/components/site/Reveal";
import type { Category } from "@/lib/categories";

/**
 * "Curated for your moment" — full-viewport category hero for a filtered view
 * (CATEGORY_IMMERSION_PLAN W5). Updated with background video support for sarees.
 */

// Per-category supporting copy (1–2 sentences). Keyed by the load-bearing slug —
// covers every rental + retail category, so the section reads for any matched filter.
// The register is the garment and the occasion in front of her, never inherited
// history: the shop is a year old, so heritage, heirloom and lineage are banned.
const COPY: Record<string, string> = {
  // Rentals
  "bridal-lehengas": "The centrepiece of your wedding day. Hand-worked lehengas in zardozi, gota, and real zari, reserved for your date and yours alone.",
  "side-lehengas": "For the sisters, the cousins, the closest friends: festive lehengas that hold their own beside the bride without ever competing.",
  "indo-western": "Where the drape meets the silhouette. Fusion pieces for the sangeet, the cocktail, the moment you want to move.",
  "ready-to-wear-sarees": "The grace of a saree, pre-draped and ready in minutes, pinned to perfection so you arrive composed, never rushed.",
  "rajasthani-poshak": "Mirror work, bandhani, and gota on a full poshak, cut and layered for the festivities your year is built around.",
  "chaniya-cholis": "Twirl-ready for Navratri and every garba night, in layered ghagras that catch the light with each turn.",
  gowns: "Floor-sweeping drama for receptions and evenings out. Sculpted gowns that make an entrance before you say a word.",
  sarees: "Banarasi weaves and festive georgettes, drapes for the wedding days, the receptions, and the festival evenings between them.",
  // Retail
  "three-piece-suits": "Suit, dupatta, and bottoms in considered harmony: festive sets you will reach for season after season.",
  "party-wear-suits": "For the evening that calls for a little shimmer. Embellished suits made to be seen, and kept.",
  "one-piece": "Effortless from afternoon to evening. One-piece silhouettes that ask for nothing but you.",
  "short-kurtis": "Everyday ease with an eye for detail: short kurtis that pair with whatever already lives in your wardrobe.",
  "co-ord-sets": "Two pieces, one intention. Coordinated sets that do the styling for you.",
  "night-suits": "The soft landing at the end of a long day, in night sets of breathable cottons and quiet prints.",
  "kurta-pant-sets": "The dependable two-piece: kurta and pant in easy proportions for work, errands, and everything in between.",
  kaftans: "Unhurried elegance in flowing kaftans, for warm days, slow evenings, and celebrations at home.",
};

export function CuratedMoment({ category }: { category: Category }) {
  const isSaree = category.slug === "sarees" || category.slug === "ready-to-wear-sarees";

  return (
    <section className="on-dark grain relative isolate flex min-h-[100svh] items-center overflow-hidden bg-violet-950 text-porcelain-50">
      {/* Full-bleed background media */}
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {isSaree ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/hero/hero-poster.webp"
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          >
            <source src="/hero/hero-loop.mp4" type="video/mp4" />
          </video>
        ) : (
          category.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-[72%_center] md:object-[center_28%] opacity-60"
            />
          )
        )}
        <div className="absolute inset-0 bg-violet-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950/90 via-violet-950/55 to-violet-950/20" />
      </div>

      <div className="shell w-full py-28 md:py-36">
        <Reveal className="max-w-xl">
          <p data-reveal className="eyebrow on-dark">
            Curated for your moments
          </p>
          <span
            data-reveal
            aria-hidden="true"
            className="mt-6 block h-px w-24 bg-gold-500/70"
          />
          <h1 data-reveal className="mt-6 text-h1 text-porcelain-50 leading-[1.05] font-[340]">
            <em className="italic">{category.name}</em>
          </h1>
          <p
            data-reveal
            className="mt-7 max-w-md text-violet-100 leading-relaxed text-[1.125rem]"
          >
            {COPY[category.slug]}
          </p>
          <div data-reveal className="mt-10">
            <a
              href="#collection"
              className="inline-flex items-center justify-center rounded-[10px] bg-gold-500 px-8 py-3.5 font-semibold text-violet-950 transition-colors hover:bg-gold-600 hover:text-porcelain-50"
            >
              View the collection
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
