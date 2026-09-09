import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT = "lab/audit"; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const w of [1920, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  // scroll the whole page once so every ScrollTrigger fires and settles
  const h = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 500) { await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(120); }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(1200);
  const n = Math.ceil(h / 1000);
  for (let i = 0; i < n; i++) {
    await p.evaluate((y) => window.scrollTo(0, y), i * 1000);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/w${w}-${String(i).padStart(2, "0")}.png` });
  }
  console.log(w, "height", h, "slices", n, "errors", errs.length ? errs : "none",
    "| hOverflow", await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  await p.close();
}
await b.close(); console.log("done");
