/**
 * Evidence for the rail + motion pass (10 Sep 2026).
 *
 * Captures the front door at three widths and in reduced motion, crops the new
 * rail section on its own, and measures the two numbers the navigation argument
 * actually turns on: how tall the page is, and how far down the first bookable
 * garment sits. Those are the before/after that matter — "products are closer"
 * is a claim, "the first card starts at y=Npx" is a measurement.
 *
 *   node shots-rail.mjs        # needs the dev server on :3000 and real Chrome
 *
 * Writes to lab/rail/. Never gates a deploy; site-audit.mjs and
 * hero-scrim-verify.mjs remain the gate.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const OUT = "lab/rail";
mkdirSync(OUT, { recursive: true });

const WIDTHS = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
];

const browser = await chromium.launch({ executablePath: CHROME });
const report = [];

for (const w of WIDTHS) {
  for (const reduced of [false, true]) {
    if (reduced && w.name !== "1920") continue;

    const ctx = await browser.newContext({
      viewport: { width: w.width, height: w.height },
      deviceScaleFactor: 1,
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    const page = await ctx.newPage();

    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    // The preloader owns the first beat; let it finish before measuring.
    await page.waitForTimeout(2200);
    // Scroll the whole page so every Reveal/WipeIn has fired, then return.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(700);

    const tag = `${w.name}${reduced ? "-reduced" : ""}`;
    await page.screenshot({ path: `${OUT}/home-${tag}.png`, fullPage: true });

    // The measurements.
    const m = await page.evaluate(() => {
      const doc = document.documentElement;
      // The first thing on the page that leads to a bookable garment.
      const firstProduct = document.querySelector('a[href^="/rentals/"]');
      const rect = firstProduct?.getBoundingClientRect();
      const railScroller = document.querySelector('ul[class*="snap-x"]');
      return {
        pageHeight: doc.scrollHeight,
        viewportW: window.innerWidth,
        horizontalOverflow: doc.scrollWidth > window.innerWidth,
        scrollWidth: doc.scrollWidth,
        firstProductY: rect ? Math.round(rect.top + window.scrollY) : null,
        firstProductHref: firstProduct?.getAttribute("href") ?? null,
        productLinkCount: document.querySelectorAll('a[href^="/rentals/"]').length,
        railCards: railScroller ? railScroller.children.length : 0,
        railScrollable: railScroller
          ? railScroller.scrollWidth > railScroller.clientWidth
          : false,
      };
    });

    // The rail on its own.
    const rail = page.locator('ul[class*="snap-x"]').first();
    if (await rail.count()) {
      await rail.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      const section = page.locator("section", { has: rail }).first();
      await section.screenshot({ path: `${OUT}/rail-${tag}.png` }).catch(() => {});
    }

    report.push({ tag, ...m, consoleErrors: errors });
    console.log(
      `${tag.padEnd(14)} page=${m.pageHeight}px  firstGarment@y=${m.firstProductY}  ` +
        `railCards=${m.railCards}  scrollable=${m.railScrollable}  ` +
        `overflowX=${m.horizontalOverflow}  errors=${errors.length}`
    );
    await ctx.close();
  }
}

// The comparison page: how far down the collection sits on /rentals.
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/rentals`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const rentals = await page.evaluate(() => {
  const first = document.querySelector('a[href^="/rentals/"]');
  const r = first?.getBoundingClientRect();
  return {
    pageHeight: document.documentElement.scrollHeight,
    firstProductY: r ? Math.round(r.top + window.scrollY) : null,
    productLinkCount: document.querySelectorAll('a[href^="/rentals/"]').length,
  };
});
console.log(
  `\n/rentals        page=${rentals.pageHeight}px  firstGarment@y=${rentals.firstProductY}  ` +
    `productLinks=${rentals.productLinkCount}`
);
report.push({ tag: "rentals-1920", ...rentals });
await ctx.close();

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(`\nWrote ${OUT}/`);
