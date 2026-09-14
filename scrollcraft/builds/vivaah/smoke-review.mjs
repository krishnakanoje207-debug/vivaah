/**
 * Smoke + design review evidence, 14 Sep 2026.
 * One batched round: every public route at desktop and phone, viewport shots
 * plus a strip of scroll positions, console errors collected per route.
 *   node smoke-review.mjs
 * Writes lab/smoke/. Never a gate.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const OUT = "lab/smoke";
mkdirSync(OUT, { recursive: true });

const ROUTES = ["/", "/rentals", "/rentals/sage-rose", "/retail", "/jewellery", "/visit", "/policies"];
const WIDTHS = [
  { name: "d", width: 1440, height: 900 },
  { name: "m", width: 390, height: 844 },
];

const browser = await chromium.launch({ executablePath: CHROME });
const report = [];

for (const w of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w.width, height: w.height },
    deviceScaleFactor: 1,
  });
  for (const route of ROUTES) {
    const page = await ctx.newPage();
    const errs = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
    page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 160)));
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1800);

    const slug = route === "/" ? "home" : route.replace(/\//g, "_").replace(/^_/, "");
    const h = await page.evaluate(() => document.documentElement.scrollHeight);

    // Four scroll stops across the page, so the whole composition is seen.
    const stops = [0, 0.28, 0.58, 0.88];
    for (let i = 0; i < stops.length; i++) {
      await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), stops[i]);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${OUT}/${w.name}-${slug}-${i}.png` });
    }
    report.push({ w: w.name, route, height: h, errors: errs });
    await page.close();
  }
  await ctx.close();
}

await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
for (const r of report) {
  console.log(`${r.w} ${r.route.padEnd(22)} h=${String(r.height).padStart(6)}  errors=${r.errors.length}`);
  for (const e of r.errors) console.log("    " + e);
}
