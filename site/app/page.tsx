import Link from "next/link";
import { Hero } from "@/components/site/Hero";
import { Reveal } from "@/components/site/Reveal";
import { Ornament } from "@/components/site/Ornament";
import { Button } from "@/components/ui/Button";
import { OCCASIONS, SHOP } from "@/lib/site";
import { featuredRentals } from "@/lib/rentals";
import { RentalCard } from "@/components/site/RentalCard";
import { RETAIL_CATEGORIES } from "@/lib/categories";

const STEPS = [
  { n: "01", t: "Choose your dates", d: "Pick a piece and the days you need it. The calendar shows what's free." },
  { n: "02", t: "Reserve with UPI", d: "Pay a small advance to hold your dates. Nobody else can book them." },
  { n: "03", t: "Collect at the shop", d: "Come in, try it on, take it home. Return rentals after your event." },
];

const RETAIL_TEASER = RETAIL_CATEGORIES.slice(0, 3);

export default function Home() {
  return (
    <>
      <Hero />

      {/* Featured rentals — begins inside the dusk veil (light body) */}
      <section className="bg-porcelain-50 py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <p data-reveal className="eyebrow">
              The rental edit
            </p>
            <div data-reveal className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-h2 max-w-xl">Pieces worth remembering</h2>
              <Link
                href="/rentals"
                className="text-[0.9375rem] text-gold-600 hover:underline underline-offset-4"
              >
                View all rentals →
              </Link>
            </div>
          </Reveal>

          <Reveal className="mt-12 grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {featuredRentals.map((p) => (
              <div key={p.slug} data-reveal>
                <RentalCard p={p} />
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-porcelain-100 py-24 md:py-32">
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
                <p className="font-display text-[2.5rem] text-gold-600">{s.n}</p>
                <h3 className="mt-2 text-h3">{s.t}</h3>
                <p className="mt-3 text-ink-600">{s.d}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Browse by occasion */}
      <section className="bg-porcelain-50 py-20">
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
                    className="inline-flex rounded-full border border-porcelain-200 bg-porcelain-100 px-5 py-2.5 text-[0.9375rem] text-ink-900 transition-colors hover:border-gold-500"
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
      <section className="bg-porcelain-100 py-24 md:py-32">
        <div className="shell">
          <Reveal>
            <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Not just rentals</p>
                <h2 className="mt-3 text-h2">The boutique, to buy</h2>
              </div>
              <Link
                href="/retail"
                className="text-[0.9375rem] text-gold-600 hover:underline underline-offset-4"
              >
                Shop all →
              </Link>
            </div>
          </Reveal>
          <Reveal className="mt-12 grid gap-7 sm:grid-cols-3">
            {RETAIL_TEASER.map((c) => (
              <Link key={c.slug} href={`/retail?category=${c.slug}`} data-reveal className="group block">
                <div className="arch relative flex aspect-[4/3] items-end overflow-hidden bg-stage shadow-card">
                  <div
                    className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]"
                    style={{
                      background:
                        "linear-gradient(150deg, var(--color-porcelain-100) 0%, var(--color-porcelain-200) 100%)",
                    }}
                    aria-hidden="true"
                  />
                  <span className="relative m-5 font-display text-[1.5rem] text-ink-900">
                    {c.name}
                  </span>
                </div>
              </Link>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Visit — dark bookend */}
      <section className="on-dark grain bg-violet-900 py-24 md:py-32 text-porcelain-50">
        <div className="shell">
          <Ornament className="mx-auto max-w-xs" />
          <div className="mt-10 grid items-center gap-12 md:grid-cols-2">
            <Reveal>
              <p data-reveal className="eyebrow on-dark">
                Come see them in person
              </p>
              <h2 data-reveal className="mt-3 text-h2 text-porcelain-50">
                Visit our shop
              </h2>
              <p data-reveal className="mt-4 max-w-md text-violet-300">
                Try before you book or buy. Our team helps with fitting, pairing jewellery, and
                finding the piece for your day.
              </p>
              <div data-reveal className="mt-8 flex flex-wrap gap-4">
                <Button href={SHOP.mapsUrl} variant="primary-dark">
                  Get directions
                </Button>
                <Button href="/visit" variant="ghost-dark">
                  Book a trial
                </Button>
              </div>
              <p data-reveal className="mt-6 text-[0.9375rem] text-violet-300">
                {SHOP.address} · {SHOP.hours}
              </p>
            </Reveal>

            <div className="arch aspect-[4/3] overflow-hidden border border-violet-700 bg-violet-800">
              <div className="flex h-full items-center justify-center text-violet-500">
                <span className="text-[0.9375rem]">Map</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
