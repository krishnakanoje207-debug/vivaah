import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = "lab/retail-list";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const shots = [
  { name: "rail-1920", url: "/retail", viewport: { width: 1920, height: 1080 }, y: 980 },
  { name: "filtered-1920", url: "/retail?category=short-kurtis", viewport: { width: 1920, height: 1080 }, y: 900 },
  { name: "filtered-390", url: "/retail?category=short-kurtis", viewport: { width: 390, height: 844 }, y: 700 },
];
for (const s of shots) {
  const page = await browser.newPage({ viewport: s.viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://localhost:3000${s.url}`, { waitUntil: "networkidle", timeout: 120000 });
  if (s.y) await page.evaluate((y) => window.scrollTo(0, y), s.y);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`${s.name}  overflow=${over}px errors=${errors.length}`);
  errors.slice(0, 3).forEach((e) => console.log("   ! " + e.slice(0, 160)));
  await page.close();
}
await browser.close();
