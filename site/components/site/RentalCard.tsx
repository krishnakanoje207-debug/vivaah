import Link from "next/link";
import { SelectionButton } from "@/components/site/SelectionButton";
import { formatINR, productBadges, type Rental } from "@/lib/rentals";
import { nightBadge } from "@/lib/navratri";

// Shared rental card (homepage featured + /rentals gallery). Arch-topped image
// (§3b jharokha motif) on the stage colour; shows the real turntable front frame
// when available, else a porcelain placeholder.
export function RentalCard({ p }: { p: Rental }) {
  const badges = productBadges(p);
  // The festival highlight, and only ever a highlight: the catalogue is never
  // reordered or filtered by it, because people rent what they like the look
  // of, not what matches the day (owner, 12 Sep 2026). Null outside the nine
  // nights, and null for any piece whose colour does not actually match.
  const night = nightBadge(p);
  return (
    /* The card is a link, so the gather control cannot live inside it: a button
       nested in an anchor is invalid, and the click would navigate instead of
       gathering. It is a sibling laid over the image's far corner, and
       `data-piece` marks the box the flight launches from. */
    <div data-piece className="relative">
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
          {/* Badges stack under one another at the top-left, above the "Spin view"
              marker, so a piece that is both new and spinnable reads top-down
              rather than overlapping. See productBadges for why this list is as
              short as it is. */}
          <div className="absolute left-3 top-4 flex flex-col items-start gap-1.5">
            {night && (
              <span className="flex items-center gap-1.5 rounded-full bg-porcelain-50 px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide text-ink-900">
                {/* The night's real colour, as a dot. The label carries the
                    meaning on its own, so the dot is decorative and hidden —
                    colour is never the only way this is communicated. */}
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full ring-1 ring-ink-900/20"
                  style={{ background: night.hex }}
                />
                {night.label}
              </span>
            )}
            {badges.map((b) => (
              <span
                key={b.label}
                className={
                  b.tone === "new"
                    ? "rounded-full bg-gold-100 px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide text-gold-700"
                    : "rounded-full bg-violet-100 px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide text-violet-700"
                }
              >
                {b.label}
              </span>
            ))}
            {p.spin && (
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide text-violet-700">
                Spin view
              </span>
            )}
          </div>
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

      {/* Opposite corner from the badge stack, so a piece that is new, matched
          to a night and spinnable never collides with it. */}
      <SelectionButton
        item={{
          slug: p.slug,
          name: p.name,
          kind: "rental",
          href: `/rentals/${p.slug}`,
          image: p.spin ? `${p.spin.basePath}/000.${p.spin.ext}` : null,
          price: p.pricePerDay,
        }}
        size="icon"
        className="absolute right-3 top-4"
      />
    </div>
  );
}
