import Link from "next/link";
import { Preloader } from "@/components/site/Preloader";
import { SectionEdge } from "@/components/site/SectionEdge";
import { RippleHeading } from "@/components/site/RippleHeading";
import { Reveal } from "@/components/site/Reveal";
import { WipeIn } from "@/components/site/WipeIn";
import { Parallax } from "@/components/site/Parallax";
import { ImageSlot } from "@/components/site/ImageSlot";
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
// Each one is shown as well as said, so the picture carries the claim.
const CHECKS = [
  { text: "Hooks and zips checked after every return.", image: "/categories/bridal-lehengas.jpg" },
  { text: "Hem pinned at the fitting.", image: "/categories/gowns.jpg" },
  { text: "Dupatta edge pressed.", image: "/categories/chaniya-cholis.jpg" },
  { text: "Blouse altered in the shop.", image: "/categories/indo-western.jpg" },
  { text: "Every piece steamed before it leaves.", image: "/categories/sarees.jpg" },
];

// The hero scrim, measured against the bare plate rather than guessed at
// (lab/hero-centre7). violet-950 is #191129. The bloom sits under the type
// block and the riser climbs from the bottom edge, so the shade is spent where
// the words are instead of across the whole picture.
const HERO_BLOOM =
  "radial-gradient(92% 78% at 50% 76%, rgba(25,17,41,0.72) 0%, rgba(25,17,41,0.4) 50%, rgba(25,17,41,0) 78%)";
const HERO_RISER =
  "linear-gradient(to top, rgba(25,17,41,0.88) 0%, rgba(25,17,41,0.7) 17.28%, rgba(25,17,41,0.48) 40.32%, rgba(25,17,41,0.23) 63.36%, rgba(25,17,41,0.07) 81.6%, rgba(25,17,41,0) 96%)";
const HERO_JOIN =
  "linear-gradient(to right, rgba(25,17,41,1) 0%, rgba(25,17,41,0.92) 18%, rgba(25,17,41,0.55) 48%, rgba(25,17,41,0.18) 78%, rgba(25,17,41,0) 100%)";

export default function HomePage() {
  return (
    <>
      <Preloader />

      {/* ---------- Hero: the panel and the garden --------------------------
          A split: the type sits on a violet panel down the left, the photograph
          holds the right and bleeds off that edge, and a gradient carries one
          into the other so the seam between them is never a line.

          Below md there is no room for two columns, so the photograph becomes
          the whole ground and the panel's gradients become the plinth scrim
          measured in lab/hero-centre7: a thin tint, a bloom under the type and
          a riser off the bottom edge. */}
      <section className="on-dark relative isolate bg-violet-950">
        <div className="relative grid min-h-[100svh] md:min-h-[clamp(520px,62vh,760px)] md:grid-cols-[minmax(0,44%)_minmax(0,56%)]">
          {/* The photograph. Absolute below md so the type lies over it; a real
              grid column from md up so it owns the right of the frame. */}
          <div className="hero-frame absolute inset-0 md:relative md:col-start-2 md:row-start-1">
            <ImageSlot
              label="Hero: the garden photograph"
              w={2400}
              h={1600}
              tone="dark"
              className="absolute inset-0 !aspect-auto h-full w-full"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-violet-950/14" />
            <div
              aria-hidden="true"
              className="absolute inset-0 md:hidden"
              style={{ background: HERO_BLOOM }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 md:hidden"
              style={{ background: HERO_RISER }}
            />
            {/* The join. Opaque at the panel's edge, gone by two thirds across,
                so the picture arrives out of the violet instead of beside it. */}
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 hidden w-2/3 md:block"
              style={{ background: HERO_JOIN }}
            />
          </div>

          {/* The panel. Its left padding is the shell's own margin, so the
              headline starts on the same line as every section below it. */}
          <div className="relative z-10 flex items-center md:col-start-1 md:row-start-1">
            <Reveal className="hero-copy w-full px-[4vw] py-20 pl-[max(4vw,calc((100vw-1680px)/2))] md:py-12 md:pr-10">
              <p className="eyebrow on-dark" data-reveal>
                Bridal and occasion wear, to rent or to buy
              </p>

              <RippleHeading
                as="h1"
                italic="changes"
                className="mt-5 max-w-[17ch] text-h1 text-porcelain-50"
              >
                The rail changes every day. Come and see what arrived this week.
              </RippleHeading>

              <p className="mt-6 max-w-[46ch] text-porcelain-50" data-reveal>
                Two partners, one shop. Rentals and retail opened together, on
                the same rail, and the stock is updated day to day.
              </p>

              <div className="mt-8 flex flex-wrap gap-3" data-reveal>
                <Link
                  href="/rentals"
                  className="rounded-control bg-porcelain-50 px-6 py-3 font-medium text-violet-950 transition-colors duration-[180ms] hover:bg-gold-100"
                >
                  See what is in for rent
                </Link>
                <Link
                  href="/visit"
                  className="rounded-control border border-porcelain-50/40 px-6 py-3 font-medium text-porcelain-50 transition-colors duration-[180ms] hover:border-porcelain-50/80"
                >
                  Plan a visit
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Story: who runs the shop --------------------------------
          On the dark ground, the alternate of the two the site runs on. The
          photograph sits left, the heading takes the top of the right column
          and the prose runs beneath it in two measures rather than one long
          one, so the section is not shaped like the hero above it. */}
      <section className="on-dark relative bg-violet-950 py-24 md:py-36">
        <SectionEdge
          seed={11}
          paper="var(--color-porcelain-50)"
          reveal="var(--color-violet-950)"
        />

        <div className="shell">
          <div className="grid items-center gap-14 sm:grid-cols-[max-content_1fr] lg:gap-20">
            <Parallax distance={34}>
              <ImageSlot
                label="A piece being fitted in the shop"
                w={480}
                h={600}
                tone="dark"
                className="w-[clamp(72px,6vw,132px)]"
              />
            </Parallax>

            <Reveal>
              <p data-reveal className="eyebrow on-dark">
                The shop
              </p>

              <RippleHeading
                italic="ourselves"
                className="mt-5 max-w-[20ch] text-h2 text-porcelain-50"
              >
                We are two partners. We handle every rental ourselves.
              </RippleHeading>

              <div className="mt-10 grid gap-x-12 gap-y-5 text-porcelain-50/85 sm:grid-cols-2">
                <p data-reveal>
                  Rentals and retail began on the same day. One shop, two ways to
                  take a garment home: reserve the dates and collect it, or
                  reserve it and buy it.
                </p>
                <p data-reveal>
                  The stock changes day to day. What is on the rail this week was
                  not there last month, and new pieces keep arriving.
                </p>
                <p data-reveal>
                  Every rental is handled personally, to the best of our
                  abilities, by the same two people each time.
                </p>
              </div>

              {/* The two facts the owner has not given yet. Left visible on
                  purpose (work order §A): a placeholder is honest, an invented
                  sentence is not. */}
              <dl
                data-reveal
                className="mt-10 grid gap-x-12 gap-y-3 border-t border-porcelain-50/15 pt-6 text-caption sm:grid-cols-2"
              >
                <div>
                  <dt className="text-porcelain-50/70">Why people come back</dt>
                  <dd className="mt-1 text-porcelain-50/70">TODO(owner)</dd>
                </div>
                <div>
                  <dt className="text-porcelain-50/70">The town</dt>
                  <dd className="mt-1 text-porcelain-50/70">TODO(owner)</dd>
                </div>
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- The three doors ----------------------------------------
          Three trades, three card treatments, and no two of them the same
          shape: the rental door is a dark plate, retail is a ruled card on the
          paper, jewellery is the photograph itself with its line laid over the
          foot of it. The columns are unequal and each one starts lower than the
          last, so the row reads as three separate things rather than a set of
          triplets. Every card wipes in on its own beat. */}
      <section className="relative bg-porcelain-50 py-24 md:py-36">
        <SectionEdge
          seed={12}
          paper="var(--color-violet-950)"
          reveal="var(--color-porcelain-50)"
        />

        <div className="shell-wide">
          <div className="grid gap-8 sm:grid-cols-[1fr_minmax(0,38ch)] sm:items-end sm:gap-16">
            <Reveal>
              <p data-reveal className="eyebrow">
                Three doors
              </p>
              <RippleHeading
                italic="home"
                className="mt-5 max-w-[18ch] text-h2 text-ink-900"
              >
                Three ways to take a garment home.
              </RippleHeading>
            </Reveal>
            <Reveal>
              <p data-reveal className="text-ink-600">
                Nothing is posted. Rentals are reserved by the date, retail is
                reserved and collected, jewellery goes out with an outfit.
              </p>
            </Reveal>
          </div>

          <WipeIn className="mt-16 grid items-start gap-10 sm:grid-cols-[minmax(0,0.92fr)_minmax(0,0.98fr)_minmax(0,1.2fr)] lg:gap-14">
            {/* 1 — rentals, on the dark plate */}
            <Link
              href={DOORS[0].href}
              data-wipe
              className="group block bg-violet-950 p-6 shadow-card transition-shadow duration-[180ms] hover:shadow-lift sm:mt-0"
            >
              <p className="eyebrow on-dark">{DOORS[0].eyebrow}, by the date</p>
              <h3 className="mt-4 max-w-[12ch] text-h3 text-porcelain-50">
                Bridal and festive wear
              </h3>
              <div className="arch mt-7 w-[clamp(84px,6.5vw,144px)] overflow-hidden">
                <ImageSlot
                  label="Bridal and festive wear"
                  w={520}
                  h={650}
                  tone="dark"
                  className="w-full"
                />
              </div>
              <span className="mt-6 flex items-center justify-between gap-4 text-caption text-porcelain-50">
                Reserve the dates, collect, return.
                <span
                  aria-hidden="true"
                  className="text-gold-500 transition-transform duration-[180ms] group-hover:translate-x-1"
                >
                  &#8594;
                </span>
              </span>
            </Link>

            {/* 2 — retail, a ruled card on the paper */}
            <Link
              href={DOORS[1].href}
              data-wipe
              className="group block border border-ink-900/12 bg-porcelain-50 p-6 transition-colors duration-[180ms] hover:border-ink-900/25 sm:mt-10"
            >
              <p className="eyebrow">{DOORS[1].eyebrow}, to keep</p>
              <h3 className="mt-4 max-w-[14ch] text-h3 text-ink-900">
                Suits, kurtis, co-ord sets, kaftans
              </h3>
              <div className="mt-7 w-[clamp(84px,6.5vw,144px)] overflow-hidden">
                <ImageSlot
                  label="Suits, kurtis, co-ord sets"
                  w={520}
                  h={650}
                  className="w-full"
                />
              </div>
              <span className="mt-6 flex items-center justify-between gap-4 text-caption text-gold-700">
                Reserve online, collect at the shop
                <span
                  aria-hidden="true"
                  className="transition-transform duration-[180ms] group-hover:translate-x-1"
                >
                  &#8594;
                </span>
              </span>
            </Link>

            {/* 3 — jewellery, the photograph with its line beneath it.
                The line used to sit over the foot of the picture; at the size
                the pictures are now there is nothing to lay it over. */}
            <Link
              href={DOORS[2].href}
              data-wipe
              className="group relative block bg-porcelain-100 p-6 transition-colors duration-[180ms] hover:bg-porcelain-200 sm:mt-20"
            >
              <p className="eyebrow">{DOORS[2].eyebrow}, to match</p>
              <h3 className="mt-4 max-w-[14ch] text-h3 text-ink-900">
                Rented alongside an outfit, never sold.
              </h3>
              <div className="mt-7 w-[clamp(84px,6.5vw,144px)] overflow-hidden">
                <ImageSlot
                  label="Jewellery on an outfit"
                  w={520}
                  h={650}
                  className="w-full"
                />
              </div>
              <span className="mt-6 flex items-center justify-between gap-4 text-caption text-gold-700">
                Match to your outfit
                <span
                  aria-hidden="true"
                  className="transition-transform duration-[180ms] group-hover:translate-x-1"
                >
                  &#8594;
                </span>
              </span>
            </Link>

          </WipeIn>
        </div>
      </section>

      {/* ---------- The jewellery line --------------------------------------
          One band, once on the page: a single sentence on the dark ground with
          the piece it is about beside it. It is a rule, not a section, so it
          takes no heading and no padding beyond the line's own height. */}
      <section className="on-dark relative bg-violet-950 py-7">
        <div className="shell-wide">
          <Reveal className="flex flex-wrap items-center justify-between gap-6">
            <div data-reveal className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <p className="eyebrow on-dark">Jewellery</p>
              <p className="font-display text-h3 font-medium text-porcelain-50">
                Rented alongside an outfit, never sold.
              </p>
            </div>

            <Link
              href="/jewellery"
              data-reveal
              className="group flex items-center gap-4 text-caption text-porcelain-50"
            >
              <ImageSlot
                label="Jewellery thumbnail"
                compact
                w={120}
                h={120}
                tone="dark"
                className="h-11 w-11 shrink-0 rounded-full !gap-0 !p-0 text-[0.5rem]"
              />
              <span className="flex items-center gap-2">
                Match to your outfit
                <span
                  aria-hidden="true"
                  className="text-gold-500 transition-transform duration-[180ms] group-hover:translate-x-1"
                >
                  &#8594;
                </span>
              </span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------- Proof: the shop knows garments ---------------------------
          The five checks are shown, not listed. One large frame carries the
          first and a two-up grid carries the rest, each picture keylined and
          captioned with its own number, so the section reads as evidence
          instead of a table. Torn edges above and below it. */}
      <section className="relative bg-porcelain-50 py-24 md:py-36">
        <SectionEdge
          seed={13}
          paper="var(--color-violet-950)"
          reveal="var(--color-porcelain-50)"
        />

        <div className="shell-wide">
          <div className="grid gap-8 sm:grid-cols-[1fr_minmax(0,40ch)] sm:items-end sm:gap-16">
            <Reveal>
              <p data-reveal className="eyebrow">
                Proof
              </p>
              <RippleHeading
                italic="back"
                className="mt-5 max-w-[16ch] text-h2 text-ink-900"
              >
                Before anything goes back on the rail.
              </RippleHeading>
            </Reveal>
            <Reveal>
              <p data-reveal className="text-ink-600">
                Five checks, made by hand, on every piece, every time it comes
                back.
              </p>
            </Reveal>
          </div>

          <Reveal className="mt-16 grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)] lg:gap-12">
            <figure data-reveal className="m-0">
              <Parallax distance={26}>
                <ImageSlot
                  label={CHECKS[0].text}
                  w={800}
                  h={1070}
                  className="w-[clamp(120px,10vw,220px)]"
                />
              </Parallax>
              <figcaption className="mt-4 flex gap-4 text-caption">
                <span className="tabular text-gold-700">01</span>
                <span className="text-ink-600">{CHECKS[0].text}</span>
              </figcaption>
            </figure>

            <div className="grid grid-cols-2 gap-8 lg:gap-10">
              {CHECKS.slice(1).map((c, i) => (
                <figure key={c.text} data-reveal className="m-0">
                  <ImageSlot
                    label={c.text}
                    w={420}
                    h={530}
                    className="w-[clamp(68px,5.5vw,120px)]"
                  />
                  <figcaption className="mt-4 flex gap-3 text-caption">
                    <span className="tabular text-gold-700">
                      {String(i + 2).padStart(2, "0")}
                    </span>
                    <span className="text-ink-600">{c.text}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Close: the invitation ------------------------------------
          The page ends on paper rather than on the dark, with the invitation
          centred over it. Everything a visitor needs to actually arrive sits
          to the left, and the map holds the right, because "where is it" is
          the last question this page has to answer. */}
      <section className="relative bg-porcelain-100 py-24 md:py-32">
        <SectionEdge
          seed={14}
          paper="var(--color-porcelain-50)"
          reveal="var(--color-porcelain-100)"
        />

        <div className="shell">
          <Reveal className="text-center">
            <div
              className="ornament mx-auto max-w-[7rem]"
              aria-hidden="true"
              data-reveal
            />
            <RippleHeading
              italic="try"
              className="mx-auto mt-8 max-w-[16ch] text-h2 text-ink-900"
            >
              Come in and try it on.
            </RippleHeading>
          </Reveal>

          <div className="mt-14 grid gap-12 sm:grid-cols-2 sm:items-start lg:gap-20">
            <Reveal>
              <p data-reveal className="max-w-[46ch] text-ink-600">
                Fitting happens in person. Bring the date and we will bring the
                rail.
              </p>
              <p data-reveal className="mt-4 max-w-[46ch] text-ink-600">
                Come in during shop hours, or plan a visit so a piece you have
                seen is waiting.
              </p>

              {/* Practical detail, from lib/site so it follows the admin
                  settings when those land. Never hardcoded here. */}
              <dl data-reveal className="mt-10">
                <dt className="eyebrow">Hours</dt>
                <dd className="mt-2 font-display text-h3 font-medium text-ink-900">
                  {SHOP.hours}
                </dd>
              </dl>

              <dl
                data-reveal
                className="mt-8 grid gap-x-10 gap-y-6 text-caption sm:grid-cols-2"
              >
                <div>
                  <dt className="eyebrow">Address</dt>
                  <dd className="mt-2 text-ink-900">{SHOP.address}</dd>
                  <dd className="mt-1">
                    <a
                      href={SHOP.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gold-700 underline-offset-4 hover:underline"
                    >
                      Open in Maps
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Phone</dt>
                  <dd className="mt-2">
                    <a
                      href={`tel:${SHOP.phone.replace(/\s/g, "")}`}
                      className="text-ink-900 underline-offset-4 hover:underline"
                    >
                      {SHOP.phone}
                    </a>
                  </dd>
                </div>
              </dl>

              <Link
                data-reveal
                href="/visit"
                className="mt-10 inline-block rounded-control bg-violet-950 px-6 py-3 font-medium text-porcelain-50 transition-colors duration-[180ms] hover:bg-violet-900"
              >
                Plan a visit
              </Link>
            </Reveal>

            {/* The map. Lazy so it costs nothing until it is scrolled to, and
                keylined like the proof frames so it sits in the same system. */}
            <Reveal>
              <div data-reveal className="ring-1 ring-ink-900/15">
                <iframe
                  title={`Map to ${SHOP.name}`}
                  src={SHOP.mapsEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="block aspect-[4/3] w-full md:aspect-[3/4] lg:aspect-[4/3]"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

    </>
  );
}
