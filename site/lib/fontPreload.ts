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
 * WHY THESE TWO AND NOT THE OTHERS. Both are in the first screen: the h1 sets
 * one word in italic (`RippleHeading italic=`), so the roman and the italic are
 * on the same line and either arriving late re-wraps it. The other eight `.p.`
 * files are not preloaded on purpose. Instrument Sans falls back to Arial at
 * size-adjust 102.74%, close enough that it was not among Lighthouse's CLS
 * culprits, and the Devanagari faces are dormant until the EN/हिं toggle ships
 * in Phase 4. Preloading is spending the critical path: these two already cost
 * ~100KB on every route, and the point is to move them earlier, not to drag
 * more along with them.
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
