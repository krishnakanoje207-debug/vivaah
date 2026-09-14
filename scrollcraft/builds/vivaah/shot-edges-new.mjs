import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT = "lab/edges-new"; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.waitForTimeout(2000);
// crop each SectionEdge in place
const boxes = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('div[aria-hidden="true"] > svg').forEach((svg) => {
    const d = svg.parentElement;
    const r = d.getBoundingClientRect();
    if (r.height > 40 && r.width > 600) out.push(Math.round(r.top + window.scrollY));
  });
  return out;
});
console.log("edges at y:", boxes.join(", "));
for (let i = 0; i < boxes.length; i++) {
  await p.evaluate((y) => window.scrollTo(0, y - 300), boxes[i]);
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/edge-${i}.png`, clip: { x: 0, y: 240, width: 1440, height: 220 } });
}
await b.close();
