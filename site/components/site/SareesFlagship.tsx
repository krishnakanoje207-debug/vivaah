import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";

/**
 * Sarees flagship — full-viewport immersive homepage "room" (CATEGORY_IMMERSION_PLAN W3).
 * Fluid Saree art direction: full-bleed editorial saree imagery under a left→right
 * violet scrim, softer/fluid mood distinct from the centred hero. Copy is left-anchored
 * (the hero is centred) so the two read as different rooms. ONE gold moment — the
 * gold-500 / violet-950 pill CTA (§1 poster pairing) → the sarees rental filter.
 *
 * Static (no client JS): the Reveal wrapper carries the GSAP fade; under
 * prefers-reduced-motion Reveal renders the final state immediately.
 */
export function SareesFlagship() {
  return (
    <section className="on-dark grain relative isolate flex min-h-[100svh] items-center overflow-hidden bg-violet-950 text-porcelain-50">
      {/* Full-bleed backdrop + violet grade for AA on the left copy column */}
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/flagship/sarees.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[65%_center] md:object-center"
        />
        {/* Overall violet grade to unify the frame with the brand palette */}
        <div className="absolute inset-0 bg-violet-950/30" />
        {/* Directional scrim — darkest under the left-anchored copy */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950/90 via-violet-950/55 to-violet-950/20" />
      </div>

      <div className="shell w-full py-28 md:py-36">
        <Reveal className="max-w-xl">
          <p data-reveal className="eyebrow on-dark">
            Rentals · Sarees
          </p>
          <span
            data-reveal
            aria-hidden="true"
            className="mt-6 block h-px w-24 bg-gold-500/70"
          />
          <h2 data-reveal className="mt-6 text-h2 text-porcelain-50 leading-[1.1]">
            Silk, draped for your most <em className="italic">memorable</em> moments.
          </h2>
          <p
            data-reveal
            className="mt-7 max-w-md text-violet-100 leading-relaxed text-[1.0625rem]"
          >
            Banarasi weaves, festive georgettes, and heirloom drapes — reserved online
            for your date, collected in person at the shop.
          </p>
          <div data-reveal className="mt-10">
            <Link
              href="/rentals?category=sarees"
              className="inline-flex items-center justify-center rounded-[10px] bg-gold-500 px-8 py-3.5 font-semibold text-violet-950 transition-colors hover:bg-gold-600 hover:text-porcelain-50"
            >
              Explore saree rentals
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
