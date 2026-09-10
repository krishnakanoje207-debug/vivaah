/**
 * Renders the rebuilt rental product page for eyeballing: the stage at desktop
 * and phone, plus the top of Act 2 where the torn edge meets the first line.
 *
 *   node shots-product.mjs [slug]
 *
 * Real Chrome, not Chromium: the site's film assets are h264.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const SLUG = process.argv[2] ?? "sage-rose";
const OUT = "lab/product";

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });

const shots = [
  { name: "stage-1920", viewport: { width: 1920, height: 1080 }, y: 0 },
  { name: "act2-1920", viewport: { width: 1920, height: 1080 }, y: 1080 },
  { name: "stage-390", viewport: { width: 390, height: 844 }, y: 0 },
  { name: "act2-390", viewport: { width: 390, height: 844 }, y: 844 },
];

for (const s of shots) {
  const page = await browser.newPage({ viewport: s.viewport, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/rentals/${SLUG}`, { waitUntil: "networkidle", timeout: 120000 });
  // The stage autoplays a swing; hold still so the shot is deterministic.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  if (s.y) await page.evaluate((y) => window.scrollTo(0, y), s.y);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
  console.log(`${s.name}  ${s.viewport.width}x${s.viewport.height} @ y=${s.y}`);
  await page.close();
}

// Overflow check at phone width: nothing may scroll sideways.
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`${BASE}/rentals/${SLUG}`, { waitUntil: "networkidle", timeout: 120000 });
const overflow = await page.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1)) {
      bad.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 60)} right=${Math.round(r.right)}`);
    }
  }
  return {
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    offenders: bad.slice(0, 8),
  };
});
console.log("\n390px overflow:", JSON.stringify(overflow, null, 2));
await page.close();

await browser.close();
