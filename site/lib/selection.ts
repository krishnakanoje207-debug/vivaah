"use client";

import { useSyncExternalStore } from "react";

/**
 * The selection — the pieces a visitor is gathering, before she asks for them.
 *
 * Built 14 Sep 2026 on the owner's request for a way to gather several pieces
 * rather than ask about them one at a time. Today a customer who wants three
 * garments sends three separate WhatsApp messages, or sends one and describes
 * the rest from memory.
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
 *   - It holds ONE date, not a date per piece. A customer is dressing for a
 *     day, and the shop's own question is "what day are you dressing for".
 *     Per-item ranges belong to Phase 2's booking engine, which owns the
 *     exclusion constraint that makes them safe; inventing them here would
 *     imply availability nobody has checked.
 *   - Nothing is reserved, held, or priced as a total. A sum would read as an
 *     amount owed, and no amount is owed until the owner confirms and takes the
 *     advance by UPI.
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
  /** The day she is dressing for, as the visitor typed it. Free text on
      purpose: "14 November", "next Saturday" and "Diwali" are all answers the
      shop can work with, and a date picker would demand a precision the
      request does not have. */
  date: string | null;
};

const EMPTY: Selection = { items: [], date: null };

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
          ? {
              items: parsed.items.slice(0, MAX),
              date: typeof parsed.date === "string" ? parsed.date : null,
            }
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

export function setDate(date: string | null) {
  write({ ...read(), date: date && date.trim() ? date.trim() : null });
}

export function clear() {
  write(EMPTY);
}

export const SELECTION_MAX = MAX;
