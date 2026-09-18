"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * Cookie consent panel — DESIGN_SPEC_V3 §4.3. MOUNTED 18 Sep 2026, in
 * `SiteChrome`, in the same change that installed Cloudflare Web Analytics.
 *
 * It was built and deliberately left unmounted for four days on the reasoning
 * that the site set no cookie needing consent, so a banner would have
 * advertised tracking that was not happening. Item 18 is what changed that, and
 * the two are mounted as a pair: `components/site/Analytics.tsx` sits inside the
 * `AnalyticsGate` below, so the beacon cannot reach the DOM before an answer.
 *
 * It is a real gate, not a banner:
 *   - `<AnalyticsGate>` renders its children only once analytics consent is
 *     granted, so the script tag physically cannot reach the DOM before then.
 *   - `useConsent()` reads the same store for anything that needs the state.
 *   - Nothing that grants consent is exported. Only a click inside this panel
 *     can write a choice, so no caller can grant it on a visitor's behalf.
 *   - Undecided means denied. Escape, and reloading, both leave it denied.
 */

const KEY = "vivaah:consent";

export type ConsentChoice = { analytics: boolean };

let cached: ConsentChoice | null = null;
let loaded = false;
const listeners = new Set<() => void>();
const openers = new Set<() => void>();

function snapshot(): ConsentChoice | null {
  if (!loaded) {
    loaded = true;
    try {
      const raw = window.localStorage.getItem(KEY);
      // Anything but an explicit `true` reads as no consent.
      cached = raw ? { analytics: JSON.parse(raw)?.analytics === true } : null;
    } catch {
      cached = null; // storage blocked (private mode) → undecided → denied
    }
  }
  return cached;
}

// Server and first hydration render: nobody has consented yet.
function serverSnapshot(): ConsentChoice | null {
  return null;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Hydration gate: false while server-rendering and during hydration, true after.
const neverChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

// Private on purpose. Exporting a setter would let any caller fake a choice.
function record(choice: ConsentChoice) {
  loaded = true;
  cached = choice;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...choice, at: new Date().toISOString() })
    );
  } catch {
    /* storage blocked: the choice holds for this page view only */
  }
  listeners.forEach((fn) => fn());
}

/** The visitor's stored choice, or null while undecided (which means denied). */
export function useConsent(): ConsentChoice | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

/** Wrap the analytics script in this. Nothing inside mounts without consent. */
export function AnalyticsGate({ children }: { children: ReactNode }) {
  return useConsent()?.analytics ? <>{children}</> : null;
}

// Whether the panel is on screen right now. Anything that also wants the
// bottom of the viewport has to know, and "has the visitor consented yet" is
// NOT the same question: this component is not mounted on every surface, and
// where it is absent nobody ever answers, so consent stays null forever. Asking
// that instead would hide the other thing permanently — which is exactly what
// it did to ActionBar on 14 Sep. Defaults to false, so a surface without the
// banner is unaffected.
let panelOpen = false;
const panelListeners = new Set<() => void>();

function subscribePanel(fn: () => void) {
  panelListeners.add(fn);
  return () => {
    panelListeners.delete(fn);
  };
}

function setPanelOpen(v: boolean) {
  if (panelOpen === v) return;
  panelOpen = v;
  panelListeners.forEach((fn) => fn());
}

/** True only while the consent panel is actually displayed. */
export function useCookiePanelOpen(): boolean {
  return useSyncExternalStore(
    subscribePanel,
    () => panelOpen,
    () => false
  );
}

/** Reopens the panel so a visitor can change or withdraw a stored choice. */
export function openCookieConsent() {
  openers.forEach((fn) => fn());
}

// Hard-edged (radius 0) per V3 §4.3 — the one exception to the sitewide
// control radius, because this reads as a legal surface, not a brand surface.
const BTN =
  "inline-flex flex-1 items-center justify-center rounded-none px-5 py-3 " +
  "text-[0.9375rem] font-semibold transition-colors duration-[180ms] ease-out";
// gold-500 / violet-950 is an approved AA pair; hover darkens the gold only
// (keeping violet text: 5.2:1) rather than flipping to porcelain, which fails.
const FILLED = `${BTN} bg-gold-500 text-violet-950 hover:bg-gold-600`;
const GHOST = `${BTN} border border-porcelain-50/30 text-porcelain-50 hover:border-porcelain-50/70 hover:bg-porcelain-50/5`;
const LINK =
  "text-gold-500 underline underline-offset-4 hover:text-porcelain-50 transition-colors duration-[180ms]";

export default function CookieConsent() {
  const consent = useConsent();
  // Storage is read only after hydration, so a returning visitor never sees the
  // panel flash in the server-rendered markup.
  const hydrated = useSyncExternalStore(neverChanges, onClient, onServer);
  const [closed, setClosed] = useState(false);
  const [forced, setForced] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const reopen = () => {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setAnalytics(snapshot()?.analytics ?? false);
      setChoosing(true);
      setClosed(false);
      setForced(true);
    };
    openers.add(reopen);
    return () => {
      openers.delete(reopen);
    };
  }, []);

  const open = hydrated && !closed && (forced || consent === null);

  // Publish it, so whatever else wants this corner of the screen can stand down.
  useEffect(() => {
    setPanelOpen(open);
    return () => setPanelOpen(false);
  }, [open]);

  // Entrance: opacity and transform only, and skipped outright under reduced
  // motion. The panel's resting DOM state is the final state either way, so
  // nothing depends on the animation running.
  useEffect(() => {
    const el = panelRef.current;
    if (!open || !el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(
      [
        { opacity: 0, transform: "translateY(12px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
  }, [open]);

  // Escape hides the panel for this page view and records nothing: consent
  // stays denied and the panel returns on the next load.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // `close` only calls setState and touches refs, so capturing it is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus lands on the dialog when it opens and again when its view changes,
  // so the control that was replaced never leaves focus stranded on <body>.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open, choosing]);

  function close() {
    setChoosing(false);
    setForced(false);
    setClosed(true);
    returnFocus.current?.focus();
    returnFocus.current = null;
  }

  function decide(allowAnalytics: boolean) {
    record({ analytics: allowAnalytics });
    close();
  }

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-body"
      tabIndex={-1}
      className={
        "on-dark fixed inset-x-0 bottom-0 z-50 border-t border-gold-500/40 " +
        "bg-violet-950 p-6 text-porcelain-50 shadow-lift " +
        "md:inset-x-auto md:right-6 md:bottom-6 md:w-[420px] md:border"
      }
    >
      <h2 id="cookie-consent-title" className="text-h3 text-porcelain-50">
        Cookies on this site
      </h2>

      {/* violet-300 on violet-950 measures 7.9:1. */}
      <p
        id="cookie-consent-body"
        className="mt-3 text-[0.9375rem] leading-relaxed text-violet-300"
      >
        We set only what this site needs to work. With your permission we would
        also count which pages are opened, so the shop can see what you look at
        and show more of it. Nothing is counted until you choose.
      </p>

      {choosing && (
        <fieldset className="mt-5 flex flex-col gap-3 border-t border-porcelain-50/15 pt-5">
          <legend className="sr-only">Choose what this site may use</legend>
          <label className="flex items-start gap-3 text-[0.9375rem] text-violet-300">
            <input
              type="checkbox"
              checked
              disabled
              className="mt-1 size-4 shrink-0 accent-gold-500"
            />
            <span>
              Strictly necessary. Keeps the shop&rsquo;s own sign in working. It
              cannot be switched off.
            </span>
          </label>
          <label className="flex items-start gap-3 text-[0.9375rem] text-violet-300">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="mt-1 size-4 shrink-0 accent-gold-500"
            />
            <span>Analytics. Counts page views. Off until you switch it on.</span>
          </label>
        </fieldset>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {choosing ? (
          <button type="button" className={FILLED} onClick={() => decide(analytics)}>
            Save my choices
          </button>
        ) : (
          <button type="button" className={FILLED} onClick={() => decide(true)}>
            Accept all
          </button>
        )}
        <button type="button" className={GHOST} onClick={() => decide(false)}>
          Necessary only
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption">
        {!choosing && (
          <button type="button" className={LINK} onClick={() => setChoosing(true)}>
            Let me choose
          </button>
        )}
        {/* /privacy, not /policies. This said /policies from the day it was
            written, when the privacy clauses were going to be a section of the
            rental terms; they got their own route on 17 Sep and this link was
            never revisited, because nothing rendered it. */}
        <Link href="/privacy" className={LINK}>
          Privacy policy
        </Link>
      </div>
    </div>
  );
}
