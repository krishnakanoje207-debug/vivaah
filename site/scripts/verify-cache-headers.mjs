/**
 * Cache-header gate. PERF_PLAN 2.6 (the asset lifetimes) and the back/forward
 * cache work of 18 Sep 2026.
 *
 *   BASE=https://vivaah.vivaah.workers.dev node scripts/verify-cache-headers.mjs
 *   BASE=http://127.0.0.1:8788 node scripts/verify-cache-headers.mjs   # wrangler dev
 *
 * IT CANNOT RUN AGAINST `next dev`, and that is not a limitation to work
 * around: `base-server.js` overrides Cache-Control unconditionally in dev, so a
 * dev server answers `no-cache, must-revalidate` on every route no matter what
 * the config says, and a gate pointed at it would pass while production was
 * broken. Point it at a built Worker or at the deployed site.
 *
 * WHAT IT IS GUARDING, and why it is worth a file. Two separate mechanisms land
 * headers on this site and neither is visible in the page:
 *
 *   1. `public/_headers`, read by Workers Assets, which never reaches the
 *      Worker. If OpenNext stops copying it into `.open-next/assets`, or the
 *      file picks up CRLF line endings, every rule silently stops applying and
 *      nothing looks broken — it costs a repeat visitor forty-odd conditional
 *      requests a navigation and shows up nowhere else.
 *
 *   2. The `headers()` rules in `next.config.ts` that take `no-store` off the
 *      nine public catalogue routes so the browser can keep them in the
 *      back/forward cache. That one survives a chain of five steps inside the
 *      adapter and depends on the header key being written lower-case, because
 *      the response object stores its names lower-cased and `Cache-Control`
 *      would land BESIDE the renderer's value rather than replacing it. Two
 *      contradictory headers, bfcache still off, no visible symptom.
 *
 * The half that actually matters for safety is the negative one: `/reserve`,
 * `/booking/*`, `/admin/*` and `/api/*` carry a session, a name or a phone
 * number and must keep `no-store`. A rule whose pattern grew a little too
 * greedy would take it off them, and nothing else in this repo would notice.
 */
const BASE = process.env.BASE ?? "https://vivaah.vivaah.workers.dev";

const results = [];
const check = (ok, label, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

const cacheControl = async (path) => {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return { status: res.status, cc: res.headers.get("cache-control") ?? "" };
};

// The nine the bfcache rules name. Anything a customer browses and walks back
// out of.
const BFCACHE_ROUTES = [
  "/",
  "/rentals",
  "/retail",
  "/jewellery",
  "/visit",
  "/policies",
  "/privacy",
  "/rentals/sage-rose",
];

// Everything that holds a session or a customer's details. `/booking/VVH-0000`
// is a code that does not exist on purpose: the page renders the same either
// way, so it exercises the route without touching a real booking.
const MUST_NOT_STORE = ["/reserve", "/booking/VVH-0000", "/admin/login", "/api/availability?items=sage-rose"];

for (const path of BFCACHE_ROUTES) {
  const { status, cc } = await cacheControl(path);
  if (status >= 400) {
    check(false, `${path} responds`, `HTTP ${status}`);
    continue;
  }
  check(!cc.includes("no-store"), `${path} is allowed into the back/forward cache`, cc || "(no Cache-Control at all)");
  check(
    cc.includes("no-cache") && cc.includes("private"),
    `${path} still revalidates and stays out of shared caches`,
    cc,
  );
}

for (const path of MUST_NOT_STORE) {
  const { status, cc } = await cacheControl(path);
  check(
    cc.includes("no-store"),
    `${path} is still never stored`,
    status >= 500 ? `HTTP ${status} — ${cc}` : cc || "(no Cache-Control at all)",
  );
}

// The asset rules from public/_headers. The hashed build output may be kept for
// a year because a changed file is a changed URL; the photographs may not,
// because their paths are stable and the same URL serves a different garment
// after a redeploy.
const ASSETS = [
  ["/_next/static/", "immutable", "the hashed build output is kept for a year"],
  ["/categories/bridal-lehengas.webp", "max-age=2592000", "a category photograph is kept a month"],
  ["/hero/hero-garden.webp", "max-age=2592000", "the hero photograph is kept a month"],
  ["/og/og-default.jpg", "max-age=86400", "the social card is kept a day"],
  ["/favicon.ico", "max-age=86400", "the favicon is kept a day"],
];

// One real hashed chunk, found from the served markup rather than hard-coded:
// the name changes every build and a stale one here would 404 and pass nothing.
const html = await (await fetch(`${BASE}/`)).text();
const chunk = html.match(/\/_next\/static\/chunks\/[A-Za-z0-9._-]+\.js/)?.[0];
check(Boolean(chunk), "found a hashed chunk in the served markup to test", chunk ?? "none — the markup changed shape");

for (const [path, needle, label] of ASSETS) {
  const target = path === "/_next/static/" ? chunk : path;
  if (!target) continue;
  const { status, cc } = await cacheControl(target);
  check(status === 200 && cc.includes(needle), label, `${target} — ${cc || `HTTP ${status}, no Cache-Control`}`);
}

// Workers Assets reads _headers and does not serve it. If this ever answers
// 200 the rules are being published as a public file instead of applied.
const headersFile = await fetch(`${BASE}/_headers`, { redirect: "manual" });
check(headersFile.status === 404, "/_headers is read by Workers Assets, not served", `HTTP ${headersFile.status}`);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (passed !== results.length) {
  console.log("FAILED:");
  for (const r of results.filter((x) => !x.ok)) console.log(`  ${r.label} — ${r.detail}`);
  process.exit(1);
}
