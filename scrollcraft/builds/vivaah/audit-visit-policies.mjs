// Render /visit and /policies at 1920, 1440 and 390 and slice each into
// viewport-height frames, so the composition is looked at rather than read as
// markup. 390 uses CDP device emulation: a real sub-500px headless window is
// clamped by the OS and clips the page.
//
// Also reports horizontal overflow (must be 0) and any console/page errors.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const OUT = "lab/visit-policies";
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

const WIDTHS = [
  { w: 1920, h: 1000, mobile: false },
  { w: 1440, h: 900, mobile: false },
  { w: 390, h: 844, mobile: true },
];

for (const route of ["visit", "policies"]) {
  for (const { w, h: vh, mobile } of WIDTHS) {
    const ctx = await b.newContext({
      viewport: { width: w, height: vh },
      deviceScaleFactor: mobile ? 2 : 1,
      isMobile: mobile,
      hasTouch: mobile,
    });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
    p.on("console", (m) => {
      if (m.type() === "error") errs.push(`console: ${m.text()}`);
    });

    await p.goto(`http://localhost:3000/${route}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);

    // Scroll the whole page once so every ScrollTrigger fires and settles.
    const height = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < height; y += 400) {
      await p.evaluate((v) => window.scrollTo(0, v), y);
      await p.waitForTimeout(90);
    }
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(900);

    const overflow = await p.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );

    const n = Math.ceil(height / vh);
    for (let i = 0; i < n; i++) {
      await p.evaluate((y) => window.scrollTo(0, y), i * vh);
      await p.waitForTimeout(450);
      await p.screenshot({
        path: `${OUT}/${route}-${w}-${String(i).padStart(2, "0")}.png`,
      });
    }

    console.log(
      `${route} @${w}  height ${height}  slices ${n}  hOverflow ${overflow}  errors ${
        errs.length ? JSON.stringify(errs) : "none"
      }`
    );
    await ctx.close();
  }
}

await b.close();
console.log("done");
