import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
mkdirSync("lab/closes", { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
for (const r of ["/rentals", "/retail", "/jewellery"]) {
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000" + r, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `lab/closes/${r.slice(1)}.png` });
  await p.close();
}
await b.close();
