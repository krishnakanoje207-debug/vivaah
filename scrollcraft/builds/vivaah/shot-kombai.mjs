import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const DIR = "C:/Users/HP/AppData/Local/Temp/claude/D--vivaah-website-preview/7280cc87-39b4-4eff-9756-470369b3207e/scratchpad/kombai";
const OUT = "lab/kombai"; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const v of ["A", "B"]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto(`file:///${DIR}/variant-${v}.html`, { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  const h = await p.evaluate(() => document.body.scrollHeight);
  console.log(v, "height:", h, "| imgs:", await p.evaluate(() => [...document.images].map(i => i.getAttribute("src")).join(" ")));
  await p.screenshot({ path: `${OUT}/${v}-full.png`, fullPage: true });
  await p.close();
}
await b.close(); console.log("done");
