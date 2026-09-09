import { chromium } from "playwright-core";
const OUT="C:/Users/HP/AppData/Local/Temp/claude/D--vivaah-website-preview/25d38e88-31d9-440a-b1e0-47f7aa75c17a/scratchpad/edges";
import { mkdirSync } from "node:fs"; mkdirSync(OUT,{recursive:true});
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/rentals", { waitUntil: "networkidle" });
await p.waitForTimeout(2000);
// the craft -> visit style boundaries: capture a tight band around each edge
for (const id of ["arithmetic","craft","collection","visit"]) {
  await p.evaluate((i) => { const el=document.getElementById(i); window.scrollTo(0, el.offsetTop - 220); }, id);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/edge-${id}.png`, clip: { x: 0, y: 140, width: 1440, height: 220 } });
}
await b.close(); console.log("edge shots done");
