import Link from "next/link";
import { Preloader } from "@/components/site/Preloader";
import { Threshold } from "@/components/site/Threshold";
import { RoomIndex } from "@/components/site/RoomIndex";
import { PatternSeam } from "@/components/site/PatternSeam";
import { CountFigure } from "@/components/site/CountFigure";
import { DistortHeading } from "@/components/site/DistortHeading";
import { Parallax } from "@/components/site/Parallax";
import { WipeIn } from "@/components/site/WipeIn";
import { Reveal } from "@/components/site/Reveal";
import { RentalCard } from "@/components/site/RentalCard";
import { SHOP } from "@/lib/site";
import { formatINR } from "@/lib/format";
import { getFeaturedRentals } from "@/lib/rentals";
import { RETAIL_CATEGORIES } from "@/lib/categories";

/**
 * Home — grammar: "Threshold and rooms" (specs/DESIGN_SPEC_V3.md §2).
 *
 * The threshold is the only full-bleed, only scrubbed, only continuous surface.
 * Everything past it is a room, and every room boundary changes all three of
 * {ground, material, device}. Boundaries are hard cuts: the ground swaps
 * instantly and only the incoming room's own content is animated (§3.2).
 *
 *   Room          Ground          Material              Device
 *   Threshold     violet-950      film                  scrub  (the only one)
 *   I  The week   porcelain-50    silk, photographed    flow + in
 *   II arithmetic porcelain-100   figures, type         count
 *   III The craft stage           thread, macro         signature move + parallax
 *   IV The vault  violet-950      gold, metal           parallax
 *   V  The rail   porcelain-100   cotton, daylight      reveal per object
 *   Return        violet-950      still                 flow
 *
 * INTERIM (9 Sep 2026). The owner has decided this grammar belongs on /rentals,
 * which now carries it, and that the main page is to be rebuilt from scratch
 * with a new hero, the shop's own story, and the three doors (rent, shop,
 * jewellery). That rebuild is blocked on the owner's story in their own words.
 * Until then this page stands as-is so the front door is not broken, and it
 * duplicates /rentals' first three rooms on purpose.
 *
 * Nothing from v2 has been deleted: `Hero`, `CategoryShowcase`,
 * `SareesFlagship`, `LehengasFlagship`, `CuratedMoment` and every file under
 * `public/hero/` are kept for the rebuild (owner's instruction, 9 Sep).
 */

// Reads live rental data (app_public Neon connection); rendered per request.
export const dynamic = "force-dynamic";

// TODO(owner): confirm the purchase figure. It is a typical market price for a
// bridal lehenga, not a number of the shop's own, and §2.6 allows real figures
// only. The rental figure beside it is live from the catalogue.
const TYPICAL_PURCHASE_PRICE = 80_000;

// Room IV mirrors the three edits on /jewellery so the two pages name the same
// things. Imagery is the shared category stock until the owner's photography
// lands (public/categories/SOURCES.md).
const VAULT = [
  { t: "The Kundan Edit", d: "Uncut stones set in gold foil.", img: "/categories/bridal-lehengas.jpg", depth: 56 },
  { t: "Polki and Pearls", d: "Natural diamonds, Basra pearls.", img: "/categories/sarees.jpg", depth: 28 },
  { t: "Temple Gold", d: "Carved celestial motifs, heavy work.", img: "/categories/rajasthani-poshak.jpg", depth: 44 },
];

const RAIL = RETAIL_CATEGORIES.slice(0, 4);

const ROOMS = [
  { id: "threshold", label: "Threshold" },
  { id: "week", label: "The week" },
  { id: "arithmetic", label: "The arithmetic" },
  { id: "craft", label: "The craft" },
  { id: "vault", label: "The vault" },
  { id: "rail", label: "The rail" },
  { id: "return", label: "Return" },
] as const;

export default async function Home() {
  const featured = await getFeaturedRentals();
  const rentFrom = featured
    .map((p) => p.pricePerDay)
    .filter((n): n is number => typeof n === "number" && n > 0)
    .sort((a, b) => a - b)[0];

  return (
    <>
      {/* Home only, which is what "skipped on deep links" means (V3 §4.1). */}
      <Preloader />
      <RoomIndex rooms={ROOMS} />
      <Threshold
        line={
          <>
            Vivaah <em className="italic">Dresses and Suits</em>
          </>
        }
      />

      {/* ============ ROOM I: THE WEEK ============
          porcelain-50 · silk, photographed · flow + in */}
      <section id="week" data-room="week" className="bg-porcelain-50 py-28 md:py-40">
        <div className="shell shell-rooms">
          <Reveal className="grid items-center gap-14 md:grid-cols-2 md:gap-20">
            <div data-reveal>
              <p className="eyebrow">The week</p>
              <h2 className="mt-5 text-h2">Everything is decided at once</h2>
              <p className="mt-7 max-w-[44ch] leading-relaxed text-ink-600">
                Sangeet on the Thursday. The wedding on the Saturday. A reception nobody
                has thought about yet, because there has not been an hour to.
              </p>
              <p className="mt-4 max-w-[44ch] leading-relaxed text-ink-600">
                Somewhere in that week you are expected to look like the photographs will
                be looked at for thirty years.
              </p>
            </div>
            {/* The room's material: silk, photographed. */}
            <figure data-reveal>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/categories/side-lehengas.jpg"
                alt="A side lehenga in silk, photographed on the wearer"
                className="aspect-[4/5] w-full bg-stage object-cover"
              />
              <figcaption className="mt-4 text-caption text-ink-400">
                Reserved by the date, returned after the day it was needed.
              </figcaption>
            </figure>
          </Reveal>

          <Reveal className="mt-16 grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <div key={p.slug} data-reveal>
                <RentalCard p={p} />
              </div>
            ))}
          </Reveal>

          <Reveal className="mt-14">
            <Link
              data-reveal
              href="/rentals"
              className="text-[0.9375rem] font-medium text-gold-600 underline-offset-8 decoration-gold-500/40 hover:underline"
            >
              Every piece for rent
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============ ROOM II: THE ARITHMETIC ============
          porcelain-100 · figures, type · count */}
      <section id="arithmetic" data-room="arithmetic" className="bg-porcelain-100 py-28 md:py-40">
        <div className="shell shell-rooms">
          <Reveal>
            <p data-reveal className="eyebrow">The arithmetic</p>
            <h2 data-reveal className="mt-5 max-w-[18ch] text-h2">
              What it costs to own it
            </h2>
            <p data-reveal className="mt-7 max-w-[46ch] leading-relaxed text-ink-600">
              A bridal lehenga is bought once, worn once, and folded into a steel almirah
              for the rest of its life.
            </p>
          </Reveal>

          <div className="mt-14 flex flex-wrap gap-x-20 gap-y-10">
            <div>
              <p className="text-eyebrow uppercase tracking-[0.17em] text-ink-400">To buy</p>
              <CountFigure
                value={TYPICAL_PURCHASE_PRICE}
                prefix="₹"
                className="mt-2 font-display text-h1 leading-none"
              />
            </div>
            <div>
              <p className="text-eyebrow uppercase tracking-[0.17em] text-ink-400">Times worn</p>
              <CountFigure value={1} className="mt-2 font-display text-h1 leading-none" />
            </div>
            {rentFrom ? (
              <div>
                <p className="text-eyebrow uppercase tracking-[0.17em] text-ink-400">
                  To rent, from
                </p>
                <CountFigure
                  value={rentFrom}
                  prefix="₹"
                  className="mt-2 font-display text-h1 leading-none text-gold-600"
                />
              </div>
            ) : null}
          </div>

          <p className="mt-12 max-w-[54ch] text-caption text-ink-400">
            The purchase figure is a typical market price for a bridal lehenga. The rental
            figure is ours, and current
            {rentFrom ? <> at ₹{formatINR(rentFrom)} a day</> : null}.
          </p>
        </div>
      </section>

      {/* ============ ROOM III: THE CRAFT ============
          stage · thread, macro · signature move + parallax · THE PEAK
          Largest scroll span on the page (§2.6). */}
      <section id="craft" data-room="craft" className="bg-stage py-36 md:py-56">
        <div className="shell shell-rooms">
          <div className="grid items-center gap-14 md:grid-cols-2 md:gap-20">
            <Parallax distance={44}>
              <Reveal>
                <p data-reveal className="eyebrow">The craft</p>
                {/* One of the three headings licensed for distortion (§3.5). */}
                <div data-reveal>
                  <DistortHeading className="mt-5 max-w-[16ch] text-h2">
                    We know how it was made
                  </DistortHeading>
                </div>
                <p data-reveal className="mt-7 max-w-[42ch] leading-relaxed text-ink-600">
                  Drag the seam. The photograph resolves into the garment&rsquo;s own draft:
                  the panel seams, the hem, the placement of every motif.
                </p>
                <p data-reveal className="mt-4 max-w-[42ch] text-caption text-ink-400">
                  Drawn from the piece itself, not an illustration of it. Arrow keys move
                  the seam if you would rather not drag.
                </p>
              </Reveal>
            </Parallax>

            <PatternSeam
              photo="/categories/bridal-lehengas.jpg"
              draft="/flagship/draft-lehenga.png"
              alt="Bridal lehenga in red and gold, worn with a matching dupatta"
            />
          </div>
        </div>
      </section>

      {/* ============ ROOM IV: THE VAULT ============
          violet-950 · gold, metal · parallax
          The hardest cut on the page: stage to violet-950, cloth to metal (§2.6).
          Zero transition frames. */}
      <section
        id="vault"
        data-room="vault"
        data-dark=""
        className="on-dark grain bg-violet-950 py-28 text-porcelain-50 md:py-40"
      >
        <div className="shell shell-rooms">
          <Reveal>
            <p data-reveal className="eyebrow on-dark">The vault</p>
            <h2 data-reveal className="mt-5 max-w-[18ch] text-h2 text-porcelain-50">
              Gold, rented by the day
            </h2>
            <p data-reveal className="mt-7 max-w-[44ch] leading-relaxed text-violet-300">
              Jewellery is rented alongside the outfit and chosen in the same sitting,
              never picked in isolation.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {VAULT.map((v) => (
              <Parallax key={v.t} distance={v.depth}>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.img}
                    alt={v.t}
                    className="aspect-[4/5] w-full object-cover"
                  />
                  <figcaption className="mt-4">
                    <span className="block text-h3 font-display text-porcelain-50">{v.t}</span>
                    <span className="mt-1 block text-caption text-violet-300">{v.d}</span>
                  </figcaption>
                </figure>
              </Parallax>
            ))}
          </div>

          <Reveal className="mt-14">
            <Link
              data-reveal
              href="/jewellery"
              className="text-[0.9375rem] font-medium text-gold-500 underline-offset-8 decoration-gold-500/40 hover:underline"
            >
              The jewellery vault
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============ ROOM V: THE RAIL ============
          porcelain-100 · cotton, daylight · reveal per object */}
      <section id="rail" data-room="rail" className="bg-porcelain-100 py-28 md:py-40">
        <div className="shell shell-rooms">
          <Reveal>
            <p data-reveal className="eyebrow">The rail</p>
            <h2 data-reveal className="mt-5 max-w-[20ch] text-h2">
              Bought outright, collected at the shop
            </h2>
          </Reveal>

          <WipeIn className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {RAIL.map((c) => (
              <Link key={c.slug} href={`/retail?category=${c.slug}`} data-wipe className="group block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt={c.name}
                  className="aspect-[3/4] w-full bg-stage object-cover"
                />
                <p className="mt-4 text-[0.9375rem] font-medium text-ink-900 group-hover:text-gold-600">
                  {c.name}
                </p>
                <p className="mt-1 text-caption text-ink-600">Reserved online, held at the shop.</p>
              </Link>
            ))}
          </WipeIn>

          <p className="mt-12 max-w-[56ch] text-caption text-ink-400">
            Every piece on the rail is reserved the same way: pick it here, and it is put
            aside for you to collect and try on at the shop. Nothing is posted.
          </p>
        </div>
      </section>

      {/* ============ RETURN ============
          violet-950 · still · flow. The threshold's ground, no longer moving. */}
      <section
        id="return"
        data-room="return"
        data-dark=""
        className="on-dark grain bg-violet-950 py-32 text-porcelain-50 md:py-44"
      >
        <div className="shell shell-rooms">
          <Reveal>
            {/* Second of the three distortion headings (§3.5). */}
            <div data-reveal>
              <DistortHeading className="max-w-[16ch] text-h2 text-porcelain-50">
                Come and see it on
              </DistortHeading>
            </div>
            <p data-reveal className="mt-8 max-w-[44ch] leading-relaxed text-violet-300">
              Bring the date you are dressing for. We will put the pieces on you, and hold
              whichever one you choose for that week.
            </p>
            <p data-reveal className="mt-10 text-[0.9375rem] text-violet-300">
              {SHOP.address} · <span className="tabular">{SHOP.hours}</span>
            </p>
            <p data-reveal className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              <Link
                href="/visit"
                className="text-gold-500 underline underline-offset-[5px] decoration-gold-500/50"
              >
                How to find us
              </Link>
              <a
                href={SHOP.mapsUrl}
                className="text-gold-500 underline underline-offset-[5px] decoration-gold-500/50"
              >
                Open in maps
              </a>
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
