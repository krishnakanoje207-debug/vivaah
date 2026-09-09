// Render audit for /retail. Modelled on audit-home.mjs: real Chrome (not
// Chromium), scroll the whole page once so every ScrollTrigger fires, then slice
// the page into viewport-height frames that can actually be looked at.
//
// 390 goes through CDP device emulation because a true sub-500px headless window
// is clamped by the OS and the shot comes back clipped.
import { chromium, devices } from "playwright-core";
import { mkdirSync } from "node:fs";

const URL = "http://localhost:3000/retail";
const OUT = "lab/retail";
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

const RUNS = [
  { tag: "1920", ctx: { viewport: { width: 1920, height: 1000 } }, slice: 1000 },
  { tag: "1440", ctx: { viewport: { width: 1440, height: 900 } }, slice: 900 },
  {
    tag: "390",
    ctx: {
      ...devices["iPhone 13"],
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    },
    slice: 844,
  },
];

for (const run of RUNS) {
  const p = await b.newPage(run.ctx);
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e.message)));
  p.on("console", (m) => {
    if (m.type() === "error") errs.push("console: " + m.text());
  });

  await p.goto(URL, { waitUntil: "networkidle" });
  await p.waitForTimeout(2200);

  const h = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 400) {
    await p.evaluate((v) => window.scrollTo(0, v), y);
    await p.waitForTimeout(90);
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(1000);

  const overflow = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  // Anything actually sticking out past the viewport, named.
  const wide = await p.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > w + 1 || r.left < -1)) {
        out.push(
          `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} L${Math.round(
            r.left
          )} R${Math.round(r.right)}`
        );
      }
    }
    return out.slice(0, 8);
  });

  const n = Math.ceil(h / run.slice);
  for (let i = 0; i < n; i++) {
    await p.evaluate((y) => window.scrollTo(0, y), i * run.slice);
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/w${run.tag}-${String(i).padStart(2, "0")}.png` });
  }

  // Per-section plates as well as the scroll slices: the nav is sticky and sits
  // over whatever is at the top of a slice, which hides exactly the seam and the
  // first row of every section.
  const secs = await p.$$("main section");
  for (let i = 0; i < secs.length; i++) {
    try {
      await secs[i].scrollIntoViewIfNeeded({ timeout: 5000 });
      await p.waitForTimeout(500);
      await secs[i].screenshot({ path: `${OUT}/w${run.tag}-sec${i}.png` });
    } catch (e) {
      console.log("  section", i, "shot skipped:", String(e).split("\n")[0]);
    }
  }
  await p.evaluate(() => window.scrollTo(0, 0));

  console.log(
    run.tag,
    "| height",
    h,
    "| slices",
    n,
    "| hOverflow",
    overflow,
    "| errors",
    errs.length ? errs : "none",
    wide.length ? "| overflowing: " + wide.join(" ;; ") : ""
  );
  await p.close();
}

await b.close();
console.log("done");
