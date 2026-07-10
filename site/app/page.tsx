import Link from "next/link";
import { Hero } from "@/components/site/Hero";
import { Reveal } from "@/components/site/Reveal";
import { Ornament } from "@/components/site/Ornament";
import { Button } from "@/components/ui/Button";
import { OCCASIONS, SHOP } from "@/lib/site";

// Preview 0 stub — replaced by the real /rentals viewer cards in P0.5.
const FEATURED = [
  { slug: "sage-rose-lehenga", name: "Sage Rose", note: "Hand-embroidered net" },
  { slug: "marigold-silk-lehenga", name: "Marigold Silk", note: "Zardozi bodice" },
  { slug: "rosewood-velvet-lehenga", name: "Rosewood Velvet", note: "Reception drape" },
];

const STEPS = [
  { n: "01", t: "Choose your dates", d: "Pick a lehenga and the days you need it. The calendar shows what's free." },
  { n: "02", t: "Reserve with UPI", d: "Pay a small advance to hold your dates. Nobody else can book them." },
  { n: "03", t: "Collect at the shop", d: "Come in, try it on, take it home. Return it after your event." },
];

const CATEGORIES = [
  { slug: "sarees", label: "Sarees" },
  { slug: "gowns", label: "Gowns" },
  { slug: "anarkalis", label: "Anarkalis" },
];

export default function Home() {
  return (
    <>
      <Hero />

      {/* Featured lehengas — begins inside the dusk veil (light body) */}
      <section className="bg-silk-50 py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <p data-reveal className="eyebrow">
              The rental edit
            </p>
            <div data-reveal className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-h2 max-w-xl">Lehengas worth remembering</h2>
              <Link
                href="/rentals"
                className="text-[0.9375rem] text-marigold-600 hover:underline underline-offset-4"
              >
                View all lehengas →
              </Link>
            </div>
          </Reveal>

          <Reveal className="mt-12 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED.map((p) => (
              <Link key={p.slug} href={`/rentals/${p.slug}`} data-reveal className="group block">
                <article className="overflow-hidden rounded-card bg-silk-100 shadow-card transition-shadow duration-[180ms] group-hover:shadow-lift">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {/* Spin-on-scroll canvas slots in here (P0.5). Placeholder for now. */}
                    <div
                      className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]"
                      style={{
                        background:
                          "linear-gradient(160deg, var(--color-silk-100) 0%, var(--color-silk-200) 100%)",
                      }}
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-rose-500 px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide text-silk-50">
                      Bridal pick
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between px-5 py-4">
                    <div>
                      <h3 className="text-[1.35rem] leading-tight">{p.name}</h3>
                      <p className="mt-0.5 text-caption text-ink-400">{p.note}</p>
                    </div>
                    <p className="tabular text-[0.9375rem] font-semibold text-ink-900">
                      ₹— <span className="font-normal text-ink-400">/ day</span>
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </Reveal>
        </div>
      </section>

      {/* How renting works */}
      <section className="bg-silk-100 py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <p data-reveal className="eyebrow">
              Simple as it should be
            </p>
            <h2 data-reveal className="mt-3 text-h2">
              How renting works
            </h2>
          </Reveal>
          <Reveal className="mt-14 grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} data-reveal>
                <p className="font-display text-[2.5rem] text-gold-400">{s.n}</p>
                <h3 className="mt-2 text-h3">{s.t}</h3>
                <p className="mt-3 text-ink-600">{s.d}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Browse by occasion */}
      <section className="bg-silk-50 py-20">
        <div className="shell text-center">
          <Reveal>
            <p data-reveal className="eyebrow">
              Find your moment
            </p>
            <h2 data-reveal className="mt-3 text-h2">
              Browse by occasion
            </h2>
            <ul data-reveal className="mt-9 flex flex-wrap justify-center gap-3">
              {OCCASIONS.map((o) => (
                <li key={o}>
                  <Link
                    href={`/rentals?occasion=${o.toLowerCase()}`}
                    className="inline-flex rounded-full border border-silk-200 bg-silk-100 px-5 py-2.5 text-[0.9375rem] text-ink-900 transition-colors hover:border-gold-400"
                  >
                    {o}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Retail strip */}
      <section className="bg-silk-100 py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Not just rentals</p>
                <h2 className="mt-3 text-h2">The boutique, to buy</h2>
              </div>
              <Link
                href="/retail"
                className="text-[0.9375rem] text-marigold-600 hover:underline underline-offset-4"
              >
                Shop all →
              </Link>
            </div>
          </Reveal>
          <Reveal className="mt-12 grid gap-7 sm:grid-cols-3">
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/retail/${c.slug}`} data-reveal className="group block">
                <div className="relative flex aspect-[4/3] items-end overflow-hidden rounded-card bg-silk-50 shadow-card">
                  <div
                    className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]"
                    style={{ background: "linear-gradient(150deg, var(--color-silk-100) 0%, var(--color-silk-200) 100%)" }}
                    aria-hidden="true"
                  />
                  <span className="relative m-5 font-display text-[1.5rem] text-ink-900">
                    {c.label}
                  </span>
                </div>
              </Link>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Visit — dark bookend */}
      <section className="on-dark grain bg-dusk-900 py-24 md:py-32 text-silk-50">
        <div className="shell">
          <Ornament className="mx-auto max-w-xs" />
          <div className="mt-10 grid items-center gap-12 md:grid-cols-2">
            <Reveal>
              <p data-reveal className="eyebrow on-dark">
                Come see them in person
              </p>
              <h2 data-reveal className="mt-3 text-h2 text-silk-50">
                Visit our shop
              </h2>
              <p data-reveal className="mt-4 max-w-md text-dusk-300">
                Try before you book. Our team helps with fitting, pairing jewellery, and finding
                the piece for your day.
              </p>
              <div data-reveal className="mt-8 flex flex-wrap gap-4">
                <Button href={SHOP.mapsUrl} variant="primary">
                  Get directions
                </Button>
                <Button href="/visit" variant="ghost-dark">
                  Book a trial
                </Button>
              </div>
              <p data-reveal className="mt-6 text-[0.9375rem] text-dusk-300">
                {SHOP.address} · {SHOP.hours}
              </p>
            </Reveal>

            {/* Map placeholder — real embed on /visit (Phase 1 with shop settings) */}
            <div className="aspect-[4/3] overflow-hidden rounded-card border border-dusk-700 bg-dusk-800">
              <div className="flex h-full items-center justify-center text-dusk-500">
                <span className="text-[0.9375rem]">Map</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
