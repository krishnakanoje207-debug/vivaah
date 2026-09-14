import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
mkdirSync("lab/flight", { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", e => errs.push(String(e).slice(0,200)));
p.on("console", m => { if (m.type()==="error") errs.push(m.text().slice(0,200)); });

await p.goto("http://localhost:3000/rentals", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
// scroll the collection into view and press the first gather control
const btn = p.locator('button[aria-label^="Add "]').first();
await btn.scrollIntoViewIfNeeded();
await p.waitForTimeout(600);
await p.screenshot({ path: "lab/flight/0-before.png" });
await btn.click();
for (const t of [120, 330, 620, 1000]) {
  await p.waitForTimeout(t === 120 ? 120 : 200);
  await p.screenshot({ path: `lab/flight/t-${t}.png` });
}
await p.waitForTimeout(900);
const state = await p.evaluate(() => ({
  stray: document.querySelectorAll('div[aria-hidden="true"][style*="z-index:70"]').length,
  stored: JSON.parse(localStorage.getItem("vivaah.selection.v1") || "null"),
  badge: document.querySelector('button[aria-label^="Your selection"]')?.getAttribute("aria-label"),
}));
console.log("after flight:", JSON.stringify(state));
console.log("errors:", errs.length ? errs : "none");
await p.screenshot({ path: "lab/flight/1-after.png" });
await b.close();
