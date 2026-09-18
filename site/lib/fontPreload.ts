/**
 * The font files the document asks for up front.
 *
 * WHY THIS FILE EXISTS. `next/font` is supposed to emit these links itself: it
 * marks every preloadable subset with a `.p.` in the filename (which is exactly
 * what `75a7cfd2a925650a-s.p.woff2` below is) and then, at render, looks the
 * route up in `.next/server/next-font-manifest.json` to decide what to preload.
 * On this project that manifest is **empty in production**. The Turbopack dev
 * build fills it with twelve routes; `next build --webpack` leaves `app: {}` and
 * `appUsingSizeAdjust: false`, so no route has ever shipped a single
 * `<link rel="preload" as="font">`. The build is on `--webpack` because
 * Turbopack output breaks OpenNext at runtime (see CLAUDE.md), so this is not a
 * flag we can simply drop, and the preload has to be declared by hand until the
 * adapter supports Turbopack.
 *
 * WHAT IT BUYS. The fonts were being discovered only after the render-blocking
 * stylesheet had arrived and been parsed, a second or more after first paint on
 * a throttled phone. Bodoni's fallback is metric-matched but 14% wider per
 * character, so at `--text-threshold` size the hero headline broke its lines in
 * a different place and re-wrapped when the real face landed, moving everything
 * below it. Lighthouse measured that as 0.161 CLS on `/`, in all three runs, to
 * the third decimal (`specs/PERF_PLAN.md` §2.3).
 *
 * WHY THESE TWO AND NOT THE OTHERS. The line above this one used to say that
 * the roman and the italic share the h1's first line, so "either arriving late
 * re-wraps it". Half of that is wrong, and it is wrong in the direction that
 * sends the next reader after the wrong font. Isolated on 18 Sep against the
 * deployed Worker by delaying exactly one file per load and leaving everything
 * else at full speed (`scrollcraft/builds/vivaah/zz-fontdelay.mjs`):
 *
 *   delay Bodoni ROMAN   4s -> CLS 0.1299, hero-copy 420px -> 385px
 *   delay Bodoni ITALIC  4s -> CLS 0.0000
 *   delay Instrument     4s -> CLS 0.0000
 *   nothing delayed         -> CLS 0.0000
 *
 * Only the ROMAN re-wraps the headline. The italic word is short enough that
 * swapping it changes no line break, and Instrument Sans is not in the h1 at
 * all — when Lighthouse names it as a CLS culprit it is listing the fonts that
 * finished near the shift, not the one that caused it.
 *
 * The italic is preloaded anyway, and for a different reason than CLS: it is
 * the accent word in the first screen, and dropping it from this list pushes
 * its arrival from ~2.2s to ~5.5s (median of 12 runs each, 412x915 at 4x CPU
 * and 1.6Mbps), which is three more seconds of that word sitting in a fallback
 * italic. It costs nothing measurable to keep: over those 12 runs a side, CLS
 * appeared in 3/12 loads with both preloaded and 3/12 with the roman alone, and
 * the roman's own arrival was unmoved (mean 2302ms vs 2328ms). Preloading
 * Instrument Sans as well was measured too and was the same again, so it is
 * still left out; the Devanagari faces stay out because they are dormant until
 * the EN/हिं toggle ships in Phase 4.
 *
 * WHAT THE PRELOAD DOES AND DOES NOT FIX. It does not remove the shift, it wins
 * a race: with no font preload at all the hero re-wrapped in 6 loads out of 6,
 * and with the roman preloaded it re-wraps in about 1 in 4. The re-wrap itself
 * is not a font problem. The h1 is capped at `max-w-[17ch]` in app/page.tsx,
 * and `ch` resolves against whichever face is live: 20.30px under Bodoni, so
 * 17ch is 350.5px and the headline sets in 3 lines, but 18.34px under the
 * generated fallback, so the SAME rule computes a 317.4px box and the headline
 * needs 4. Next's metric-matched fallback is doing its job on the glyphs — held
 * at a fixed width the two faces break identically, within 5px of each other —
 * so it is the unit, not the metrics. Until that cap is font-independent this
 * file is the only thing holding the CLS down, and it holds it down by being
 * fast rather than by being correct.
 *
 * THE HASHES ARE CONTENT HASHES, so they survive a rebuild and only change if
 * the font file itself does (a Google Fonts update, or a change to the `axes`,
 * `subsets` or `style` in app/layout.tsx). When that happens the URL below 404s
 * silently and the CLS quietly comes back, which is why
 * `scripts/verify-font-preload.mjs` exists and is a gate.
 */
export const PRELOADED_FONTS = [
  // Bodoni Moda, normal, latin — the face the hero headline is set in.
  "/_next/static/media/75a7cfd2a925650a-s.p.woff2",
  // Bodoni Moda, italic, latin — the accented word inside that same headline.
  "/_next/static/media/f80cb781c460424b-s.p.woff2",
] as const;
