import Link from "next/link";
import { formatINR, type Rental } from "@/lib/rentals";

// Shared rental card (homepage featured + /rentals gallery). Arch-topped image
// (§3b jharokha motif) on the stage colour; shows the real turntable front frame
// when available, else a porcelain placeholder.
export function RentalCard({ p }: { p: Rental }) {
  return (
    <Link href={`/rentals/${p.slug}`} className="press-card group block">
      <div className="arch relative aspect-[4/5] overflow-hidden bg-stage shadow-card transition-shadow duration-[180ms] ease-out-strong group-hover:shadow-lift">
        {p.spin ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${p.spin.basePath}/000.${p.spin.ext}`}
            alt={p.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-400 ease-out-strong group-hover:scale-[1.03]"
          />
        ) : (
          /* A real garment whose photographs have not been taken yet. It used to
             render as a bare porcelain gradient, which on a rail beside shot
             pieces read as a broken image rather than as a pending one — two of
             the three live products are in this state (10 Sep 2026).
             No stand-in photograph is used: the piece is real and its name and
             price are real, so borrowing another garment's picture would be the
             one lie on the card. The ornament and the label say what is true. */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-porcelain-100">
            <span aria-hidden="true" className="text-2xl text-gold-600/50">
              &#10022;
            </span>
            <span className="text-caption text-ink-600">Photograph coming</span>
          </div>
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
          <h3 className="text-[1.35rem] leading-tight transition-colors duration-[180ms] ease-out-strong group-hover:text-violet-700">
            {p.name}
          </h3>
          <p className="mt-0.5 text-caption text-ink-600">{p.note}</p>
        </div>
        {/* `shrink-0` + `nowrap`: a two-line name (there are several) was
            squeezing the price column until "₹1,800 / day" broke across lines
            with the unit orphaned under the figure. */}
        <p className="tabular shrink-0 whitespace-nowrap text-[0.9375rem] font-semibold text-ink-900">
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
