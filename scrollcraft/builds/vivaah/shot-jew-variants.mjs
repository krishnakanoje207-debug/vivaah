import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

// The extracted canvases carry Tailwind CLASSES but no Tailwind runtime, so they
// render unstyled unless the play CDN is injected before the screenshot.
const DIR = "C:/Users/HP/AppData/Local/Temp/claude/D--vivaah-website-preview/7280cc87-39b4-4eff-9756-470369b3207e/scratchpad/kombai2";
const OUT = "lab/jew-variants";
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const v of ["A", "B"]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
  await p.goto(pathToFileURL(`${DIR}/tw-${v}.html`).href, { waitUntil: "networkidle" });
  await p.waitForTimeout(3000);
  const h = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 600) { await p.evaluate((q) => window.scrollTo(0, q), y); await p.waitForTimeout(90); }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(800);
  const n = Math.min(Math.ceil(h / 1100), 16);
  for (let i = 0; i < n; i++) {
    await p.evaluate((y) => window.scrollTo(0, y), i * 1100);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${v}-${String(i).padStart(2, "0")}.png` });
  }
  console.log(v, "height", h, "slices", n);
  await p.close();
}
await b.close();
console.log("done");
