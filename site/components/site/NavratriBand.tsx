import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { NIGHTS, navratriState } from "@/lib/navratri";
import { REQUEST_NOTICE, enquiryHref } from "@/lib/enquiry";

/**
 * The Navratri band — the festival's one entry point on a page.
 *
 * A band, not a section: it takes the same height and the same dark ground as
 * the jewellery line, because it is a rule laid across the page rather than a
 * room in it. The festival is a reason to come in, not a new argument, and the
 * moment it starts behaving like a second hero the page has two front doors.
 *
 * THE PALETTE DOES NOT MOVE. DESIGN_SPEC v2 is violet/gold/porcelain and the
 * owner rejected v1 as generic; nine festival colours painted across the site
 * is the shortest road back to that verdict. So the only festive colour on the
 * page is the nine swatches themselves — 8px dots, carrying the real hex of
 * each night — and the garments. Everything else stays exactly as it was.
 *
 * It retires itself: `navratriState` returns "over" from 21 Oct 2026 and this
 * renders null. No banner to remember to take down in November.
 */
export function NavratriBand() {
  const state = navratriState();
  if (state.phase === "over") return null;

  const isDuring = state.phase === "during";

  return (
    <section className="on-dark relative bg-violet-950 py-7">
      <div className="shell-wide">
        <Reveal className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5">
          <div data-reveal className="min-w-0">
            <p className="eyebrow on-dark">
              Navratri · 11&ndash;19 October
              {state.phase === "before" && state.daysUntil > 0 ? (
                <>
                  {" · "}
                  <span className="tabular">{state.daysUntil}</span>{" "}
                  {state.daysUntil === 1 ? "day" : "days"} to go
                </>
              ) : null}
            </p>

            <p className="mt-2 font-display text-h3 font-medium text-porcelain-50">
              {isDuring ? (
                <>
                  Tonight is night{" "}
                  <span className="tabular">{state.tonight.n}</span>.{" "}
                  <em className="italic">{state.tonight.colour}</em>.
                </>
              ) : (
                <>
                  Nine nights. The rack is <em className="italic">ready</em>.
                </>
              )}
            </p>

            {/* The nine nights, as the nine colours. The only place festival
                colour is allowed on this site. Decorative, so it is hidden from
                assistive tech — the dates and colours are named in the link
                below it, which is the accessible route to the same thing. */}
            <ul
              aria-hidden="true"
              className="mt-4 flex flex-wrap items-center gap-2"
            >
              {NIGHTS.map((night) => {
                const isTonight = isDuring && state.tonight.n === night.n;
                return (
                  <li
                    key={night.n}
                    title={`Night ${night.n} · ${night.colour}`}
                    className={
                      isTonight
                        ? "h-2.5 w-2.5 rounded-full ring-2 ring-gold-500 ring-offset-2 ring-offset-violet-950"
                        : "h-2 w-2 rounded-full opacity-60"
                    }
                    style={{ background: night.hex }}
                  />
                );
              })}
            </ul>
          </div>

          <div data-reveal className="flex flex-col items-start gap-2">
            <Link
              href="/rentals?category=chaniya-cholis"
              className="press rounded-control bg-porcelain-50 px-6 py-3 font-medium text-violet-950 transition-colors duration-[180ms] ease-out-strong hover:bg-gold-100"
            >
              See the chaniya cholis
            </Link>
            <Link
              href={enquiryHref({ night: "Navratri" })}
              className="press text-caption text-gold-500 underline decoration-gold-500/40 underline-offset-4"
            >
              Ask us to hold one
            </Link>
            {/* The owner's rule, printed where the request is made and not only
                in the policies page: nothing is held until she confirms it. */}
            <p className="mt-1 max-w-[34ch] text-caption text-violet-300">
              {REQUEST_NOTICE}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
