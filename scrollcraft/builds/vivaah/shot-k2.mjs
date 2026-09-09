import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const DIR = "C:/Users/HP/AppData/Local/Temp/claude/D--vivaah-website-preview/7280cc87-39b4-4eff-9756-470369b3207e/scratchpad/kombai2";
const OUT = "lab/k2"; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const v of ["retail-A","retail-B","jewellery-A","jewellery-B","visit-A","visit-B","policies-A","policies-B"]) {
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  await p.goto(`file:///${DIR}/${v}.html`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  const h = await p.evaluate(() => document.body.scrollHeight);
  await p.screenshot({ path: `${OUT}/${v}.png`, fullPage: h < 9000 });
  console.log(v.padEnd(14), "h", h);
  await p.close();
}
await b.close(); console.log("done");
