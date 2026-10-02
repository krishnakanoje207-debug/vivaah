/**
 * Analytics consent gate. LAUNCH_CHECKLIST items 17 and 18.
 *
 *   cd site && node scripts/verify-analytics.mjs      # needs the dev server
 *
 * `scripts/verify-privacy.mjs` reads the source and proves `<Analytics />` is
 * written inside `<AnalyticsGate>`. That is not the same as proving the browser
 * never reaches Cloudflare before a visitor has agreed, and this project has
 * already been bitten once by exactly that distinction: the font preload gate
 * passed 8/8 for a day while no page actually asked for a font, because it read
 * the build output instead of the served document (CLAUDE.md, 18 Sep).
 *
 * So this one asks the network. It watches every request the page makes and
 * asserts that nothing reaches a cloudflareinsights.com host until "Accept all"
 * has been clicked, that "Necessary only" keeps it that way across a reload,
 * and that the owner's own admin surface is never counted at all.
 *
 * TWO MODES, and it prints which one it ran in. With NEXT_PUBLIC_CF_BEACON_TOKEN
 * set it exercises the live path: the beacon loads, and the browser reports no
 * CSP violation for either the script or the report it POSTs, which is the only
 * real proof that middleware.ts names the right host.
 *
 * On which: the violation listener is NOT what catches a wrong connect-src.
 * Taking cloudflareinsights.com back out of the policy was tried, and the
 * report simply never happened while `securitypolicyviolation` stayed silent,
 * because the beacon sends it the way beacons do and a refused send raises
 * nothing the document can hear. The check that failed was the one that watches
 * for the request. Keep both, but that is the order of trust.
 *
 * With no token it asserts
 * the designed resting state instead, that consent grants nothing because there
 * is nothing configured to grant. Both are pass conditions; neither is a skip.
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

// The dev server reads .env.local, so that file, not this process, decides
// whether a token is inlined into the bundle under test.
function configuredToken() {
  if (process.env.NEXT_PUBLIC_CF_BEACON_TOKEN) return process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  try {
    const m = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .match(/^\s*NEXT_PUBLIC_CF_BEACON_TOKEN\s*=\s*(.+)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  } catch {
    return "";
  }
}

const TOKEN = configuredToken();
const results = [];
const check = (ok, label, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

const isBeaconHost = (url) => /(^|\.)cloudflareinsights\.com$/.test(new URL(url).hostname);

/** A page, plus a live record of everything it tried to reach and anything the policy refused. */
async function open(browser, route) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const hits = [];
  const violations = [];
  page.on("request", (r) => {
    if (isBeaconHost(r.url())) hits.push(r.url());
  });
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      window.__csp.push(`${e.violatedDirective} blocked ${e.blockedURI}`)
    );
  });
  await page.goto(BASE + route, { waitUntil: "load" });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  return {
    page,
    hits,
    violations,
    async settle() {
      await page.waitForTimeout(1500);
      violations.push(...(await page.evaluate(() => window.__csp ?? [])));
    },
    tag: () => page.locator('script[src*="cloudflareinsights.com"]').count(),
    close: () => ctx.close(),
  };
}

const panel = (page) => page.getByRole("dialog", { name: /cookies on this site/i });

const browser = await chromium.launch({ executablePath: CHROME });

console.log(
  TOKEN
    ? `\nMode: LIVE — a token is configured, so the beacon is expected to load after consent.\n`
    : `\nMode: DARK — no NEXT_PUBLIC_CF_BEACON_TOKEN, so consent must grant nothing.\n`
);

try {
  // ---- 0. DARK: no token, so nothing to ask about (owner's call, 2 Oct 2026) ----
  // lib/analytics.ts keeps the banner, the footer's "Cookie choices" and the
  // gate itself unmounted until a token exists, and /privacy says nothing is
  // counted. Sections 1-3 are the consent flow, which only exists with a token.
  if (!TOKEN) {
    for (const route of ["/", "/reserve", "/privacy"]) {
      const v = await open(browser, route);
      await v.settle();
      check(!(await panel(v.page).isVisible()), `no consent panel on ${route} while nothing is counted`);
      check(
        (await v.page.getByRole("button", { name: /cookie choices/i }).count()) === 0,
        `no "Cookie choices" control on ${route}`,
      );
      check(v.hits.length === 0 && (await v.tag()) === 0, `nothing reaches Cloudflare Analytics from ${route}`, v.hits.join(", "));
      if (route === "/privacy") {
        const body = await v.page.locator("main").innerText();
        check(
          /Nothing on this site counts which pages you open/.test(body) && !/counts page views if you have allowed it/.test(body),
          "/privacy says nothing is counted, and not that it asks",
        );
      }
      await v.close();
    }
  }

  if (TOKEN) {
  // ---- 1. undecided: she is asked, and nothing is counted while she decides ----
  {
    const v = await open(browser, "/");
    await v.settle();
    check(await panel(v.page).isVisible(), "the consent panel is shown to a first-time visitor");
    check(v.hits.length === 0, "nothing reaches Cloudflare Analytics before an answer", v.hits.join(", "));
    check((await v.tag()) === 0, "no beacon tag is in the document before an answer");
    await v.close();
  }

  // ---- 2. "Necessary only" is honoured, and stays honoured across a reload ----
  {
    const v = await open(browser, "/");
    await v.page.getByRole("button", { name: /necessary only/i }).click();
    await v.settle();
    check(v.hits.length === 0, "declining keeps it that way", v.hits.join(", "));
    check(!(await panel(v.page).isVisible()), "the panel closes on a decision");

    v.hits.length = 0;
    await v.page.reload({ waitUntil: "load" });
    await v.settle();
    check(v.hits.length === 0, "a declined choice survives a reload", v.hits.join(", "));
    check(!(await panel(v.page).isVisible()), "and she is not asked again");
    await v.close();
  }

  // ---- 3. "Accept all" ----
  {
    const v = await open(browser, "/");
    await v.page.getByRole("button", { name: /accept all/i }).click();
    await v.settle();
    const tags = await v.tag();

    if (TOKEN) {
      check(tags === 1, "consent loads exactly one beacon", `${tags} tag(s)`);
      check(
        v.hits.some((u) => u.includes("beacon.min.js")),
        "the beacon script is fetched once consent is given",
        v.hits.join(", ") || "no request at all",
      );
      // The whole reason middleware.ts names cloudflareinsights.com.
      const blocked = v.violations.filter((x) => /cloudflareinsights/.test(x));
      check(blocked.length === 0, "the policy admits the beacon and its report", blocked.join(" | "));
      // The report is flushed when the document goes away, not on a timer, so
      // waiting longer never produces it. Measured: the POST to
      // cloudflareinsights.com/cdn-cgi/rum lands when the page is hidden or
      // navigated away from. So do what a visitor does and open a second page.
      await v.page.goto(`${BASE}/visit`, { waitUntil: "load" });
      await v.settle();
      check(
        v.hits.some((u) => u.includes("/cdn-cgi/rum")),
        "the page view is actually reported, to the host connect-src names",
        v.hits.join(", ") || "no report at all",
      );
      // Consent is stored, so the second document counts too without re-asking.
      check(!(await panel(v.page).isVisible()), "and the next page is counted without asking again");
      const blockedAfter = v.violations.filter((x) => /cloudflareinsights/.test(x));
      check(blockedAfter.length === 0, "still no policy violation after the report", blockedAfter.join(" | "));
    }
    await v.close();
  }
  }

  // ---- 4. the owner's own panel is not a measured surface ----
  {
    const v = await open(browser, "/admin/login");
    await v.settle();
    check(!(await panel(v.page).isVisible()), "the consent panel stays off /admin");
    check(v.hits.length === 0, "and /admin is never counted", v.hits.join(", "));
    await v.close();
  }
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (passed !== results.length) {
  console.log("FAILED:");
  for (const r of results.filter((x) => !x.ok)) console.log(`  ${r.label} — ${r.detail}`);
  process.exit(1);
}
