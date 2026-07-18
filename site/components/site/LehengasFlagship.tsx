import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";

/**
 * Lehengas flagship — full-viewport immersive homepage "room" (CATEGORY_IMMERSION_PLAN W4).
 * The deliberate LIGHT counterpart to the dark SareesFlagship room: the owner's real
 * lahenga1 turntable frame on a seamless near-white porcelain stage with a studio
 * vignette. Copy is right-anchored (the saree room is left-anchored) so the two read
 * as two curated rooms, not a repeated component. CTA is the light-surface primary —
 * violet-800 / porcelain-50 (§1 roles), NOT gold — a second point of contrast with W3.
 *
 * Motion: a slow Ken Burns breathe on the frame (SpinViewer's 88-frame preload would be
 * over-engineered for an ambient section). The animation is transform-only and applied
 * via `motion-safe:`, so prefers-reduced-motion shows the static frame with copy visible.
 */
export function LehengasFlagship() {
  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-porcelain-50 text-ink-900">
      {/* Transform-only Ken Burns; gated by motion-safe (reduced-motion → static frame). */}
      <style>{`@keyframes lf-kenburns{from{transform:scale(1.04)}to{transform:scale(1.12)}}`}</style>

      {/* Full-bleed porcelain stage — garment on seamless near-white ground */}
      <div className="absolute inset-0 -z-10 overflow-hidden bg-stage" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/rentals/lahenga1/360/020.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[38%_center] motion-safe:[animation:lf-kenburns_26s_ease-in-out_infinite_alternate]"
          style={{ filter: "contrast(1.06) saturate(1.08)" }}
        />
        {/* Studio vignette — whisper of edge fall-off; never touches the garment */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(125% 100% at 42% 46%, transparent 68%, color-mix(in srgb, var(--color-ink-900) 7%, transparent))",
          }}
        />
        {/* Porcelain scrim — clear over the garment (left/centre), opaque only under the
            right-anchored copy where it blends with the empty stage. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to left, var(--color-porcelain-50) 0%, color-mix(in srgb, var(--color-porcelain-50) 82%, transparent) 32%, transparent 60%)",
          }}
        />
      </div>

      <div className="shell flex w-full justify-end py-28 md:py-36">
        <Reveal className="max-w-xl md:text-right">
          <p data-reveal className="eyebrow">
            Rentals · Bridal Lehengas
          </p>
          <span
            data-reveal
            aria-hidden="true"
            className="mt-6 block h-px w-24 bg-gold-500/70 md:ml-auto"
          />
          <h2 data-reveal className="mt-6 text-h2 leading-[1.1]">
            A lehenga made for your <em className="italic">brightest</em> day.
          </h2>
          <p
            data-reveal
            className="mt-7 max-w-md text-ink-600 leading-relaxed text-[1.0625rem] md:ml-auto"
          >
            Hand-embroidered ghagras and heirloom dupattas, shown on the studio stage —
            reserved online for your date, collected in person at the shop.
          </p>
          <div data-reveal className="mt-10">
            <Link
              href="/rentals?category=bridal-lehengas"
              className="inline-flex items-center justify-center rounded-[10px] bg-violet-800 px-8 py-3.5 font-semibold text-porcelain-50 transition-colors hover:bg-violet-700"
            >
              Explore lehenga rentals
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
