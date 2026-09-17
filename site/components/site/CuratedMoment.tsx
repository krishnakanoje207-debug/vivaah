import { Reveal } from "@/components/site/Reveal";
import type { Category } from "@/lib/categories";

/**
 * Full-viewport category hero for a filtered view (CATEGORY_IMMERSION_PLAN W5),
 * with background video for the sarees.
 *
 * The name and one button. It used to carry an eyebrow ("Curated for your
 * moments") and a marketing sentence per category; the photograph and the name
 * already say what the rack below holds (owner, 14 Sep 2026).
 */
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
              width={660}
              height={880}
              /* The LCP element on a filtered view: it is the full-bleed ground
                 of the first screenful, so it is eager and told to jump the
                 queue rather than lazied like every picture below it. */
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-[72%_center] md:object-[center_28%] opacity-60"
            />
          )
        )}
        <div className="absolute inset-0 bg-violet-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950/90 via-violet-950/55 to-violet-950/20" />
      </div>

      <div className="shell w-full py-28 md:py-36">
        <Reveal className="max-w-xl">
          <span
            data-reveal
            aria-hidden="true"
            className="block h-px w-24 bg-gold-500/70"
          />
          <h1 data-reveal className="mt-6 text-h1 text-porcelain-50 leading-[1.05] font-[340]">
            <em className="italic">{category.name}</em>
          </h1>
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
