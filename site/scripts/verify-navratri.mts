/**
 * Navratri logic gate — the festival's behaviour is invisible on any day
 * outside 11–20 Oct 2026, so it cannot be checked by looking at the site.
 *
 *   cd site && npx tsx --env-file=.env.local scripts/verify-navratri.mts
 *
 * Covers the two things that would fail silently and in public: the IST/UTC
 * day boundary (the Worker runs in UTC, IST is +5:30, so between midnight and
 * 05:30 IST a UTC date is still yesterday and the site would name the wrong
 * night's colour every morning of the festival), and the colour matcher, which
 * must give every garment AT MOST ONE night.
 */
import { navratriState, matchesNight, nightBadge, NIGHTS, istDate } from "../lib/navratri.ts";
import { getRentals } from "../lib/rentals.ts";

const show = (label: string, iso: string) => {
  const d = new Date(iso);
  const s = navratriState(d);
  const detail =
    s.phase === "before"
      ? `daysUntil=${s.daysUntil}`
      : s.phase === "during"
        ? `night=${s.tonight.n} ${s.tonight.colour} left=${s.nightsLeft}`
        : "-";
  console.log(`${label.padEnd(34)} IST=${istDate(d)}  ${s.phase.padEnd(7)} ${detail}`);
};

console.log("--- phases ---");
show("today (real clock)", new Date().toISOString());
show("10 Oct 12:00 IST", "2026-10-10T06:30:00Z");
show("11 Oct 00:30 IST (UTC still 10th)", "2026-10-10T19:00:00Z");
show("13 Oct 12:00 IST", "2026-10-13T06:30:00Z");
show("19 Oct 12:00 IST", "2026-10-19T06:30:00Z");
show("20 Oct Dussehra", "2026-10-20T06:30:00Z");
show("21 Oct 00:30 IST", "2026-10-20T19:00:00Z");
show("Nov", "2026-11-05T06:30:00Z");

console.log("\n--- colour matching, every night vs every product ---");
const all = await getRentals();
for (const p of all) {
  const hits = NIGHTS.filter((n) => matchesNight(p.colourHex, n)).map(
    (n) => `${n.n}:${n.colour}`
  );
  console.log(
    `${p.slug.padEnd(20)} ${p.colourName.padEnd(14)} ${p.colourHex}  matches=[${hits.join(", ") || "none"}]`
  );
}

console.log("\n--- badge on night 3 (Red, 13 Oct) ---");
const oct13 = new Date("2026-10-13T06:30:00Z");
for (const p of all) {
  console.log(`${p.slug.padEnd(20)} ${JSON.stringify(nightBadge(p, oct13))}`);
}

console.log("\n--- sanity: known colours ---");
for (const [hex, name] of [
  ["#d32029", "pure red"],
  ["#ff7a1a", "pure orange"],
  ["#ffffff", "white"],
  ["#8a8a8a", "mid grey"],
  ["#191129", "violet-950 (site ink)"],
] as const) {
  const hits = NIGHTS.filter((n) => matchesNight(hex, n)).map((n) => n.colour);
  console.log(`${name.padEnd(22)} ${hex} -> [${hits.join(", ") || "none"}]`);
}
