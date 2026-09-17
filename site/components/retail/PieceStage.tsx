"use client";

import { useState } from "react";
import Link from "next/link";
import { SelectionButton } from "@/components/site/SelectionButton";
import { REQUEST_NOTICE, reserveHref } from "@/lib/enquiry";
import { formatINR } from "@/lib/format";
import type { RetailVariant } from "@/lib/retail";

/**
 * The working half of a retail product page: the photographs, the colour, the
 * size, and the one action (specs/RETAIL_SPEC.md §3.2).
 *
 * One client component rather than a gallery and a chooser side by side,
 * because three things move together — the swatch drives the photographs, the
 * swatch changes which sizes exist, and both compose the reserve link. Split in
 * two, the selection would have to live in a third place and be passed down to
 * both halves.
 *
 * Two of the owner's decisions shape it, and neither is decoration:
 *
 *   - **No counts, ever** (R3). A size is in stock or it is not. "Only 1 left"
 *     is pressure about a number she corrects by hand, and `RetailVariant`
 *     carries no quantity at all, so this could not print one by mistake.
 *   - **A size with no stock is disabled, not hidden.** She should know the
 *     piece comes in XL even when there is none today — that is a reason to ask
 *     at the shop, and hiding it looks like the size does not exist.
 *
 * Nothing here holds anything. The count is taken by the database when the
 * request is made, in the same statement that checks it, so a size that reads
 * as available can still go while she is filling the form — and then /reserve
 * says so, naming the piece and the size.
 */
export function PieceStage({
  slug,
  name,
  variants,
  sample,
  category,
}: {
  slug: string;
  name: string;
  variants: RetailVariant[];
  /** The category photograph, for a piece with none of its own yet. */
  sample: string | null;
  category: string;
}) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [size, setSize] = useState("");

  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const photos = variant?.images ?? [];
  const [shown, setShown] = useState(0);
  const photo = photos[Math.min(shown, photos.length - 1)] ?? null;

  const chooseVariant = (v: RetailVariant) => {
    setVariantId(v.id);
    setShown(0);
    // The size does not survive a colour change unless this colour has it in
    // stock: carrying "M" across to a colour with no M would make the reserve
    // button promise something the next page has to take back.
    setSize((cur) => (v.sizes.some((s) => s.size === cur && s.inStock) ? cur : ""));
  };

  const chosen = variant?.sizes.find((s) => s.size === size && s.inStock);
  const price = variant?.price ?? null;
  const card = photo?.path ?? sample;

  return (
    <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
      {/* ---- the photographs -------------------------------------------- */}
      <div className="min-w-0">
        {/* 4:5 on a phone, where the column is the width of the screen and the
            height follows from it. From lg the column is ~840px wide and 4:5
            would make the plate 1050px tall — taller than the choice beside it
            and taller than the screen — so it is capped and crops instead (the
            10 Sep rule: an uncapped photograph gets a cap). */}
        <div className="keyline arch relative aspect-[4/5] overflow-hidden rounded-card bg-stage shadow-card lg:aspect-auto lg:h-[min(74svh,780px)]">
          {photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photo.path}
              alt={photo.alt || `${name}, ${variant?.colourName}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : sample ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sample}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* The honesty of the page rests on this label: the name, the
                  price, the colours and the sizes are real, the picture is a
                  photograph of the category and not of this piece. */}
              <span className="absolute bottom-4 left-4 rounded-full bg-porcelain-50/90 px-3 py-1.5 text-caption font-medium text-ink-900">
                Sample photo
              </span>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-porcelain-100">
              <span aria-hidden="true" className="text-2xl text-gold-600/50">
                &#10022;
              </span>
              <span className="text-caption text-ink-600">Photograph coming</span>
            </div>
          )}
        </div>

        {photos.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {photos.map((img, i) => (
              <button
                key={img.path}
                type="button"
                onClick={() => setShown(i)}
                aria-label={`View ${i + 1} of ${photos.length}`}
                aria-pressed={i === shown}
                className={`keyline h-20 w-16 overflow-hidden rounded-[0.25rem] transition-opacity duration-[180ms] ${
                  i === shown ? "" : "opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.path}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---- what it is, and the one action ------------------------------ */}
      <div className="min-w-0 space-y-10">
        <div>
          <p className="eyebrow">{category}</p>
          <h1 className="mt-4 font-display text-h1 leading-[1.05] text-ink-900">{name}</h1>
          {price !== null && (
            <p className="mt-5 text-body text-ink-600">
              <span className="tabular text-h3 font-medium text-ink-900">
                ₹{formatINR(price)}
              </span>
              {/* Not "/ day". This is the half of the shop you keep, and the
                  words are what tell her which trade she is in. */}
              <span className="ml-3">to keep, paid at the shop</span>
            </p>
          )}
        </div>

        {variants.length > 1 && (
          <fieldset>
            <legend className="eyebrow">
              Colour: <span className="text-ink-900">{variant?.colourName}</span>
            </legend>
            {/* A hex is not a name, and a dot gives a colour-blind visitor
                nothing, so every swatch carries its word beside it. */}
            <div className="mt-4 flex flex-wrap gap-3">
              {variants.map((v) => {
                const on = v.id === variant?.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => chooseVariant(v)}
                    aria-pressed={on}
                    className={`press inline-flex min-h-[44px] items-center gap-3 rounded-control border px-4 text-caption transition-colors duration-[180ms] ${
                      on
                        ? "border-violet-700 bg-violet-100/60 text-ink-900"
                        : "border-porcelain-200 text-ink-600 hover:border-ink-900/30"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 rounded-full ring-1 ring-ink-900/20"
                      style={{ backgroundColor: v.colourHex }}
                    />
                    {v.colourName}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {variant && variant.sizes.length > 0 && (
          <fieldset>
            <legend className="eyebrow">Size</legend>
            <div className="mt-4 flex flex-wrap gap-3">
              {variant.sizes.map((s) => {
                const on = s.size === size && s.inStock;
                return (
                  <button
                    key={s.size}
                    type="button"
                    disabled={!s.inStock}
                    onClick={() => setSize(s.size)}
                    aria-pressed={on}
                    className={`press inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-control border px-4 text-caption transition-colors duration-[180ms] ${
                      on
                        ? "border-violet-700 bg-violet-100/60 font-medium text-ink-900"
                        : s.inStock
                          ? "border-porcelain-200 text-ink-600 hover:border-ink-900/30"
                          : "cursor-not-allowed border-dashed border-porcelain-200 text-ink-600 line-through"
                    }`}
                  >
                    {s.size}
                  </button>
                );
              })}
            </div>
            {variant.sizes.some((s) => !s.inStock) && (
              <p className="mt-4 max-w-[46ch] text-caption text-ink-600">
                A size crossed through is not on the rail today. Ask at the shop — pieces come
                in most days.
              </p>
            )}
          </fieldset>
        )}

        <div>
          {chosen && variant ? (
            <Link
              href={reserveHref([slug], { variant: variant.id, size: chosen.size })}
              className="press inline-flex items-center gap-3 rounded-control bg-violet-950 px-6 py-3 font-medium text-porcelain-50 transition-colors duration-[180ms] hover:bg-violet-900"
            >
              Reserve in size {chosen.size}
              <span aria-hidden="true" className="translate-y-[0.5px]">
                &#8594;
              </span>
            </Link>
          ) : (
            // Disabled rather than absent, so the page does not rearrange under
            // her hand as she picks, and the button says what it is waiting for.
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-3 rounded-control border border-porcelain-200 px-6 py-3 font-medium text-ink-600"
            >
              {variant && variant.sizes.length > 0 ? "Choose a size" : "Ask at the shop"}
            </button>
          )}

          {/* Gathering is the quieter of the two, as on a rental page: reserving
              this piece now is the act, setting it aside is the alternative. */}
          <SelectionButton
            className="mt-4 w-full justify-center sm:w-auto"
            item={{ slug, name, kind: "retail", href: `/retail/${slug}`, image: card, price }}
          />

          <p className="mt-6 max-w-[42ch] text-caption italic leading-relaxed text-ink-600">
            {REQUEST_NOTICE}
          </p>
        </div>
      </div>
    </div>
  );
}
