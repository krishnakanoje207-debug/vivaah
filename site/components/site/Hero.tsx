import { Button } from "@/components/ui/Button";
import { Ornament } from "@/components/site/Ornament";
import { SHOP } from "@/lib/site";

/**
 * Preview 0 hero — static placeholder styled as the final dusk scene.
 * P0.3 replaces the inner stage with the dual-<video> (intro → ping-pong loop);
 * the dusk-veil seam and overlay copy stay as-is.
 */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-dusk-950 text-silk-50 on-dark">
      {/* Stage — video slots in here at P0.3. Soft radial dusk light for now. */}
      <div
        className="grain absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 15%, var(--color-dusk-800) 0%, var(--color-dusk-900) 45%, var(--color-dusk-950) 100%)",
        }}
        aria-hidden="true"
      />

      <div className="shell flex min-h-[88svh] flex-col items-center justify-center py-28 text-center">
        <p className="eyebrow on-dark">Bridal rental &amp; boutique</p>
        <h1 className="mt-5 max-w-3xl text-h1 text-silk-50">
          The lehenga you dreamed of, <em className="italic text-marigold-500">for a day</em>.
        </h1>
        <p className="mt-6 max-w-xl text-dusk-300 text-[1.0625rem] leading-relaxed">
          {SHOP.tagline} Reserve online, collect at our shop.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Button href="/rentals" variant="primary">
            Explore lehengas
          </Button>
          <Button href="/visit" variant="ghost-dark">
            Book a trial visit
          </Button>
        </div>
      </div>

      {/* Dusk veil — 160px gradient into the light body, with the ✦ seam (§5) */}
      <div className="relative">
        <div
          className="pointer-events-none h-40 w-full"
          style={{ background: "linear-gradient(to bottom, transparent, var(--color-silk-50))" }}
          aria-hidden="true"
        />
        <div className="shell -mt-6 pb-2">
          <Ornament />
        </div>
      </div>
    </section>
  );
}
