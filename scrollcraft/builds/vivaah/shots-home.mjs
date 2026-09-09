import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = "http://localhost:3000/";
const OUT = process.argv[2] || "shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });

/* ---------- desktop ---------- */
const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto(URL, { waitUntil: "networkidle" });
await d.waitForTimeout(2500);

const vid = await d.evaluate(() => {
  const v = document.querySelector("#threshold video");
  return v ? { readyState: v.readyState, dur: v.duration, w: v.videoWidth, src: v.currentSrc.split("/").pop(), t: v.currentTime } : null;
});
console.log("threshold video:", JSON.stringify(vid));

await d.screenshot({ path: `${OUT}/d-threshold-top.png` });

// scrub 62% through the threshold
await d.evaluate(() => window.scrollTo(0, document.getElementById("threshold").offsetHeight * 0.62));
await d.waitForTimeout(1800);
console.log("currentTime @62%:", await d.evaluate(() => document.querySelector("#threshold video")?.currentTime));
await d.screenshot({ path: `${OUT}/d-threshold-62.png` });

for (const id of ["week", "arithmetic", "craft", "vault", "rail", "return"]) {
  await d.evaluate((i) => document.getElementById(i).scrollIntoView(), id);
  await d.waitForTimeout(1400);
  await d.screenshot({ path: `${OUT}/d-${id}.png` });
}

// the peak, seam dragged left
await d.evaluate(() => document.getElementById("craft").scrollIntoView());
await d.waitForTimeout(900);
const stage = await d.$('[role="slider"]');
const box = await (await d.$("#craft")).boundingBox();
const seamBox = await stage.boundingBox();
await d.mouse.move(seamBox.x + seamBox.width / 2, seamBox.y + seamBox.height / 2);
await d.mouse.down();
await d.mouse.move(box.x + box.width * 0.62, seamBox.y + seamBox.height / 2, { steps: 14 });
await d.mouse.up();
await d.waitForTimeout(400);
await d.screenshot({ path: `${OUT}/d-craft-dragged.png` });

await d.screenshot({ path: `${OUT}/d-full.png`, fullPage: true });
await d.close();

/* ---------- phone ---------- */
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(URL, { waitUntil: "networkidle" });
await m.waitForTimeout(2500);
console.log("mobile src:", await m.evaluate(() => document.querySelector("#threshold video")?.currentSrc.split("/").pop()));
await m.screenshot({ path: `${OUT}/m-threshold.png` });
await m.evaluate(() => document.getElementById("craft").scrollIntoView());
await m.waitForTimeout(1200);
await m.screenshot({ path: `${OUT}/m-craft.png` });
await m.screenshot({ path: `${OUT}/m-full.png`, fullPage: true });
await m.close();

/* ---------- reduced motion ---------- */
const r = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await r.goto(URL, { waitUntil: "networkidle" });
await r.waitForTimeout(2000);
await r.screenshot({ path: `${OUT}/r-threshold.png` });
await r.evaluate(() => document.getElementById("craft").scrollIntoView());
await r.waitForTimeout(900);
await r.screenshot({ path: `${OUT}/r-craft.png` });
await r.screenshot({ path: `${OUT}/r-full.png`, fullPage: true });
console.log("reduced-motion video present:", await r.evaluate(() => !!document.querySelector("#threshold video")));
await r.close();

await browser.close();
console.log("shots written to", OUT);
