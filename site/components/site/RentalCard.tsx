import Link from "next/link";
import { formatINR, type Rental } from "@/lib/rentals";

// Shared rental card (homepage featured + /rentals gallery). Arch-topped image
// (§3b jharokha motif) on the stage colour; shows the real turntable front frame
// when available, else a porcelain placeholder.
export function RentalCard({ p }: { p: Rental }) {
  return (
    <Link href={`/rentals/${p.slug}`} className="group block">
      <div className="arch relative aspect-[4/5] overflow-hidden bg-stage shadow-card transition-shadow duration-[180ms] group-hover:shadow-lift">
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
                "linear-gradient(160deg, var(--color-porcelain-100) 0%, var(--color-porcelain-200) 100%)",
            }}
            aria-hidden="true"
          />
        )}
        {p.spin && (
          <span className="absolute left-3 top-4 rounded-full bg-violet-100 px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide text-violet-700">
            Spin view
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-4 px-1 pt-4">
        <div>
          {/* The listing's hover treatment, the same one the retail mosaic
              uses: the name takes the violet on hover, at the site's 180ms. */}
          <h3 className="text-[1.35rem] leading-tight transition-colors duration-[180ms] group-hover:text-violet-700">
            {p.name}
          </h3>
          <p className="mt-0.5 text-caption text-ink-600">{p.note}</p>
        </div>
        <p className="tabular text-[0.9375rem] font-semibold text-ink-900">
          {p.pricePerDay ? (
            <>
              ₹{formatINR(p.pricePerDay)} <span className="font-normal text-ink-600">/ day</span>
            </>
          ) : (
            <span className="font-normal text-ink-600">Coming soon</span>
          )}
        </p>
      </div>
    </Link>
  );
}
