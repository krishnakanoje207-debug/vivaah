import Link from "next/link";
import { Preloader } from "@/components/site/Preloader";
import { SectionEdge } from "@/components/site/SectionEdge";
import { GoldFrame } from "@/components/site/GoldFrame";
import { RippleHeading } from "@/components/site/RippleHeading";
import { WordmarkClose } from "@/components/site/WordmarkClose";
import { Reveal } from "@/components/site/Reveal";
import { WipeIn } from "@/components/site/WipeIn";
import { Parallax } from "@/components/site/Parallax";
import { SHOP } from "@/lib/site";

/**
 * The landing page — the front door.
 *
 * Built 9 Sep 2026 from the Kombai canvas (variant B, "typographic hero on
 * porcelain") against `specs/KOMBAI_MAIN_PAGE_PROMPT.md`. The copy is the
 * canvas's, kept as written because it holds to §A: no founding year, no
 * heritage, two partners, rentals and retail from the same day, and the two
 * facts the owner has not given yet still visibly `TODO(owner)`.
 *
 * Grammar (DESIGN_SPEC_V3 §8.2 leaves the home grammar open, and binds it only
 * by two bans, both of which this respects): no second full-bleed scrubbed film,
 * and no reuse of `/rentals`' room sequence. So the argument here is not the
 * rooms' rent-versus-buy case. It is the shop itself, and it ends on a
 * typographic close `/rentals` does not have.
 *
 *   Section   Ground          Material              Device
 *   Hero      porcelain-50    type                  letter ripple
 *   Story     porcelain-100   silk, arch-cropped    flow + parallax
 *   Doors     stage           three materials       wipe per door
 *   Proof     porcelain-50    hands, process        reveal per check
 *   Close     violet-950      still                 oversized mark, drift
 *
 * Boundaries are torn, never blended: `SectionEdge` sits at each one and the two
 * grounds still meet along a single hard edge (§3.2, and §E of the work order).
 */

export const metadata = {
  title: "Vivaah Dresses and Suits",
  description:
    "Two partners, one shop. Bridal and festive wear to rent by the date, suits and kurtis to reserve and collect, and jewellery to match. The stock changes day to day.",
};

const DOORS = [
  {
    href: "/rentals",
    eyebrow: "Rentals",
    heading: "Reserve the dates, collect, return.",
    body: "Bridal and festive wear, rented by the date. Bridal and side lehengas, sarees, poshak, chaniya cholis, gowns and indo-western pieces, fitted in the shop before your day.",
    cta: "See what is in for rent",
    image: "/categories/bridal-lehengas.jpg",
  },
  {
    href: "/retail",
    eyebrow: "Retail",
    heading: "Reserve online, collect at the shop.",
    body: "Suits, kurtis, co-ord sets and kaftans to keep. Reserve a piece online, then come in, try it on and take it home.",
    cta: "See what is in to buy",
    image: "/categories/co-ord-sets.jpg",
  },
  {
    href: "/jewellery",
    eyebrow: "Jewellery",
    heading: "Rented alongside an outfit, never sold.",
    body: "Matched to the outfit you are taking, on the same dates, so nothing has to be hunted for separately.",
    cta: "Match to your outfit",
    image: "/categories/rajasthani-poshak.jpg",
  },
];

// Five checks, the shop's own process. Real, and small enough to be true.
const CHECKS = [
  "Hooks and zips checked after every return.",
  "Hem pinned at the fitting.",
  "Dupatta edge pressed.",
  "Blouse altered in the shop.",
  "Every piece steamed before it leaves.",
];

export default function HomePage() {
  return (
    <>
      <Preloader />

      {/* ---------- Hero: type on porcelain ---------------------------------
          Not a film. The threshold film is /rentals' and is the only one on the
          site (§8.2). What carries this screen is the sentence itself. */}
      <section className="relative bg-porcelain-50 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="shell">
          <p className="eyebrow">Rentals, retail and jewellery, one shop</p>

          <RippleHeading
            as="h1"
            className="mt-6 max-w-[13ch] text-h1 text-ink-900"
          >
            New pieces on the rail, most days.
          </RippleHeading>

          <div className="mt-12 grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-start">
            <div>
              <p className="max-w-[46ch] text-ink-600">
                Bridal and festive wear rented by the date, suits and kurtis reserved
                online and collected in person, with jewellery to match the outfit.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/rentals"
                  className="rounded-control bg-violet-800 px-6 py-3 font-medium text-porcelain-50 transition-colors duration-[180ms] hover:bg-violet-700"
                >
                  See what is in for rent
                </Link>
                <Link
                  href="/visit"
                  className="rounded-control border border-ink-900/20 px-6 py-3 font-medium text-ink-900 transition-colors duration-[180ms] hover:border-ink-900/40"
                >
                  Plan a visit
                </Link>
              </div>

              <p className="mt-6 text-caption text-ink-400">
                Fittings happen in the shop. Nothing is posted.
              </p>
            </div>

            {/* The one photograph on this screen, and the only frame on the page
                besides the story's. Parallax gives it a little independence from
                the type without moving anything but a transform. */}
            <Parallax distance={28}>
              <GoldFrame tone="light">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/hero/hero-still.webp"
                  alt="A bridal lehenga on the rail in the shop"
                  className="aspect-[4/5] w-full object-cover"
                />
              </GoldFrame>
            </Parallax>
          </div>
        </div>
      </section>

      {/* ---------- Story: who runs the shop -------------------------------- */}
      <section className="relative bg-porcelain-100 py-24 md:py-36">
        <SectionEdge
          seed={11}
          paper="var(--color-porcelain-50)"
          reveal="var(--color-porcelain-100)"
        />

        <div className="shell">
          <div className="grid gap-14 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <Parallax distance={34}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/categories/side-lehengas.jpg"
                alt="A piece being fitted in the shop"
                className="arch aspect-[4/5] w-full object-cover shadow-card"
              />
            </Parallax>

            <Reveal>
              <p data-reveal className="eyebrow">
                Who we are
              </p>

              <RippleHeading className="mt-5 max-w-[18ch] text-h2 text-ink-900">
                We are two partners. We handle every rental ourselves.
              </RippleHeading>

              <div className="mt-8 space-y-5 text-ink-600">
                <p data-reveal className="max-w-[54ch]">
                  Rentals and retail began on the same day. One shop, two ways to take
                  a garment home: reserve the dates and collect it, or reserve it and
                  buy it.
                </p>
                <p data-reveal className="max-w-[54ch]">
                  The stock changes day to day. What is on the rail this week was not
                  there last month, and new pieces keep arriving.
                </p>
                <p data-reveal className="max-w-[54ch]">
                  Every rental is handled personally, to the best of our abilities, by
                  the same two people each time.
                </p>
              </div>

              {/* The two facts the owner has not given yet. Left visible on
                  purpose (work order §A): a placeholder is honest, an invented
                  sentence is not. */}
              <dl
                data-reveal
                className="mt-10 grid gap-x-8 gap-y-3 border-t border-ink-900/10 pt-6 text-caption sm:grid-cols-2"
              >
                <div>
                  <dt className="text-ink-400">Why people come back</dt>
                  <dd className="mt-1 text-ink-600">TODO(owner)</dd>
                </div>
                <div>
                  <dt className="text-ink-400">The town</dt>
                  <dd className="mt-1 text-ink-600">TODO(owner)</dd>
                </div>
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- The three doors ----------------------------------------
          Given equal weight and told apart by their own photograph and their own
          sentence, not by three identical cards. */}
      <section className="relative bg-stage py-24 md:py-36">
        <SectionEdge
          seed={12}
          paper="var(--color-porcelain-100)"
          reveal="var(--color-stage)"
        />

        <div className="shell">
          <p className="eyebrow">Three doors</p>
          <RippleHeading className="mt-5 max-w-[20ch] text-h2 text-ink-900">
            Three ways to take a garment home.
          </RippleHeading>
          <p className="mt-6 max-w-[58ch] text-ink-600">
            Nothing is posted. Rentals are reserved by the date, retail is reserved and
            collected, jewellery goes out with an outfit.
          </p>

          <WipeIn className="mt-14 grid gap-10 md:grid-cols-3">
            {DOORS.map((d) => (
              <Link key={d.href} href={d.href} data-wipe className="group block">
                <div className="arch relative overflow-hidden bg-porcelain-200 shadow-card transition-shadow duration-[180ms] group-hover:shadow-lift">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.image}
                    alt=""
                    className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <p className="eyebrow mt-6">{d.eyebrow}</p>
                <h3 className="mt-3 text-h3 text-ink-900">{d.heading}</h3>
                <p className="mt-3 text-ink-600">{d.body}</p>
                <span className="mt-4 inline-block text-caption text-gold-600 transition-transform duration-[180ms] group-hover:translate-x-1">
                  {d.cta}
                </span>
              </Link>
            ))}
          </WipeIn>
        </div>
      </section>

      {/* ---------- Proof: the shop knows garments -------------------------- */}
      <section className="relative bg-porcelain-50 py-24 md:py-36">
        <SectionEdge
          seed={13}
          paper="var(--color-stage)"
          reveal="var(--color-porcelain-50)"
        />

        <div className="shell">
          <div className="grid gap-12 md:grid-cols-[1fr_1.1fr] md:items-start">
            <div>
              <p className="eyebrow">Proof</p>
              <RippleHeading className="mt-5 max-w-[14ch] text-h2 text-ink-900">
                Before anything goes back on the rail.
              </RippleHeading>
              <p className="mt-6 max-w-[44ch] text-ink-600">
                Five checks, made by hand, on every piece, every time it comes back.
              </p>
            </div>

            <Reveal as="ul" className="space-y-0">
              {CHECKS.map((c, i) => (
                <li
                  key={c}
                  data-reveal
                  className="flex gap-6 border-b border-ink-900/10 py-5 first:border-t"
                >
                  <span className="tabular text-caption text-gold-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-ink-900">{c}</span>
                </li>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Close: the invitation, then the mark -------------------- */}
      <div className="relative">
        <SectionEdge
          seed={14}
          paper="var(--color-porcelain-50)"
          reveal="var(--color-violet-950)"
        />
      </div>

      <WordmarkClose>
        <div className="ornament max-w-[7rem]" aria-hidden="true" />

        <RippleHeading className="mt-8 max-w-[14ch] text-h2 text-porcelain-50">
          Come in and try it on.
        </RippleHeading>

        <div className="mt-10 grid gap-12 md:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="max-w-[46ch] text-violet-300">
              Fitting happens in person. Bring the date and we will bring the rail.
            </p>
            <p className="mt-4 max-w-[46ch] text-violet-300">
              Come in during shop hours, or plan a visit so a piece you have seen is
              waiting.
            </p>
            <Link
              href="/visit"
              className="mt-8 inline-block rounded-control border border-porcelain-50/30 px-6 py-3 font-medium text-porcelain-50 transition-colors duration-[180ms] hover:border-porcelain-50/60"
            >
              Plan a visit
            </Link>
          </div>

          {/* Practical detail, from lib/site so it follows the admin settings
              when those land. Never hardcoded here. */}
          <dl className="space-y-6 text-caption">
            <div>
              <dt className="eyebrow on-dark">Hours</dt>
              <dd className="mt-2 text-porcelain-50">{SHOP.hours}</dd>
            </div>
            <div>
              <dt className="eyebrow on-dark">Address</dt>
              <dd className="mt-2 text-porcelain-50">{SHOP.address}</dd>
              <dd className="mt-1">
                <a
                  href={SHOP.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gold-500 underline-offset-4 hover:underline"
                >
                  Open in Maps
                </a>
              </dd>
            </div>
            <div>
              <dt className="eyebrow on-dark">Phone</dt>
              <dd className="mt-2">
                <a
                  href={`tel:${SHOP.phone.replace(/\s/g, "")}`}
                  className="text-porcelain-50 underline-offset-4 hover:underline"
                >
                  {SHOP.phone}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </WordmarkClose>
    </>
  );
}
