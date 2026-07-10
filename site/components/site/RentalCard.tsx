import Link from "next/link";
import { formatINR, type Rental } from "@/lib/rentals";

// Shared rental card (homepage featured + /rentals gallery). Shows the real
// turntable front frame when available, else a silk placeholder.
export function RentalCard({ p }: { p: Rental }) {
  return (
    <Link href={`/rentals/${p.slug}`} className="group block">
      <article className="overflow-hidden rounded-card bg-silk-100 shadow-card transition-shadow duration-[180ms] group-hover:shadow-lift">
        <div className="relative aspect-[4/5] overflow-hidden">
          {p.spin ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${p.spin.basePath}/000.${p.spin.ext}`}
              alt={p.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]"
              style={{
                background:
                  "linear-gradient(160deg, var(--color-silk-100) 0%, var(--color-silk-200) 100%)",
              }}
              aria-hidden="true"
            />
          )}
          {p.spin && (
            <span className="absolute left-3 top-3 rounded-full bg-dusk-950/55 px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide text-silk-50">
              360° view
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-between px-5 py-4">
          <div>
            <h3 className="text-[1.35rem] leading-tight">{p.name}</h3>
            <p className="mt-0.5 text-caption text-ink-400">{p.note}</p>
          </div>
          <p className="tabular text-[0.9375rem] font-semibold text-ink-900">
            {p.pricePerDay ? (
              <>
                ₹{formatINR(p.pricePerDay)} <span className="font-normal text-ink-400">/ day</span>
              </>
            ) : (
              <span className="font-normal text-ink-400">Coming soon</span>
            )}
          </p>
        </div>
      </article>
    </Link>
  );
}
