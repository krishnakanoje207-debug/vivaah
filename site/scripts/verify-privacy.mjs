/**
 * Privacy page gate. LAUNCH_CHECKLIST item 15.
 *
 *   cd site && node scripts/verify-privacy.mjs
 *
 * Static source audit. No dev server, no database, no browser.
 *
 * `/privacy` makes factual claims about this codebase: that it sets two cookies
 * and names them, that four keys are kept in the browser, that three companies
 * receive anything, that page views are counted only after a yes, and that
 * there is no payment step. Those were true on the day it was written. The failure mode is that someone adds a
 * fourth storage key or an analytics snippet, nothing looks broken, and the
 * page quietly becomes a false statement about how a shop handles a bride's
 * phone number. That is worse than having no page.
 *
 * So this asserts the code still matches the page, and fails loudly with what
 * changed when it does not. When it fails, the fix is usually to update the
 * page, not to silence the check.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const results = [];
const check = (ok, label, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

// Every .ts/.tsx under app/, components/ and lib/.
const files = [];
for (const dir of ["app", "components", "lib"]) {
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) files.push(p);
    }
  })(path.join(ROOT, dir));
}
const sources = files.map((f) => ({ f: path.relative(ROOT, f), src: readFileSync(f, "utf8") }));
const all = sources.map((s) => s.src).join("\n");
const privacy = readFileSync(path.join(ROOT, "app", "privacy", "page.tsx"), "utf8");

// --- the page exists and is reachable ---------------------------------------
check(privacy.length > 0, "/privacy exists");
check(
  readFileSync(path.join(ROOT, "components", "site", "Footer.tsx"), "utf8").includes('href="/privacy"'),
  "the footer links to it",
);
check(
  readFileSync(path.join(ROOT, "app", "sitemap.ts"), "utf8").includes("/privacy"),
  "the sitemap lists it",
);

// --- claim: the app sets exactly two cookies --------------------------------
// Anything that writes a cookie goes through cookies().set(...). The two names
// are constants, so the check is that no THIRD call site has appeared.
const cookieWrites = sources.flatMap(({ f, src }) =>
  [...src.matchAll(/cookie[sS]tore\.set\(|cookies\(\)\)\.set\(/g)].map(() => f),
);
check(
  cookieWrites.length === 2,
  "the app still writes exactly two cookies",
  cookieWrites.length === 2
    ? cookieWrites.join(", ")
    : `${cookieWrites.length} call sites: ${cookieWrites.join(", ")} — /privacy clause 05 names two`,
);

// --- claim: four things are kept in the browser -----------------------------
const EXPECTED_KEYS = ["vivaah.selection.v1", "vivaah:new-stock-seen", "vivaah:preloader-seen", "vivaah:consent"];
const foundKeys = [...new Set([...all.matchAll(/["'`](vivaah[.:][a-z0-9.:-]+)["'`]/gi)].map((m) => m[1]))].sort();
// Strings shaped like a key that are not browser storage: the HMAC label the
// reminders cron signs with (lib/cronKey.ts), which never leaves the server.
const NOT_STORAGE = ["vivaah:cron:reminders"];
const unexpected = foundKeys.filter((k) => !EXPECTED_KEYS.includes(k) && !NOT_STORAGE.includes(k));
check(
  unexpected.length === 0,
  "no new browser-storage key has appeared",
  unexpected.length ? `unlisted: ${unexpected.join(", ")} — /privacy clause 06 describes ${EXPECTED_KEYS.length}` : foundKeys.join(", "),
);

// --- claim: page views are counted, by one provider, only after a yes -------
// Until 18 September this asserted that NO analytics existed, and the cookie
// banner stayed unmounted on the strength of it. The owner chose Cloudflare Web
// Analytics that day, so the claim the page makes changed, and so does the
// claim worth gating. It is no longer "nothing is counted". It is "one named
// provider counts, and it cannot run before she agrees" — which is a stronger
// thing to hold, because it is the one a wrong refactor quietly breaks.
//
// Every other provider stays banned outright. Two analytics scripts is a
// different privacy policy from one.
const TRACKERS = [
  "googletagmanager", "google-analytics", "gtag(", "plausible.io", "posthog",
  "segment.com", "mixpanel", "usefathom", "matomo", "hotjar", "clarity.ms",
];
const trackersFound = TRACKERS.filter((t) => all.toLowerCase().includes(t.toLowerCase()));
check(trackersFound.length === 0, "no analytics provider beyond the one /privacy names", trackersFound.join(", "));

// The beacon may be referenced from exactly one file. Anything else loading it
// is a second, ungated entry point however carefully the first one is written.
const ANALYTICS_TSX = path.join("components", "site", "Analytics.tsx");
const BEACON = "static.cloudflareinsights.com/beacon.min.js";
const beaconFiles = sources.filter(({ src }) => src.includes(BEACON)).map(({ f }) => f);
check(
  beaconFiles.length === 1 && beaconFiles[0] === ANALYTICS_TSX,
  "the analytics beacon is loaded from exactly one file",
  beaconFiles.length ? beaconFiles.join(", ") : "not found at all — is analytics still installed?",
);

// The load-bearing one. `<Analytics />` must never be rendered except directly
// inside `<AnalyticsGate>`, which returns null until consent is granted. If
// someone hoists it out of the gate to "fix" a missing page view, the beacon
// starts running before anybody has been asked and no page looks broken.
const renders = sources
  .filter(({ f }) => f !== ANALYTICS_TSX)
  .flatMap(({ f, src }) => [...src.matchAll(/<Analytics\b(?!Gate)/g)].map((m) => ({ f, i: m.index })));
const ungated = renders.filter(({ f, i }) => {
  const src = sources.find((s) => s.f === f).src;
  // What stands immediately before the tag must be the gate opening, and
  // nothing else. Whitespace between them is all that is allowed.
  return !/<AnalyticsGate>\s*$/.test(src.slice(Math.max(0, i - 120), i));
});
check(
  renders.length >= 1 && ungated.length === 0,
  "analytics is rendered only inside <AnalyticsGate>",
  renders.length === 0
    ? "nothing renders <Analytics /> at all, so nothing is counted"
    : `${renders.length} render site(s), ${ungated.length} outside the gate` +
      (ungated.length ? `: ${ungated.map((u) => u.f).join(", ")}` : ""),
);

// And the banner that grants that consent has to be mounted, or the gate can
// never open and the panel describing it is never seen.
const consentMounted = sources.some(
  ({ f, src }) => f !== path.join("components", "site", "CookieConsent.tsx") && /<CookieConsent\b/.test(src),
);
check(consentMounted, "the cookie banner is mounted, so consent can be given", `CookieConsent mounted: ${consentMounted}`);

// Withdrawal has to be reachable. `openCookieConsent()` had no caller for four
// days, which meant a stored yes could not be undone without clearing site data.
const reopeners = sources.filter(
  ({ f, src }) => f !== path.join("components", "site", "CookieConsent.tsx") && src.includes("openCookieConsent"),
);
check(reopeners.length >= 1, "something can reopen the panel to withdraw consent", reopeners.map((r) => r.f).join(", "));

// --- claim: nothing is paid online ------------------------------------------
// Payments were retired on 15 September (BOOKING_ENGINE_SPEC_V2). The page says
// no card or UPI detail is ever collected; a reintroduced payment field would
// make that false.
const payFields = sources.flatMap(({ f, src }) =>
  [...src.matchAll(/name=["'](card[a-z]*|cvv|upi|utr|account_?number|ifsc)["']/gi)].map((m) => `${f}: ${m[1]}`),
);
check(payFields.length === 0, "no payment field is collected anywhere", payFields.join(", "));

// --- claim: three processors, plus the map ----------------------------------
// Hosts the SERVER talks to, or the browser is made to load. Links a visitor
// chooses to click (wa.me, instagram) are not processors and are not counted.
const ALLOWED_HOSTS = [
  "api.resend.com",            // clause 04, Resend
  "challenges.cloudflare.com", // clause 04, Cloudflare's bot check
  "maps.google.com",           // clause 04, the map embed
  "www.google.com",            // the same embed, after its redirect
  "static.cloudflareinsights.com", // clause 04, the Web Analytics beacon
  "cloudflareinsights.com",    // clause 04, where it reports the page view
  "developers.cloudflare.com", // a documentation link in a comment
  "vivaah.vivaah.workers.dev", // the site itself
  "wa.me",                     // a link the visitor taps
  "instagram.com",             // a link the visitor taps
  "nextjs.org",                // documentation links in comments
  "fonts.gstatic.com",         // next/font, self-hosted at build time
  "fonts.googleapis.com",
];
const hosts = [...new Set([...all.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)].map((m) => m[1].toLowerCase()))];
const strangers = hosts.filter((h) => !ALLOWED_HOSTS.includes(h));
check(
  strangers.length === 0,
  "no third party beyond the ones /privacy names",
  strangers.length ? `unlisted: ${strangers.join(", ")}` : hosts.length + " known hosts",
);

// --- claim: the two unset facts are still marked unset ----------------------
check(
  /has not set a period yet/.test(privacy),
  "the retention clause still says the period is unset rather than inventing one",
);

// --- house style -------------------------------------------------------------
// Visible copy on this site carries no em dashes (shared contract G.3), and the
// heritage register is banned (memory: shop-story-facts).
const clauses = [...privacy.matchAll(/covers(?:Counting)?:\s*\n?\s*"([^"]+)"/g)].map((m) => m[1]);
check(clauses.length >= 8, "every clause is present", `${clauses.length} clauses`);
check(!clauses.join(" ").includes("—"), "no em dashes in the visible copy");
const BANNED = ["heritage", "timeless", "age-old", "centuries", "artisan", "legacy"];
const banned = BANNED.filter((w) => clauses.join(" ").toLowerCase().includes(w));
check(banned.length === 0, "no heritage register", banned.join(", "));

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (passed !== results.length) {
  console.log("FAILED:");
  for (const r of results.filter((x) => !x.ok)) console.log(`  ${r.label} — ${r.detail}`);
  process.exit(1);
}
