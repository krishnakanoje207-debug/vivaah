import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT = "lab/verify-0909/edges"; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/rentals", { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
for (const id of ["week","arithmetic","craft","collection","visit"]) {
  await p.evaluate((i) => { const el = document.getElementById(i); window.scrollTo(0, el.offsetTop - 420); }, id);
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `${OUT}/edge-${id}.png`, clip: { x: 0, y: 300, width: 1440, height: 300 } });
}
await b.close(); console.log("done");
