import type { Metadata } from "next";
import Link from "next/link";
import { SectionEdge } from "@/components/site/SectionEdge";
import { RequestButton } from "@/components/site/RequestButton";
import { RippleHeading } from "@/components/site/RippleHeading";
import { Reveal } from "@/components/site/Reveal";
import { WipeIn } from "@/components/site/WipeIn";
import { Parallax } from "@/components/site/Parallax";
import { Arcade } from "@/components/site/Arcade";
import { JewelleryCard } from "@/components/site/JewelleryCard";
import { PearlStrands } from "@/components/site/PearlStrands";
import { getJewellery, getJewelleryCategories } from "@/lib/jewellery";
import { jewelleryImages } from "./images";
import { SHOP } from "@/lib/site";

/** The narrow copies `tools/make_image_variants.py` writes beside each shipped
 *  photograph, so a phone fetches a file its own size instead of the 660px one. */
function photoSrcSet(src: string) {
  const stem = src.slice(0, -".webp".length);
  return `${stem}-160.webp 160w, ${stem}-320.webp 320w, ${stem}-480.webp 480w, ${src} 660w`;
}

/**
 * The jewellery page: the shelf, rented on its own or with an outfit.
 *
 * Rebuilt 15 Sep 2026 on the owner's 14 Sep brief. What changed and why:
 *
 *   - It is a catalogue now. Jewellery became its own product type (migrations
 *     0002-0005) and can be rented without an outfit, so the page lists real
 *     pieces from Neon with the owner's six categories as the filter, and each
 *     piece has its own page. "Rented alongside an outfit, never sold" is gone
 *     because it stopped being true.
 *   - The head is the retail arcade, inverted: a porcelain doorway on violet
 *     (owner: "hero like the retail arcade"). The categories turning over in it
 *     are the database's, each linking to its filter.
 *   - Not one violet ground throughout. The vault read as one long dark room;
 *     the grounds now alternate the way every other page's do.
 *
 *   Section   Ground        Composition                        Device
 *   Head      violet-950    type left, three-plane arcade      ripple + parallax, turnover
 *   Pieces    porcelain-50  filter row over the piece grid     wipe per piece
 *   Outfit    violet-900    narrow rail, plate off the edge    parallax
 *   Steps     stage         full-width rule, three columns     reveal
 *   Close     violet-950    invitation against the hours       reveal
 *
 * The head's parallax plates rise into the transparent nav as it scrolls, which
 * put them behind the nav's button. `data-dark-hero="scrim"` gives the nav a
 * violet ground as soon as the head moves.
 */

export const metadata: Metadata = {
  title: "Jewellery on rent",
  description:
    "Jewellery to rent on its own or with an outfit, chosen by occasion. Try it on at the shop and collect it there.",
};

// Reads the catalogue from Neon per request, like /rentals.
export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: "01",
    title: "On its own, or with an outfit",
    body: "Reserve a set by itself online, or for the same dates as an outfit you are renting from us.",
  },
  {
    n: "02",
    title: "Tried on in the shop",
    body: "Try it at the fitting, against the outfit if you have one with you.",
  },
  {
    n: "03",
    title: "Checked when it comes back",
    body: "Returned on the agreed day and checked piece by piece before it goes back on the shelf.",
  },
];

export default async function JewelleryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: slug } = await searchParams;
  const categories = await getJewelleryCategories();
  const category = slug ? categories.find((c) => c.slug === slug) : undefined;
  const pieces = await getJewellery(category?.slug);
  const total = categories.reduce((n, c) => n + c.count, 0);

  // One plate per photograph, so a category with several (Bridal) shows each.
  const arcade = categories.flatMap((c) =>
    jewelleryImages(c.slug).map((image, k) => ({
      slug: `${c.slug}-${k}`,
      name: c.name,
      image,
      href: `/jewellery?category=${c.slug}#pieces`,
    }))
  );

  return (
    <>
      {/* ---------- Head ----------------------------------------------------
          Under the nav (-mt-16), which stays in its on-dark tone for the
          head's height and takes a violet ground once the page moves. */}
      <section
        data-dark-hero="scrim"
        className="on-dark grain relative isolate -mt-16 overflow-x-clip bg-violet-950 pt-28 pb-16 md:flex md:min-h-[100svh] md:flex-col md:pt-24 md:pb-12"
      >
        {/* The pearl strands fill the whole head (owner, 15 Sep), under the
            type column and the arcade. See PearlStrands for the composition. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <PearlStrands />
        </div>
        <div className="shell-wide relative z-[1] md:flex md:flex-1 md:flex-col">
          <div className="grid items-center gap-14 md:flex-1 md:grid-cols-[minmax(0,32rem)_auto] md:justify-between md:gap-10 lg:justify-center lg:gap-[clamp(4rem,9vw,11rem)]">
            <div className="relative z-10">
              <p className="eyebrow">Jewellery</p>

              <RippleHeading
                as="h1"
                italic="own"
                className="mt-6 max-w-[16ch] text-h1 text-porcelain-50"
              >
                Rent it with an outfit, or on its own.
              </RippleHeading>

              <div className="mt-10 flex flex-wrap gap-3">
                <a
                  href="#pieces"
                  className="press rounded-control bg-porcelain-50 px-6 py-3 font-medium text-violet-950 transition-colors duration-[180ms] hover:bg-gold-100"
                >
                  See the pieces
                </a>
                <Link
                  href="/visit"
                  className="press rounded-control border border-porcelain-50/30 px-6 py-3 font-medium text-porcelain-50 transition-colors duration-[180ms] hover:border-porcelain-50/60"
                >
                  Plan a visit
                </Link>
              </div>
            </div>

            {arcade.length > 0 && (
              <Arcade items={arcade} tone="dark" />
            )}
          </div>
        </div>
      </section>

      {/* ---------- The pieces -----------------------------------------------
          The filter sits directly over what it filters, as on /rentals. While
          nothing is on the site yet the shelf is shown by category instead,
          each with its stand-in photograph labelled, and the one real action. */}
      <section
        id="pieces"
        className="relative scroll-mt-16 bg-porcelain-50 pt-24 pb-24 md:pt-32 md:pb-32"
      >
        <SectionEdge
          seed={22}
          paper="var(--color-violet-950)"
          reveal="var(--color-porcelain-50)"
        />

        <div className="shell-wide relative">
          <RippleHeading className="text-h2 text-ink-900">
            {category ? `${category.name} jewellery.` : "The pieces."}
          </RippleHeading>

          {total > 0 ? (
            <>
              <nav aria-label="Jewellery categories" className="mt-10">
                <ul className="flex flex-wrap gap-2">
                  {[{ slug: "", name: "All", count: total }, ...categories].map((c) => {
                    const active = (category?.slug ?? "") === c.slug;
                    return (
                      <li key={c.slug || "all"}>
                        <Link
                          href={c.slug ? `/jewellery?category=${c.slug}#pieces` : "/jewellery#pieces"}
                          aria-current={active ? "page" : undefined}
                          className={`press inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-caption transition-colors duration-[180ms] ${
                            active
                              ? "border-violet-950 bg-violet-950 text-porcelain-50"
                              : "border-ink-900/15 text-ink-900 hover:border-ink-900/40"
                          }`}
                        >
                          {c.name}
                          <span className={`tabular ${active ? "text-porcelain-50/70" : "text-ink-600"}`}>
                            {c.count}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {pieces.length > 0 ? (
                <WipeIn className="mt-14 grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pieces.map((p) => (
                    <div key={p.slug} data-wipe>
                      <JewelleryCard p={p} />
                    </div>
                  ))}
                </WipeIn>
              ) : (
                <div className="mt-14 max-w-xl">
                  <p className="text-body text-ink-600">
                    Nothing from {category?.name ?? "this category"} is on the site yet. The
                    shelf in the shop has more than the site shows.
                  </p>
                  <RequestButton
                    night={category ? `${category.name} jewellery` : undefined}
                    className="mt-8"
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <p className="mt-8 max-w-[52ch] text-body text-ink-600">
                The shelf is being photographed for the site. Every category below is
                in the shop now.
              </p>

              <WipeIn className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
                {categories.map((c) => (
                  <div key={c.slug} data-wipe>
                    <div className="keyline arch relative aspect-[3/4] overflow-hidden bg-porcelain-100 shadow-card">
                      {c.image ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.image}
                            srcSet={photoSrcSet(c.image)}
                            sizes="(min-width: 1024px) 15vw, (min-width: 640px) 30vw, 45vw"
                            alt=""
                            aria-hidden="true"
                            width={660}
                            height={880}
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                          <span className="absolute bottom-3 left-3 rounded-full bg-porcelain-50/90 px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide text-ink-900">
                            Sample photo
                          </span>
                        </>
                      ) : (
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 flex items-center justify-center text-2xl text-gold-600/50"
                        >
                          &#10022;
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 px-1 text-[1.2rem] leading-tight text-ink-900">
                      {c.name}
                    </h3>
                  </div>
                ))}
              </WipeIn>

              <RequestButton className="mt-14" />
            </>
          )}
        </div>
      </section>

      {/* ---------- With an outfit -------------------------------------------
          The composition the vault page had at its strongest: the text on a
          narrow rail at the shell's left inset, the outfit running off the
          right edge, the set overlapping its corner. */}
      <section className="on-dark grain relative overflow-hidden bg-violet-900 pt-28 pb-24 md:pt-36 md:pb-32">
        <SectionEdge
          seed={23}
          paper="var(--color-porcelain-50)"
          reveal="var(--color-violet-900)"
        />

        {/* The left gutter lives on the grid, not the rail column: on the
            column it is subtracted from the rail's 25rem and the heading breaks
            into six lines at 1920. The right gutter is given up for the plate. */}
        <div className="relative z-[1] grid items-center gap-12 pl-5 md:grid-cols-[minmax(0,25rem)_1fr] md:pl-8 lg:gap-16 lg:pl-[max(2.5rem,calc((100vw-1600px)/2+2.5rem))]">
          <div className="pr-5 md:pr-0">
            <Reveal>
              <RippleHeading className="max-w-[16ch] text-h2 text-porcelain-50">
                Renting an outfit too? The set goes out on the same dates.
              </RippleHeading>

              <Link
                data-reveal
                href="/rentals"
                className="mt-8 inline-flex items-center gap-2 font-medium text-gold-500 transition-transform duration-[180ms] hover:translate-x-1"
              >
                See what is in for rent
                <span aria-hidden="true">→</span>
              </Link>
            </Reveal>
          </div>

          <div className="relative pb-16 md:pb-20">
            <Parallax distance={30} className="ml-[24%] md:ml-[16%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/categories/rajasthani-poshak.webp"
                srcSet="/categories/rajasthani-poshak-160.webp 160w, /categories/rajasthani-poshak-320.webp 320w, /categories/rajasthani-poshak-480.webp 480w, /categories/rajasthani-poshak.webp 660w"
                sizes="(min-width: 768px) 50vw, 70vw"
                alt="A woman in a Rajasthani poshak wearing the full set that goes with it"
                width={660}
                height={880}
                loading="lazy"
                decoding="async"
                className="keyline aspect-[3/4] max-h-[26rem] w-full object-cover"
              />
            </Parallax>

            <div className="absolute bottom-0 left-0 w-[44%] max-w-[19rem] md:w-[38%]">
              <div className="keyline arch aspect-square overflow-hidden shadow-lift">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/categories/chaniya-cholis.webp"
                  srcSet="/categories/chaniya-cholis-160.webp 160w, /categories/chaniya-cholis-320.webp 320w, /categories/chaniya-cholis-480.webp 480w, /categories/chaniya-cholis.webp 660w"
                  sizes="(min-width: 768px) 19rem, 40vw"
                  alt="The set matched to the outfit, worn with a chaniya choli"
                  width={660}
                  height={880}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-3 text-caption text-violet-300">
                The set that goes with it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it goes out ------------------------------------------ */}
      <section className="relative bg-stage pt-28 pb-20 md:pt-32 md:pb-24">
        <SectionEdge
          seed={24}
          paper="var(--color-violet-900)"
          reveal="var(--color-stage)"
        />

        <div className="shell-wide relative">
          <div className="h-px w-full bg-gold-600/50" />

          <Reveal className="mt-10 grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} data-reveal className="flex gap-5">
                <span className="tabular pt-1 text-caption text-gold-700">{s.n}</span>
                <div>
                  <h3 className="text-h3 text-ink-900">{s.title}</h3>
                  <p className="mt-2 max-w-[34ch] text-ink-600">{s.body}</p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------- Close ----------------------------------------------------
          The practical detail comes from SHOP, never typed into the page. */}
      <section className="on-dark grain relative bg-violet-950 pt-28 pb-24 md:pt-36 md:pb-32">
        <SectionEdge
          seed={25}
          paper="var(--color-stage)"
          reveal="var(--color-violet-950)"
        />

        <div className="shell-wide relative z-[1]">
          <div className="grid items-start gap-12 md:grid-cols-[1.1fr_1fr] lg:gap-20">
            <Reveal>
              <div className="ornament max-w-[7rem]" aria-hidden="true">
                <span className="text-caption">✦</span>
              </div>

              <RippleHeading className="mt-8 max-w-[16ch] text-h2 text-porcelain-50">
                Come in and try the pieces on.
              </RippleHeading>

              <div data-reveal className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                <RequestButton tone="dark" notice={false} />
                <Link
                  href="/visit"
                  className="text-caption text-gold-500 underline-offset-4 hover:underline"
                >
                  Plan a visit
                </Link>
              </div>
            </Reveal>

            <dl className="grid gap-x-10 gap-y-8 text-caption sm:grid-cols-2 md:pt-4">
              <div className="sm:col-span-2">
                <dt className="eyebrow">Hours</dt>
                {/* Wraps at 390, so the phone gets a real line height. */}
                <dd className="tabular mt-3 font-display text-[1.625rem] leading-tight text-porcelain-50 sm:text-[2rem] sm:leading-none">
                  {SHOP.hours}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Address</dt>
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
                <dt className="eyebrow">Phone</dt>
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
        </div>
      </section>
    </>
  );
}
