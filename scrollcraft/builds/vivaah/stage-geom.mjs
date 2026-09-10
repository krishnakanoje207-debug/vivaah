/**
 * Measures the stage's box geometry across the widths where the mobile crop
 * hands over to the desktop composition, so a centering bug can be read off
 * numbers instead of guessed from a screenshot.
 *
 *   node stage-geom.mjs
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000/rentals/sage-rose";
const OUT = "lab/product";
mkdirSync(OUT, { recursive: true });

const WIDTHS = [390, 600, 767, 768, 1024];

const browser = await chromium.launch({ executablePath: CHROME });

for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: 970 } });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2000);

  const g = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width),
        h: Math.round(r.height),
        centre: Math.round(r.left + r.width / 2),
      };
    };
    return {
      viewport: window.innerWidth,
      section: pick("section[data-dark-hero]"),
      canvas: pick("section[data-dark-hero] canvas"),
      backdrop: pick("section[data-dark-hero] img[aria-hidden='true']"),
    };
  });

  const c = g.canvas;
  const off = c ? c.centre - Math.round(g.viewport / 2) : null;
  console.log(
    `${String(w).padStart(4)}  canvas ${c ? `${c.w}x${c.h} centre=${c.centre}` : "none"}` +
      `  viewportCentre=${Math.round(g.viewport / 2)}  offset=${off}`
  );

  await page.screenshot({ path: `${OUT}/geom-${w}.png` });
  await page.close();
}

await browser.close();
