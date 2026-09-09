import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT = "lab/home-new"; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.waitForTimeout(3500);
const h = await p.evaluate(() => document.body.scrollHeight);
console.log("height", h, "| hOverflow", await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
const slices = Math.min(8, Math.ceil(h / 1000));
for (let i = 0; i < slices; i++) {
  await p.evaluate((y) => window.scrollTo(0, y), i * 1000);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/${String(i).padStart(2, "0")}.png` });
}
console.log("errors:", errs.length ? errs.slice(0, 6) : "none");
await b.close(); console.log("done");
