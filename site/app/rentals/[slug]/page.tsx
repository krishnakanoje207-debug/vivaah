import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpinViewer } from "@/components/site/SpinViewer";
import { Button } from "@/components/ui/Button";
import { Ornament } from "@/components/site/Ornament";
import { RENTALS, getRental, formatINR } from "@/lib/rentals";

export function generateStaticParams() {
  return RENTALS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getRental(slug);
  return { title: p ? p.name : "Lehenga" };
}

export default async function RentalProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getRental(slug);
  if (!p) notFound();

  return (
    <div className="bg-silk-50">
      <div className="shell pt-28 pb-24 md:pt-32">
        {/* Breadcrumb */}
        <nav className="text-caption text-ink-400" aria-label="Breadcrumb">
          <Link href="/rentals" className="hover:text-ink-900">
            Lehengas
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink-600">{p.name}</span>
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-2">
          {/* Viewer */}
          <div>
            {p.spin ? (
              <SpinViewer config={p.spin} alt={`${p.name} lehenga`} />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-card bg-silk-100 text-center text-ink-400">
                <span className="max-w-[16rem] text-[0.9375rem]">
                  Turntable photos coming soon for this piece.
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="lg:sticky lg:top-24">
              <p className="eyebrow">{p.occasion}</p>
              <h1 className="mt-3 text-h1">{p.name}</h1>

              <div className="mt-4 flex items-center gap-3">
                <span
                  className="inline-block h-4 w-4 rounded-full ring-1 ring-ink-400"
                  style={{ backgroundColor: p.colourHex }}
                  aria-hidden="true"
                />
                <span className="text-[0.9375rem] text-ink-600">{p.colourName}</span>
              </div>

              <p className="mt-6 max-w-prose text-ink-600">{p.description}</p>

              <div className="my-8">
                <Ornament className="max-w-[10rem]" />
              </div>

              {/* Booking panel — calendar + flow arrive in Phase 2 */}
              <div className="rounded-card border border-silk-200 bg-silk-100 p-6">
                {p.pricePerDay ? (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="text-ink-600">Rent</span>
                      <span className="tabular text-[1.25rem] font-semibold text-ink-900">
                        ₹{formatINR(p.pricePerDay)}
                        <span className="text-[0.9375rem] font-normal text-ink-400"> / day</span>
                      </span>
                    </div>
                    {p.prebook != null && (
                      <div className="mt-2 flex items-baseline justify-between text-[0.9375rem]">
                        <span className="text-ink-600">Advance to reserve</span>
                        <span className="tabular text-ink-900">₹{formatINR(p.prebook)}</span>
                      </div>
                    )}
                    <p className="mt-1 text-caption text-ink-400">Indicative rate — set by the shop.</p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <DateField label="Pickup" />
                      <DateField label="Return" />
                    </div>

                    <div className="mt-5">
                      <Button href="/visit" variant="primary">
                        Check availability
                      </Button>
                    </div>
                    <p className="mt-3 text-caption text-ink-400">
                      Live availability &amp; UPI booking arrive in the next build phase.
                    </p>
                  </>
                ) : (
                  <p className="text-ink-600">
                    This piece is being photographed. Ask us in the shop to reserve it in the
                    meantime.
                  </p>
                )}
              </div>

              <div className="mt-4">
                <Button href="/visit" variant="ghost">
                  Book a trial visit
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DateField({ label }: { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption text-ink-600">{label}</span>
      <input
        type="date"
        className="tabular w-full rounded-control border border-silk-200 bg-silk-50 px-3 py-2 text-[0.9375rem] text-ink-900 focus:border-marigold-600 focus:outline-none"
      />
    </label>
  );
}
