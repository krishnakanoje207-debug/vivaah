import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Ornament } from "@/components/site/Ornament";
import { SHOP } from "@/lib/site";

export const metadata: Metadata = { title: "Visit us" };

export default function VisitPage() {
  return (
    <section className="bg-silk-50 pt-28 pb-28 md:pt-32">
      <div className="shell">
        <p className="eyebrow">Come see them in person</p>
        <h1 className="mt-3 text-h1">Visit our shop</h1>
        <p className="mt-4 max-w-xl text-ink-600">
          Try before you book. Our team helps with fitting, pairing jewellery, and finding the
          piece for your day. Everything is collected here at the shop.
        </p>

        <div className="my-10">
          <Ornament className="max-w-[12rem]" />
        </div>

        <div className="grid gap-10 md:grid-cols-2">
          <dl className="space-y-6">
            <div>
              <dt className="eyebrow">Address</dt>
              <dd className="mt-2 text-[1.0625rem] text-ink-900">{SHOP.address}</dd>
            </div>
            <div>
              <dt className="eyebrow">Hours</dt>
              <dd className="mt-2 text-[1.0625rem] text-ink-900">{SHOP.hours}</dd>
            </div>
            <div>
              <dt className="eyebrow">Phone</dt>
              <dd className="mt-2 text-[1.0625rem] text-ink-900">
                <a href={`tel:${SHOP.phone.replace(/\s/g, "")}`} className="hover:text-marigold-600">
                  {SHOP.phone}
                </a>
              </dd>
            </div>
            <div className="pt-2">
              <Button href={SHOP.mapsUrl} variant="primary">
                Get directions
              </Button>
            </div>
            <p className="text-caption text-ink-400">
              Exact address, map pin and hours become editable in the admin panel (Phase 1).
            </p>
          </dl>

          {/* Map placeholder — real Google Maps embed lands with shop settings */}
          <div className="aspect-[4/3] overflow-hidden rounded-card border border-silk-200 bg-silk-100">
            <div className="flex h-full items-center justify-center text-ink-400">
              <span className="text-[0.9375rem]">Map</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
