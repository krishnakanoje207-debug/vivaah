import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const DIR = "C:/Users/HP/AppData/Local/Temp/claude/D--vivaah-website-preview/7280cc87-39b4-4eff-9756-470369b3207e/scratchpad/kombai";
const OUT = "lab/kombai"; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const v of ["A", "B"]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
  await p.goto(`file:///${DIR}/variant-${v}.html`, { waitUntil: "networkidle" });
  await p.waitForTimeout(2000);
  const h = await p.evaluate(() => document.body.scrollHeight);
  const slices = Math.min(8, Math.ceil(h / 1100));
  for (let i = 0; i < slices; i++) {
    await p.evaluate((y) => window.scrollTo(0, y), i * 1100);
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/${v}-${String(i).padStart(2, "0")}.png` });
  }
  console.log(v, "height", h, "slices", slices);
  await p.close();
}
await b.close(); console.log("done");
