/**
 * Desktop composition check for /jewellery, /visit and /policies after the
 * `.shell` change (hard 1200px → min(92vw, 1680px); `.shell-wide` → min(94vw,
 * 2100px)).
 *
 *   node wide-three.mjs            # 1440, 1920, 2560, 3840
 *   node wide-three.mjs 2560       # one width
 *
 * Two outputs per route/width:
 *  - a full-page PNG in lab/wide-three (deviceScaleFactor 0.5 so a 3840×7000
 *    page is a readable file rather than a 40MB one),
 *  - a per-section measurement: the union bounding box of the section's own
 *    leaf content as a percentage of the viewport, plus the widest interior
 *    gap between sibling columns on that row. A "dead band" is a wide
 *    container whose content only occupies the middle, or two columns with a
 *    hole between them; both show up here as numbers before they show up in a
 *    screenshot.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const OUT = "lab/wide-three";
const ROUTES = ["/jewellery", "/visit", "/policies"];
const WIDTHS = process.argv[2] ? [Number(process.argv[2])] : [1440, 1920, 2560, 3840];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });

for (const width of WIDTHS) {
  for (const route of ROUTES) {
    const ctx = await browser.newContext({
      viewport: { width, height: 1200 },
      deviceScaleFactor: 0.5,
    });
    const page = await ctx.newPage();
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Scroll the whole page so every ScrollTrigger / Reveal / WipeIn fires and
    // settles, then come back to the top before the full-page shot.
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 600) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(70);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(700);

    const m = await page.evaluate(() => {
      const vw = window.innerWidth;
      // Leaf content only: an element with no element children, or an image.
      // A wrapper div spanning the whole shell says nothing about whether the
      // page actually USES that width; the words and pictures inside it do.
      const leaves = (root) =>
        [...root.querySelectorAll("*")].filter((el) => {
          if (el.tagName === "IMG" || el.tagName === "VIDEO") return true;
          if (el.children.length) return false;
          const t = (el.textContent || "").trim();
          return t.length > 0;
        });

      const sections = [...document.querySelectorAll("main > section, main section")]
        .filter((s) => s.parentElement.closest("section") === null);

      return {
        vw,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        pageHeight: document.body.scrollHeight,
        sections: sections.map((s, i) => {
          const boxes = leaves(s)
            .map((el) => el.getBoundingClientRect())
            .filter((r) => r.width > 2 && r.height > 2);
          if (!boxes.length) return { i, empty: true };
          const left = Math.min(...boxes.map((b) => b.left));
          const right = Math.max(...boxes.map((b) => b.right));
          const sr = s.getBoundingClientRect();

          // Widest interior horizontal gap: sweep the occupied x-intervals of
          // every leaf box and find the largest uncovered run between left and
          // right. That is exactly the "dead band between the columns".
          const iv = boxes
            .map((b) => [Math.max(b.left, left), Math.min(b.right, right)])
            .sort((a, b) => a[0] - b[0]);
          let cursor = left;
          let gap = 0;
          let gapAt = 0;
          for (const [a, b] of iv) {
            if (a > cursor + gap) {
              gap = a - cursor;
              gapAt = cursor;
            }
            cursor = Math.max(cursor, b);
          }

          return {
            i,
            tag: (s.className || "").split(/\s+/).filter((c) => /^bg-/.test(c)).join(",") || "?",
            h: Math.round(sr.height),
            leftPct: Math.round((left / vw) * 100),
            rightPct: Math.round((right / vw) * 100),
            usedPct: Math.round(((right - left) / vw) * 100),
            gap: Math.round(gap),
            gapAtPct: Math.round((gapAt / vw) * 100),
          };
        }),
      };
    });

    console.log(`\n${width} ${route}  overflow=${m.overflow}  height=${m.pageHeight}`);
    for (const s of m.sections) {
      if (s.empty) continue;
      const flag = s.gap >= 120 ? `  <-- ${s.gap}px hole at ${s.gapAtPct}%` : "";
      console.log(
        `  §${s.i} ${String(s.tag).padEnd(22)} h=${String(s.h).padStart(5)}  ` +
          `x ${String(s.leftPct).padStart(2)}%..${String(s.rightPct).padStart(3)}%  ` +
          `used ${String(s.usedPct).padStart(3)}%${flag}`
      );
    }

    const name = `${width}${route.replace(/\//g, "_")}`;
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    await ctx.close();
  }
}

await browser.close();
