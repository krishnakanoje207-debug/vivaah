/**
 * Privacy page gate. LAUNCH_CHECKLIST item 15.
 *
 *   cd site && node scripts/verify-privacy.mjs
 *
 * Static source audit. No dev server, no database, no browser.
 *
 * `/privacy` makes factual claims about this codebase: that it sets two cookies
 * and names them, that four keys are kept in the browser, that three companies
 * receive anything, that there is no analytics and no payment step. Those were
 * true on the day it was written. The failure mode is that someone adds a
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
const unexpected = foundKeys.filter((k) => !EXPECTED_KEYS.includes(k));
check(
  unexpected.length === 0,
  "no new browser-storage key has appeared",
  unexpected.length ? `unlisted: ${unexpected.join(", ")} — /privacy clause 06 describes ${EXPECTED_KEYS.length}` : foundKeys.join(", "),
);

// --- claim: there is no analytics and no tracker ----------------------------
// The page says "no analytics, so there is nothing here to consent to", and the
// cookie banner stays unmounted on the strength of it.
const TRACKERS = [
  "googletagmanager", "google-analytics", "gtag(", "plausible.io", "posthog",
  "segment.com", "mixpanel", "usefathom", "matomo", "cloudflareinsights", "hotjar", "clarity.ms",
];
const trackersFound = TRACKERS.filter((t) => all.toLowerCase().includes(t.toLowerCase()));
check(trackersFound.length === 0, "no analytics or tracking script is installed", trackersFound.join(", "));

// If one ever is, the banner has to be mounted in the same change.
const consentMounted = sources.some(
  ({ f, src }) => f !== path.join("components", "site", "CookieConsent.tsx") && /<CookieConsent\b/.test(src),
);
check(
  trackersFound.length === 0 ? !consentMounted : consentMounted,
  trackersFound.length === 0
    ? "the cookie banner stays unmounted, which is what makes that claim true"
    : "analytics is installed, so the cookie banner must be mounted",
  `CookieConsent mounted: ${consentMounted}`,
);

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
const clauses = [...privacy.matchAll(/covers:\s*\n?\s*"([^"]+)"/g)].map((m) => m[1]);
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
