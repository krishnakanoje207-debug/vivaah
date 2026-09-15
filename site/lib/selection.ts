"use client";

import { useSyncExternalStore } from "react";

/**
 * The selection — the pieces a visitor is gathering, before she asks for them.
 *
 * Built 14 Sep 2026 on the owner's request for a way to gather several pieces
 * rather than ask about them one at a time. Before it, a customer who wanted
 * three garments sent three separate WhatsApp messages, or sent one and
 * described the rest from memory. Since Phase 2 the tray hands its rental and
 * jewellery pieces to /reserve as one booking, and its retail pieces to one
 * WhatsApp message, until retail is bookable too (Phase 3).
 *
 * NOT a cart, and not only as a matter of wording. `DESIGN_SPEC_V3` and
 * `KOMBAI_SHARED_CONTRACT` both ban cart/checkout/delivery vocabulary, and
 * site-audit fails the build on it, because the shop posts nothing and takes no
 * payment online: a cart promises a transaction that cannot happen here. What
 * this models is the real thing the shop already does — pieces set aside on a
 * rail while a customer decides, then one conversation about all of them.
 *
 * Consequences of that, which shape the whole module:
 *
 *   - It holds no dates. It held one free-text "what day" until 15 Sep 2026;
 *     dates are now chosen on /reserve, against the exclusion constraint that
 *     makes them safe, and a second, looser answer here would only disagree
 *     with it.
 *   - Nothing is reserved, held, or priced as a total. A sum would read as an
 *     amount owed, and nothing is paid through the site at all
 *     (BOOKING_ENGINE_SPEC_V2 D1): the shop settles everything at the counter.
 *   - It lives in localStorage only. There is no account, no server state, and
 *     no order. It survives a reload on one device and reaches nothing else,
 *     which is exactly what a private shortlist should do.
 *
 * The store is the same `useSyncExternalStore` shape as CookieConsent: one
 * module-level value, a listener set, and a server snapshot that is always
 * empty so the server render and first hydration agree.
 */

const KEY = "vivaah.selection.v1";
const MAX = 12; // a shortlist, not a catalogue; also keeps the message sendable

export type SelectionKind = "rental" | "retail" | "jewellery";

export type SelectionItem = {
  slug: string;
  name: string;
  kind: SelectionKind;
  href: string;
  /** Shown in the tray. Null where the piece has no photograph yet. */
  image: string | null;
  /** Per day for a rental, outright for retail. Null when not published. */
  price: number | null;
};

export type Selection = {
  items: SelectionItem[];
};

const EMPTY: Selection = { items: [] };

let cached: Selection | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function read(): Selection {
  if (!loaded) {
    loaded = true;
    try {
      const raw = window.localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      cached =
        parsed && Array.isArray(parsed.items)
          ? { items: parsed.items.slice(0, MAX) }
          : EMPTY;
    } catch {
      cached = EMPTY; // storage blocked, or someone hand-edited it
    }
  }
  return cached ?? EMPTY;
}

function write(next: Selection) {
  loaded = true;
  cached = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: the selection holds for this page view only */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Always empty on the server and during hydration, so nothing flickers between
// an empty tray and a full one.
const serverSnapshot = () => EMPTY;

/** The current selection. Empty during SSR and the first client render. */
export function useSelection(): Selection {
  return useSyncExternalStore(subscribe, read, serverSnapshot);
}

/** Whether a given piece is already gathered — for the button's own label. */
export function useIsSelected(slug: string): boolean {
  return useSelection().items.some((i) => i.slug === slug);
}

/**
 * Adds a piece, or removes it if it is already there, and reports which it did
 * so the caller can decide whether to fly anything across the screen.
 */
export function toggle(item: SelectionItem): "added" | "removed" | "full" {
  const cur = read();
  if (cur.items.some((i) => i.slug === item.slug)) {
    write({ ...cur, items: cur.items.filter((i) => i.slug !== item.slug) });
    return "removed";
  }
  if (cur.items.length >= MAX) return "full";
  write({ ...cur, items: [...cur.items, item] });
  return "added";
}

export function remove(slug: string) {
  const cur = read();
  write({ ...cur, items: cur.items.filter((i) => i.slug !== slug) });
}

export function clear() {
  write(EMPTY);
}

export const SELECTION_MAX = MAX;
