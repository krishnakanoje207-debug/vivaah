import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
mkdirSync("lab/plinth", { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto("http://localhost:3000/rentals/sage-rose", { waitUntil: "networkidle" });
  await p.waitForTimeout(11000); // let the single sweep finish and settle
  await p.screenshot({ path: `lab/plinth/stage-${w}.png` });
  const s = await p.evaluate(() => {
    const el = document.querySelector('[aria-valuenow]');
    return el?.getAttribute("aria-valuenow");
  });
  console.log(`${w}: settled frame = ${s}`);
}
await b.close();
