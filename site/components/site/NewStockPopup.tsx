"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCookiePanelOpen } from "@/components/site/CookieConsent";
import { formatINR } from "@/lib/format";
import type { NewArrival } from "@/lib/rentals";

/**
 * The notice that a piece has just arrived (owner, 14 Sep 2026).
 *
 * Real rows only: it fetches pieces created inside the "Just in" window from
 * /api/new-arrivals (lib/rentals getNewArrivals), and with none it never
 * renders anything. The
 * age is checked again here against the visitor's clock, because a page can be
 * served long after it was rendered.
 *
 * When it appears follows ActionBar's rule exactly: after the hero has gone by
 * (so it never sits over the hero's own buttons) and not once the footer is in
 * view. It yields to the cookie panel. Since ActionBar is up under the same
 * condition, on a phone this always stacks directly above it.
 *
 * It stops asking once she has answered or had a fair look: closing it,
 * following it, or twelve seconds on screen records the slugs in localStorage,
 * and a later load shows it only for a piece she has not been shown.
 */

const KEY = "vivaah:new-stock-seen";
const WINDOW_MS = 7 * 86_400_000; // mirrors JUST_IN_DAYS in lib/rentals
const SETTLE_MS = 1800; // never on first paint
const LOOKED_MS = 12_000;

function readSeen(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function recordSeen(slugs: string[]) {
  try {
    const next = Array.from(new Set([...readSeen(), ...slugs])).slice(-60);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: it holds for this page view only */
  }
}

export function NewStockPopup() {
  const pathname = usePathname() ?? "";
  // Decided after mount, from storage and the local clock; null until then so
  // the server render and hydration carry nothing.
  const [fresh, setFresh] = useState<NewArrival[] | null>(null);
  const [inPlace, setInPlace] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const bannerUp = useCookiePanelOpen();
  const rootRef = useRef<HTMLElement>(null);

  const [pieces, setPieces] = useState<NewArrival[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/new-arrivals", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((v) => setPieces(Array.isArray(v) ? v : []))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const seen = new Set(readSeen());
    const now = Date.now();
    const unseen = pieces.filter((p) => {
      const age = now - new Date(p.createdAt).getTime();
      return Number.isFinite(age) && age >= 0 && age <= WINDOW_MS && !seen.has(p.slug);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is client-only
    setFresh(unseen);
    if (!unseen.length) return;

    const footer = document.querySelector("footer");
    const start = performance.now();
    let raf = 0;
    const read = () => {
      raf = 0;
      const past = window.scrollY > window.innerHeight * 0.6;
      const atFooter = footer
        ? footer.getBoundingClientRect().top < window.innerHeight
        : false;
      setInPlace(past && !atFooter && performance.now() - start >= SETTLE_MS);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    const settle = window.setTimeout(read, SETTLE_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.clearTimeout(settle);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pieces]);

  // Never announce the piece whose own page she is already reading.
  const list = (fresh ?? []).filter((p) => pathname !== `/rentals/${p.slug}`);
  const lead = list[0];
  const open =
    !!lead && inPlace && !dismissed && !bannerUp && !pathname.startsWith("/admin");

  const slugs = list.map((p) => p.slug).join(",");
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => recordSeen(slugs.split(",")), LOOKED_MS);
    return () => window.clearTimeout(t);
  }, [open, slugs]);

  function dismiss() {
    recordSeen(list.map((p) => p.slug));
    if (rootRef.current?.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
    }
    setDismissed(true);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // `dismiss` reads only the current list and refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!lead || pathname.startsWith("/admin")) return null;

  const more = list.length - 1;
  const tab = open ? undefined : -1;

  return (
    <>
      {/* The announcement itself: mounted empty, filled when the notice opens,
          so a screen reader hears it once without having focus moved. */}
      <p role="status" aria-live="polite" className="sr-only">
        {open ? `Just in: ${lead.name}` : ""}
      </p>

      <aside
        ref={rootRef}
        aria-label="New in the shop"
        aria-hidden={!open}
        /* 5.25rem on a phone is ActionBar's 76px plus a gap. On desktop it
           takes the lower left, away from the cookie panel's corner. */
        className={`group/notice fixed inset-x-4 bottom-[5.25rem] z-40 transition-[opacity,transform] duration-500 ease-out-strong motion-reduce:translate-y-0 motion-reduce:transition-opacity md:inset-x-auto md:bottom-6 md:left-6 md:w-[23rem] ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0 duration-200"
        }`}
      >
        <div className="keyline relative grid grid-cols-[4.75rem_1fr] items-center gap-4 rounded-[14px] bg-porcelain-50 p-3 pr-12 shadow-lift">
          <div className="arch relative aspect-[4/5] overflow-hidden bg-stage">
            {lead.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lead.image}
                alt=""
                aria-hidden="true"
                /* The one authored moment: the arch opens upward over the
                   photograph as the notice settles. Under reduced motion the
                   photograph is simply there. */
                className={`absolute inset-0 h-full w-full object-cover transition-[clip-path,transform] delay-100 duration-700 ease-out-strong motion-reduce:transition-none motion-reduce:[clip-path:none] motion-reduce:scale-100 ${
                  open ? "scale-100 [clip-path:inset(0_0_0_0)]" : "scale-110 [clip-path:inset(100%_0_0_0)]"
                }`}
              />
            ) : (
              <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-gold-600/50">
                &#10022;
              </span>
            )}
          </div>

          <div className="min-w-0">
            <Link
              href={`/rentals/${lead.slug}`}
              tabIndex={tab}
              onClick={() => recordSeen(list.map((p) => p.slug))}
              /* Stretched over the whole card, so the photograph and the name
                 are one target; the close button and the second link sit
                 above it. */
              className="block font-display text-[1.2rem] leading-tight text-ink-900 transition-colors duration-[180ms] after:absolute after:inset-0 after:rounded-[14px] hover:text-violet-700 focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-violet-700"
            >
              {lead.name}
            </Link>
            <p className="mt-1 text-caption text-ink-600">
              <span className="font-medium text-gold-700">Just in</span>
              {lead.pricePerDay ? (
                <>
                  {" · "}
                  <span className="tabular font-semibold text-ink-900">
                    ₹{formatINR(lead.pricePerDay)}
                  </span>{" "}
                  / day
                </>
              ) : null}
            </p>
            {(lead.sample || more > 0) && (
              <p className="mt-1.5 flex flex-wrap gap-x-3 text-[0.75rem] text-ink-600">
                {lead.sample && <span>Sample photo</span>}
                {more > 0 && (
                  <Link
                    href="/rentals"
                    tabIndex={tab}
                    onClick={() => recordSeen(list.map((p) => p.slug))}
                    className="relative z-10 text-violet-700 underline decoration-violet-700/40 underline-offset-4 hover:decoration-violet-700"
                  >
                    {more === 1 ? "1 more new piece" : `${more} more new pieces`}
                  </Link>
                )}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={dismiss}
            tabIndex={tab}
            aria-label="Dismiss"
            className="press absolute right-1 top-1 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-600 transition-colors duration-[180ms] hover:bg-ink-900/5 hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-700"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
