import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
mkdirSync("lab/webp", { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const w of [[1920,1080],[1440,900],[390,844]]) {
  const p = await (await b.newContext({ viewport: { width: w[0], height: w[1] } })).newPage();
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `lab/webp/hero-${w[0]}.png` });
}
await b.close();
