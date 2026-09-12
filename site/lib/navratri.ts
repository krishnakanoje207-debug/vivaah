import type { Rental } from "@/lib/rentals";

/**
 * Navratri 2026 — the nine nights, and what the site does about them.
 *
 * Sharad Navratri 2026 runs 11–19 October, Dussehra on the 20th. The shop's
 * rental stock for it is ready (owner, 12 Sep 2026).
 *
 * WHAT THIS IS NOT. An earlier draft organised a whole page BY the nine
 * colours, one room per night. The owner corrected it: people do not rent by
 * the day's colour, they rent what they like the look of. So the colours are a
 * HIGHLIGHT LAYER over the ordinary catalogue, never its structure — a piece
 * that happens to match tonight's colour says so, and everything else is
 * browsed exactly as it always was.
 *
 * The other correction that shaped this: a garment is rented for ONE night and
 * a different one for the next, not held across the week. So nothing here
 * offers a multi-night hold; each piece is asked for against a single night.
 *
 * Everything is date-guarded. Before the 11th the site counts down, during the
 * nine nights it names the night, and from the 20th it disappears on its own.
 * Nobody has to remember to take a banner down in November.
 */

export type Night = {
  /** 1–9. */
  n: number;
  /** ISO date, IST. */
  date: string;
  colour: string;
  hex: string;
};

// Day-wise colours for 2026. The order is fixed by the weekday the festival
// opens on, so this list is specific to 2026 and must be re-checked for 2027.
export const NIGHTS: Night[] = [
  { n: 1, date: "2026-10-11", colour: "Orange", hex: "#ff7a1a" },
  { n: 2, date: "2026-10-12", colour: "White", hex: "#ffffff" },
  { n: 3, date: "2026-10-13", colour: "Red", hex: "#d32029" },
  { n: 4, date: "2026-10-14", colour: "Royal Blue", hex: "#1e40af" },
  { n: 5, date: "2026-10-15", colour: "Yellow", hex: "#f4c430" },
  { n: 6, date: "2026-10-16", colour: "Green", hex: "#2e7d32" },
  { n: 7, date: "2026-10-17", colour: "Grey", hex: "#8a8a8a" },
  { n: 8, date: "2026-10-18", colour: "Purple", hex: "#6b2fa0" },
  { n: 9, date: "2026-10-19", colour: "Peacock Green", hex: "#0f7b6c" },
];

export const DUSSEHRA = "2026-10-20";
/** The band is gone from this date on. */
const RETIRE_AFTER = "2026-10-21";

/**
 * Today's date in the shop's own timezone.
 *
 * This is load-bearing, not pedantry. The Worker runs in UTC, and IST is
 * UTC+5:30, so between midnight and 05:30 IST a UTC date is still yesterday —
 * which would have the site naming the wrong night's colour every single
 * morning of the festival, in the hours when someone is deciding what to wear.
 */
export function istDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type NavratriState =
  | { phase: "before"; daysUntil: number; first: Night; last: Night }
  | { phase: "during"; tonight: Night; nightsLeft: number }
  | { phase: "over" };

export function navratriState(now: Date = new Date()): NavratriState {
  const today = istDate(now);
  if (today >= RETIRE_AFTER) return { phase: "over" };

  const tonight = NIGHTS.find((d) => d.date === today);
  if (tonight) {
    return { phase: "during", tonight, nightsLeft: NIGHTS.length - tonight.n };
  }

  // Dussehra itself: the nights are done but the festival week is not, so the
  // band stays up rather than vanishing the morning after the ninth night.
  if (today > NIGHTS[NIGHTS.length - 1].date) {
    return { phase: "during", tonight: NIGHTS[NIGHTS.length - 1], nightsLeft: 0 };
  }

  const days = Math.ceil(
    (Date.parse(`${NIGHTS[0].date}T00:00:00+05:30`) -
      Date.parse(`${today}T00:00:00+05:30`)) /
      86_400_000
  );
  return {
    phase: "before",
    daysUntil: days,
    first: NIGHTS[0],
    last: NIGHTS[NIGHTS.length - 1],
  };
}

/* ---- Colour matching ------------------------------------------------------
   Products carry a real `colour_hex`, so the match is measured rather than
   hand-tagged. Comparison is in HSL, not RGB distance: RGB distance treats a
   pale red and a deep red as far apart while calling a mid-grey and a mid-blue
   close, which is the opposite of how someone picking an outfit sees it.

   Achromatic targets (White, Grey) cannot be matched by hue at all — they have
   none — so they are matched on saturation and lightness instead. */

function toHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

/** Degrees of hue either side of the night's colour that still counts. */
const HUE_TOLERANCE = 24;

/**
 * Chroma (max channel minus min, 0–1) below which a colour is a neutral.
 *
 * This gate is on CHROMA and not on HSL saturation, and the difference is the
 * whole bug it fixes. HSL saturation divides by (1 - |2L - 1|), which collapses
 * toward zero at the light end, so a cream inflates to s=0.36 and reads as a
 * fully chromatic colour. Measured: ivory #efe9dd came out as hue 40° and so
 * matched BOTH Orange and Yellow. Its chroma is 0.07 — it is a near-white, and
 * judged that way it correctly matches White instead.
 */
const NEUTRAL_CHROMA = 0.18;
/** How far a neutral's lightness may sit from the night's and still match. */
const NEUTRAL_L_TOLERANCE = 0.15;

function chroma(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const int = parseInt(m[1], 16);
  const c = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((v) => v / 255);
  return Math.max(...c) - Math.min(...c);
}

/**
 * The ONE night a colour belongs to, or null.
 *
 * Nearest-match, never threshold-match. Several of the nine sit close together
 * — Orange is 24° and Yellow 45°, so any tolerance wide enough to catch a real
 * orange garment also catches yellow — and a piece wearing two "tonight's
 * colour" badges on the same night is obviously broken. Taking the nearest
 * guarantees at most one.
 *
 * A false positive costs more than a miss here: an unmatched piece is simply
 * not highlighted and nobody notices, whereas calling a sage-green lehenga
 * "tonight's grey" is visible and looks foolish. The gates are set accordingly.
 */
export function nightFor(colourHex: string): Night | null {
  const a = toHsl(colourHex);
  if (!a) return null;
  const aNeutral = chroma(colourHex) < NEUTRAL_CHROMA;

  let best: Night | null = null;
  let bestDist = Infinity;

  for (const night of NIGHTS) {
    const b = toHsl(night.hex);
    if (!b) continue;
    const bNeutral = chroma(night.hex) < NEUTRAL_CHROMA;
    // A neutral never claims a hue, and a hue never claims a neutral.
    if (aNeutral !== bNeutral) continue;

    let dist: number;
    if (bNeutral) {
      dist = Math.abs(a.l - b.l);
      if (dist > NEUTRAL_L_TOLERANCE) continue;
      // Keep neutral and hue distances on comparable scales.
      dist *= 100;
    } else {
      const d = Math.abs(a.h - b.h);
      dist = Math.min(d, 360 - d);
      if (dist > HUE_TOLERANCE) continue;
    }

    if (dist < bestDist) {
      bestDist = dist;
      best = night;
    }
  }
  return best;
}

export function matchesNight(colourHex: string, night: Night): boolean {
  return nightFor(colourHex)?.n === night.n;
}

/** The festive badge for a card, or null. Null outside the nine nights. */
export function nightBadge(
  p: Pick<Rental, "colourHex">,
  now: Date = new Date()
): { label: string; hex: string } | null {
  const s = navratriState(now);
  if (s.phase !== "during") return null;
  if (!matchesNight(p.colourHex, s.tonight)) return null;
  return { label: `Tonight's colour · ${s.tonight.colour}`, hex: s.tonight.hex };
}
