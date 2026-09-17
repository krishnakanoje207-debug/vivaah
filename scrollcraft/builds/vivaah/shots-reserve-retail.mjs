import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = "lab/reserve-retail";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const shots = [
  { name: "retail-head", url: "/reserve?items=lilac-short-kurti", y: 0 },
  { name: "retail-form", url: "/reserve?items=lilac-short-kurti", y: 900 },
  { name: "retail-cal", url: "/reserve?items=lilac-short-kurti", y: 1500 },
  { name: "mixed-form", url: "/reserve?items=sage-rose,lilac-short-kurti", y: 900 },
];
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://localhost:3000${s.url}`, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(3000);
  if (s.y) await page.evaluate((y) => window.scrollTo(0, y), s.y);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`${s.name}  overflow=${over}px errors=${errors.length}`);
  errors.slice(0, 3).forEach((e) => console.log("   ! " + e.slice(0, 200)));
  await page.close();
}
await browser.close();
