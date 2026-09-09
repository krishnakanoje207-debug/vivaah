// Slice the two Kombai /retail canvases into readable viewport-height frames so
// the composition can actually be looked at rather than squinted at in one
// 8000px-tall full-page PNG.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const DIR =
  "C:/Users/HP/AppData/Local/Temp/claude/D--vivaah-website-preview/7280cc87-39b4-4eff-9756-470369b3207e/scratchpad/kombai2";
const OUT = "lab/retail-variants";
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

for (const v of ["retail-A", "retail-B"]) {
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  await p.goto(`file:///${DIR}/${v}.html`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  const h = await p.evaluate(() => document.body.scrollHeight);
  const n = Math.ceil(h / 950);
  for (let i = 0; i < n; i++) {
    await p.evaluate((y) => window.scrollTo(0, y), i * 950);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${v}-${String(i).padStart(2, "0")}.png` });
  }
  console.log(v, "height", h, "slices", n);
  await p.close();
}

await b.close();
console.log("done");
