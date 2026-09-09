/**
 * Desktop composition check for /retail and /rentals after the fluid-shell
 * change (`.shell` min(92vw,1680px), `.shell-wide` min(94vw,2100px)).
 *
 *   node wide-shop-pages.mjs            # both routes, 1440/1920/2560/3840
 *   node wide-shop-pages.mjs /rentals   # one route
 *
 * Real Chrome, not Chromium: the /rentals threshold film is h264.
 *
 * Two outputs.
 *
 *  1. Numbers. Per <section>, the horizontal span actually covered by painted
 *     content (leaf text nodes + images + video), as a percentage of the
 *     viewport, plus the largest interior gap between adjacent content columns.
 *     That gap is the "dead band" this pass exists to kill: a wide container
 *     with a capped element inside it reads as two lonely columns with a hole
 *     between them, and the number finds it without needing an eye.
 *
 *  2. Pictures. One scaled full-page PNG per route per width (device scale
 *     factor set so the file lands near 1400px wide whatever the viewport), so
 *     four widths can be compared side by side and actually looked at.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const OUT = "lab/wide-shop";
const WIDTHS = [1440, 1920, 2560, 3840];
const ROUTES = process.argv[2] ? [process.argv[2]] : ["/retail", "/rentals"];

mkdirSync(OUT, { recursive: true });

const measure = () => {
  const vw = window.innerWidth;

  // Leaves only: a wrapper reports the container's box, which is exactly the
  // lie this script exists to detect.
  const ownsText = (el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

  const boxes = (root) => {
    const out = [];
    for (const el of root.querySelectorAll("*")) {
      const isMedia = el.tagName === "IMG" || el.tagName === "VIDEO" || el.tagName === "CANVAS";
      if (!isMedia && !ownsText(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (parseFloat(cs.opacity) < 0.05) continue;
      if (el.closest("[aria-hidden='true']") && !isMedia) continue;
      if (cs.position === "fixed") continue; // the room index rail is not content
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      out.push([r.left, r.right]);
    }
    return out;
  };

  const report = [];
  for (const s of document.querySelectorAll("section")) {
    const b = boxes(s);
    if (!b.length) continue;
    const left = Math.min(...b.map((x) => x[0]));
    const right = Math.max(...b.map((x) => x[1]));

    // Largest interior hole: sweep the union of the spans and take the biggest
    // uncovered run between left and right.
    const sorted = [...b].sort((a, c) => a[0] - c[0]);
    let cursor = sorted[0][0];
    let hole = 0;
    let holeAt = 0;
    for (const [l, r] of sorted) {
      if (l - cursor > hole) {
        hole = l - cursor;
        holeAt = cursor;
      }
      cursor = Math.max(cursor, r);
    }

    const rect = s.getBoundingClientRect();
    report.push({
      id: s.id || s.className.split(" ").slice(0, 2).join("."),
      h: Math.round(rect.height),
      span: Math.round(right - left),
      pct: Math.round(((right - left) / vw) * 100),
      leftGutter: Math.round(left),
      hole: Math.round(hole),
      holeAt: Math.round(holeAt),
    });
  }

  const rail = document.querySelector('nav[aria-label="Rooms"]');
  const railBox = rail ? rail.getBoundingClientRect() : null;

  return {
    vw,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    height: document.body.scrollHeight,
    rail: railBox && railBox.width ? { left: Math.round(railBox.left), width: Math.round(railBox.width) } : null,
    sections: report,
  };
};

const browser = await chromium.launch({ executablePath: CHROME });

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: 1200 },
      deviceScaleFactor: Math.min(1, 1400 / width),
    });
    const page = await ctx.newPage();
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(1600);

    // Scroll the whole page so every ScrollTrigger fires and settles.
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 700) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(70);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(700);

    const m = await page.evaluate(measure);
    const tag = `${route.replace(/\//g, "") || "home"}-${width}`;
    console.log(`\n### ${route} @ ${width}   overflow=${m.overflow}  height=${m.height}` +
      (m.rail ? `  rail@${m.rail.left}(w${m.rail.width})` : ""));
    for (const s of m.sections) {
      console.log(
        `  ${String(s.id).padEnd(22)} h${String(s.h).padStart(5)}  span ${String(s.span).padStart(5)} = ${String(s.pct).padStart(3)}%` +
          `  gutter ${String(s.leftGutter).padStart(4)}  biggest-hole ${String(s.hole).padStart(4)}${s.hole > 120 ? `  <-- @${s.holeAt}` : ""}`
      );
    }

    await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: true });
    await ctx.close();
  }
}

await browser.close();
