/**
 * Renders the retail product page (Phase 3) for eyeballing: the first screen,
 * where the size is chosen, and the detail act under it.
 *
 *   node shots-retail-piece.mjs [slug]
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const SLUG = process.argv[2] ?? "lilac-short-kurti";
const OUT = "lab/retail-piece";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const shots = [
  { name: "piece-1920", viewport: { width: 1920, height: 1080 }, y: 0 },
  { name: "detail-1920", viewport: { width: 1920, height: 1080 }, y: 1100 },
  { name: "piece-390", viewport: { width: 390, height: 844 }, y: 0 },
  { name: "choice-390", viewport: { width: 390, height: 844 }, y: 760 },
];

for (const s of shots) {
  const page = await browser.newPage({ viewport: s.viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/retail/${SLUG}`, { waitUntil: "networkidle", timeout: 120000 });
  if (s.y) await page.evaluate((y) => window.scrollTo(0, y), s.y);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`${s.name}  ${s.viewport.width}x${s.viewport.height} @ y=${s.y}  overflow=${over}px  errors=${errors.length}`);
  errors.slice(0, 3).forEach((e) => console.log("   ! " + e.slice(0, 160)));
  await page.close();
}
await browser.close();
