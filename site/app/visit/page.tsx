import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Ornament } from "@/components/site/Ornament";
import { Reveal } from "@/components/site/Reveal";
import { SHOP } from "@/lib/site";

export const metadata: Metadata = { title: "Visit us" };

export default function VisitPage() {
  return (
    <section className="bg-porcelain-50 pt-28 pb-28 md:pt-32 md:pb-36">
      <div className="shell">
        <Reveal>
          <p data-reveal className="eyebrow">
            Come see them in person
          </p>
          <h1 data-reveal className="mt-3 text-h1">
            Visit our <em className="italic">shop</em>
          </h1>
          <p data-reveal className="mt-6 max-w-xl text-ink-600 leading-relaxed text-[1.0625rem]">
            Try before you book or buy. Our team helps with fitting, pairing jewellery, and finding
            the piece for your day. Everything is collected here at the shop.
          </p>
        </Reveal>

        <div className="my-12 md:my-14">
          <Ornament className="max-w-[16rem]" />
        </div>

        <Reveal className="grid items-start gap-12 md:grid-cols-[1fr_1.15fr] md:gap-16">
          <dl data-reveal className="space-y-8">
            <div>
              <dt className="eyebrow">Address</dt>
              <dd className="mt-2 text-[1.0625rem] text-ink-900">{SHOP.address}</dd>
            </div>
            <div>
              <dt className="eyebrow">Hours</dt>
              <dd className="mt-2 text-[1.0625rem] text-ink-900 tabular">{SHOP.hours}</dd>
            </div>
            <div>
              <dt className="eyebrow">Phone</dt>
              <dd className="mt-2 text-[1.0625rem] text-ink-900">
                <a href={`tel:${SHOP.phone.replace(/\s/g, "")}`} className="hover:text-gold-600">
                  {SHOP.phone}
                </a>
              </dd>
            </div>
            <div className="pt-2">
              <Button href={SHOP.mapsUrl} variant="primary">
                Get directions
              </Button>
            </div>
            <p className="border-t border-porcelain-200 pt-6 text-caption text-ink-400">
              Exact address, map pin and hours become editable in the admin panel (Phase 1).
            </p>
          </dl>

          {/* Map placeholder — real Google Maps embed lands with shop settings */}
          <div data-reveal className="relative">
            <div className="arch relative aspect-[4/3] overflow-hidden border border-porcelain-200 bg-stage shadow-card">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(165deg, var(--color-porcelain-100) 0%, var(--color-porcelain-200) 100%)",
                }}
                aria-hidden="true"
              />
              <div className="relative flex h-full items-center justify-center text-ink-400">
                <span className="text-caption uppercase tracking-widest">Map</span>
              </div>
            </div>
            <Ornament className="hidden md:block absolute -bottom-5 -left-8 w-32 opacity-30 pointer-events-none" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
