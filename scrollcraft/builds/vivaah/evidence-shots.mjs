import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = "http://localhost:3000/";
const OUT = process.argv[2] || "evidence";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });

const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto(URL, { waitUntil: "networkidle" });
await d.waitForTimeout(2500);
const travel = await d.evaluate(() => {
  const sec = document.getElementById("threshold");
  return sec.offsetHeight - window.innerHeight;
});
for (const frac of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
  await d.evaluate((y) => window.scrollTo(0, y), travel * frac);
  await d.waitForTimeout(1400);
  await d.screenshot({ path: `${OUT}/desktop-${Math.round(frac * 100)}pct.png`, scale: "css" });
}
await d.close();

const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(URL, { waitUntil: "networkidle" });
await m.waitForTimeout(2500);
const travelM = await m.evaluate(() => {
  const sec = document.getElementById("threshold");
  return sec.offsetHeight - window.innerHeight;
});
for (const frac of [0, 0.4, 1.0]) {
  await m.evaluate((y) => window.scrollTo(0, y), travelM * frac);
  await m.waitForTimeout(1400);
  await m.screenshot({ path: `${OUT}/mobile-${Math.round(frac * 100)}pct.png`, scale: "css" });
}
await m.close();

await browser.close();
console.log("done");
