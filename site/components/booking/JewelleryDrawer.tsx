"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";

export type FreeJewel = { slug: string; name: string; pricePerDay: number | null; image: string | null };

/**
 * Jewellery free on her dates (specs/BOOKING_ENGINE_SPEC.md §2.7, DESIGN_SPEC
 * v2 §6): a panel off the right edge, a sheet from the bottom on a phone.
 *
 * Deliberately NOT a dialog. It has no backdrop, does not take focus and does
 * not trap it, because the booking is still the thing she is doing and the
 * drawer is an aside to it: she can keep choosing a time, typing her name or
 * sending the booking with it open. The parent opens it once per visit and
 * closes it for good the moment the send button scrolls into view, so it can
 * never sit over the one control that matters.
 *
 * Adding a piece only appends it to the booking. Whether it is really free is
 * the constraint's call at submit, the same as every other piece.
 */
export function JewelleryDrawer({
  list,
  added,
  full,
  dates,
  onAdd,
  onClose,
}: {
  list: FreeJewel[];
  added: string[];
  /** The booking already holds as many pieces as it can. */
  full: boolean;
  /** "Sat 14 Nov to Tue 17 Nov", for the heading. */
  dates: string;
  onAdd: (j: FreeJewel) => void;
  onClose: () => void;
}) {
  // Mounted closed, then opened on the next frame, so the slide has a start.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <aside
      aria-labelledby="jewel-drawer-title"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className={`fixed inset-x-0 bottom-0 z-[45] flex max-h-[62svh] flex-col border-t border-gold-600/40 bg-porcelain-50 shadow-lift transition-transform duration-500 ease-drawer sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[22.5rem] sm:border-l sm:border-t-0 ${
        shown ? "translate-x-0 translate-y-0" : "translate-y-full sm:translate-x-full sm:translate-y-0"
      }`}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-7 sm:pt-24">
        <div>
          <p className="eyebrow">Free on {dates}</p>
          <h2 id="jewel-drawer-title" className="mt-2 text-h3">
            Jewellery for the same days
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the jewellery"
          className="press -mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center text-ink-900 hover:text-gold-700"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <ul className="mt-5 flex-1 space-y-5 overflow-y-auto px-6 pb-6 sm:px-7">
        {list.map((j) => {
          const isAdded = added.includes(j.slug);
          return (
            <li key={j.slug} className="flex items-center gap-4">
              {j.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={j.image} alt="" aria-hidden="true" className="keyline h-[4.5rem] w-14 shrink-0 object-cover" />
              ) : (
                <span aria-hidden="true" className="keyline flex h-[4.5rem] w-14 shrink-0 items-center justify-center bg-porcelain-100 text-gold-600">
                  &#10022;
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-body text-ink-900">{j.name}</span>
                <span className="mt-0.5 block text-caption text-ink-600">
                  {j.pricePerDay !== null ? (
                    <>
                      <span className="tabular">₹{formatINR(j.pricePerDay)}</span> / day, paid at the shop
                    </>
                  ) : (
                    "Price at the shop"
                  )}
                </span>
              </span>
              <button
                type="button"
                disabled={isAdded || full}
                onClick={() => onAdd(j)}
                aria-label={isAdded ? `${j.name} is in your booking` : `Add ${j.name} to your booking`}
                className="press inline-flex min-h-11 shrink-0 items-center rounded-control border border-ink-900/30 px-4 text-caption font-medium text-ink-900 transition-colors duration-[180ms] hover:border-violet-800 hover:bg-violet-800 hover:text-porcelain-50 disabled:cursor-default disabled:border-transparent disabled:bg-transparent disabled:text-ink-600"
              >
                {isAdded ? "Added" : "Add"}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-porcelain-200 px-6 py-4 text-caption text-ink-600 sm:px-7">
        {full
          ? "Your booking holds as many pieces as it can."
          : "Anything you add shares your dates, and the shop confirms it with the rest."}
      </p>
    </aside>
  );
}
