import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import type { Category } from "@/lib/categories";

/**
 * Editorial Category Tiles (§3b, §5c).
 * Displays categories as staggered jharokha arches with archival imagery.
 * Alternates vertical offsets to create an organic, non-template rhythm.
 *
 * Device: reveal per tile. The grid is the `Reveal` itself (`as="ul"`), the way
 * the retail rail and the visit ledger are, so each tile arrives on its own beat
 * instead of the whole block fading up as one plate. `Reveal` rather than
 * `WipeIn` here on purpose: the wipe leaves a `clip-path` on its targets, which
 * would cut the tile's own hover lift and its `shadow-lift` off at the border
 * box. The listing grid on /rentals, whose cards do not lift, keeps the wipe.
 */
export function CategoryTiles({
  base,
  categories,
}: {
  base: string; // "/rentals" | "/retail"
  categories: Category[];
}) {
  return (
    <Reveal
      as="ul"
      className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-16 lg:grid-cols-4"
    >
      {categories.map((c, i) => {
        // Create an organic staggered effect: push cards down based on index
        const staggerClass = i % 4 === 1 ? "lg:mt-12" : i % 4 === 3 ? "lg:mt-24" : i % 4 === 2 ? "lg:mt-6" : "";

        return (
          <li key={c.slug} data-reveal className={staggerClass}>
            <Link href={`${base}?category=${c.slug}`} className="press-card group block">
              <div className="arch relative flex aspect-[3/4] items-end overflow-hidden bg-stage shadow-card transition-[box-shadow,transform] duration-200 ease-out-strong group-hover:shadow-lift group-hover:-translate-y-1.5">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.image}
                    alt={c.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-400 ease-out-strong group-hover:scale-[1.03]"
                  />
                ) : (
                  <div
                    className="absolute inset-0 transition-transform duration-400 ease-out-strong group-hover:scale-[1.03]"
                    style={{
                      background:
                        "linear-gradient(155deg, var(--color-porcelain-100) 0%, var(--color-porcelain-200) 100%)",
                    }}
                    aria-hidden="true"
                  />
                )}

                {/* Overlay for text legibility — using brand violet tones.
                    No transition here: this is a `background-image` gradient and
                    gradients do not interpolate, so the `transition-all` that
                    used to sit on it animated nothing while still putting the
                    element on the compositor for 500ms after every hover. The
                    hover shift between /70 and /80 was never visible either; it
                    is dropped rather than faked, and the legibility scrim stays
                    exactly as measured. */}
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/70 via-violet-950/10 to-transparent opacity-90" />

                {/* The caption inset comes in on the phone: at 390 the tile is
                    ~165px wide and a 24px inset left the name 117px of measure,
                    which broke every two-word category onto three lines. */}
                <div className="relative m-4 w-full sm:m-6">
                  <span className="block font-display text-[1.125rem] leading-tight text-porcelain-50 sm:text-[1.375rem]">
                    {c.name}
                  </span>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-porcelain-50/10 pt-3 transition-colors duration-200 ease-out-strong group-hover:border-gold-500/30">
                    {/* The eyebrow's own 11px, not 10px: 10px uppercase at
                        0.2em is under the size this site sets anywhere else. */}
                    <span className="text-eyebrow font-medium tracking-[0.16em] uppercase text-violet-300">
                      {c.count > 0 ? `${c.count} piece${c.count > 1 ? "s" : ""}` : "Coming soon"}
                    </span>
                    <span className="text-[0.6rem] text-gold-500 opacity-0 transition-opacity duration-200 ease-out-strong group-hover:opacity-100">✦</span>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </Reveal>
  );
}
