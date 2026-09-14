"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  clear,
  remove,
  setDate,
  useSelection,
  SELECTION_MAX,
} from "@/lib/selection";
import { selectionHref, hasRealPhone, REQUEST_NOTICE } from "@/lib/enquiry";
import { registerFlightTarget } from "@/components/site/GarmentFlight";
import { formatINR } from "@/lib/rentals";

/**
 * The tray: what has been gathered, and the one message that asks for it.
 *
 * The header mark is always rendered, even at zero. Two reasons, and the second
 * is the load-bearing one: a control that appears only once it has contents
 * cannot be the destination of the flight that puts the first thing in it, and
 * a visitor who has gathered nothing still benefits from seeing that gathering
 * is possible. Empty, it is quiet — the hanger alone, no count.
 *
 * The panel deliberately shows no total. Prices are listed per piece because
 * she should be able to see what each one costs, but summing them would read as
 * an amount owed, and nothing is owed: the shop confirms by message and takes
 * an advance by UPI afterwards. Rentals are also priced per DAY, so a sum
 * across a rental and a retail piece would not even be a coherent number.
 *
 * The date is one free-text field for the whole selection, not one per piece.
 * See lib/selection for why.
 */
export function SelectionTray() {
  const sel = useSelection();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const count = sel.items.length;

  // The flight needs to know where to land, and the mark moves with the sticky
  // nav, so the element itself is registered rather than a measured point.
  useEffect(() => {
    registerFlightTarget(btnRef.current);
    return () => registerFlightTarget(null);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    // Focus moves into the panel so the keyboard is where the eye is.
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const real = hasRealPhone();
  const href = selectionHref(sel);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={
          count === 0
            ? "Your selection is empty"
            : `Your selection, ${count} ${count === 1 ? "piece" : "pieces"}`
        }
        className="press relative inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-[180ms] hover:bg-current/10"
      >
        <svg width="23" height="18" viewBox="0 0 26 20" fill="none" aria-hidden="true">
          <path
            d="M13 6.5c0-2 1.4-3 2.8-3 1.5 0 2.7 1.1 2.7 2.6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M13 6.5 3 13.4c-.8.6-.4 1.9.6 1.9h18.8c1 0 1.4-1.3.6-1.9L13 6.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        {count > 0 && (
          <span className="tabular absolute -right-0.5 -top-0.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-gold-500 px-1 text-[11px] font-semibold leading-none text-violet-950">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-violet-950/45"
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Your selection"
            tabIndex={-1}
            /* Bottom sheet on a phone, a panel off the right edge from sm up:
               the same content, placed where the hand is in each case. */
            className="on-dark fixed inset-x-0 bottom-0 z-[56] max-h-[86svh] overflow-y-auto border-t border-gold-500/30 bg-violet-950 p-6 outline-none sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[27rem] sm:border-l sm:border-t-0 sm:p-8"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="eyebrow on-dark">Your selection</p>
                <p className="mt-2 font-display text-h3 font-medium text-porcelain-50">
                  {count === 0
                    ? "Nothing gathered yet"
                    : `${count} ${count === 1 ? "piece" : "pieces"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="press -mr-2 -mt-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-porcelain-50 hover:bg-porcelain-50/10"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {count === 0 ? (
              <p className="mt-8 text-caption text-porcelain-50/70">
                Add a piece from anywhere on the site and it will wait here, so
                you can ask about everything at once instead of one at a time.
              </p>
            ) : (
              <>
                <ul className="mt-8 flex flex-col gap-5">
                  {sel.items.map((i) => (
                    <li key={i.slug} className="flex items-start gap-4">
                      {i.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={i.image}
                          alt=""
                          aria-hidden="true"
                          width={52}
                          height={69}
                          className="h-[69px] w-[52px] shrink-0 object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="h-[69px] w-[52px] shrink-0 bg-porcelain-50/10"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <Link
                          href={i.href}
                          onClick={close}
                          className="block truncate text-body text-porcelain-50 underline-offset-4 hover:underline"
                        >
                          {i.name}
                        </Link>
                        <span className="mt-1 block text-caption text-porcelain-50/70">
                          {i.price !== null ? (
                            <>
                              <span className="tabular">₹{formatINR(i.price)}</span>
                              {i.kind === "rental" ? " / day" : ""}
                            </>
                          ) : (
                            "Ask us"
                          )}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(i.slug)}
                        aria-label={`Remove ${i.name}`}
                        className="press -mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-porcelain-50/70 hover:bg-porcelain-50/10 hover:text-porcelain-50"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path
                            d="M4 4l8 8M12 4l-8 8"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>

                {count >= SELECTION_MAX && (
                  <p className="mt-5 text-caption text-gold-500">
                    That is as many as the tray holds. Remove one to add
                    another.
                  </p>
                )}

                <div className="mt-8 border-t border-porcelain-50/15 pt-6">
                  <label
                    htmlFor="sel-date"
                    className="block text-caption text-porcelain-50/70"
                  >
                    What day are you dressing for?
                  </label>
                  <input
                    id="sel-date"
                    type="text"
                    defaultValue={sel.date ?? ""}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="14 November, or Diwali"
                    className="mt-2 w-full rounded-control border border-porcelain-50/25 bg-transparent px-3 py-2.5 text-body text-porcelain-50 outline-none placeholder:text-porcelain-50/40 focus:border-gold-500"
                  />
                </div>

                <a
                  href={href}
                  {...(real ? { target: "_blank", rel: "noreferrer" } : {})}
                  onClick={close}
                  className="press mt-6 flex min-h-[48px] items-center justify-center rounded-control bg-porcelain-50 px-6 font-medium text-violet-950 transition-colors duration-[180ms] hover:bg-gold-100"
                >
                  {real ? "Send this request" : "Plan a visit"}
                </a>

                {real && (
                  <p className="mt-3 text-caption text-porcelain-50/70">
                    {REQUEST_NOTICE}
                  </p>
                )}

                <button
                  type="button"
                  onClick={clear}
                  className="press mt-6 text-caption text-porcelain-50/60 underline-offset-4 hover:text-porcelain-50 hover:underline"
                >
                  Empty the tray
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
