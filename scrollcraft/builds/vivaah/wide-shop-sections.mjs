/**
 * Companion to wide-shop-pages.mjs: one PNG per <section> per width, scaled so
 * every file lands near 1200px wide whatever the viewport. Full-page shots of
 * /rentals are 12,000px tall and unreadable; a section at a time is the unit a
 * composition problem actually lives in.
 *
 *   node wide-shop-sections.mjs /rentals 2560
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const OUT = "lab/wide-shop";

const route = process.argv[2] ?? "/retail";
const widths = process.argv[3] ? [Number(process.argv[3])] : [1440, 1920, 2560, 3840];

const browser = await chromium.launch({ executablePath: CHROME });

for (const width of widths) {
  const dir = `${OUT}/${route.replace(/\//g, "") || "home"}-${width}-sections`;
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width, height: 1200 },
    deviceScaleFactor: Math.min(1, 1200 / width),
  });
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);

  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 700) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(70);
  }
  await page.waitForTimeout(500);

  const sections = await page.$$("section");
  for (let i = 0; i < sections.length; i++) {
    const id = await sections[i].evaluate((s) => s.id || "sec");
    // A section taller than ~4500 CSS px is the catalogue; cap the capture so
    // the file stays legible.
    const box = await sections[i].boundingBox();
    if (!box) continue;
    await sections[i].scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    try {
      await sections[i].screenshot({ path: `${dir}/${String(i).padStart(2, "0")}-${id}.png` });
      console.log(`${dir}/${String(i).padStart(2, "0")}-${id}.png  ${Math.round(box.width)}x${Math.round(box.height)}`);
    } catch (e) {
      console.log(`  skip ${id}: ${e.message.slice(0, 80)}`);
    }
  }
  await ctx.close();
}

await browser.close();
