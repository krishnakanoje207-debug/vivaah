import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = "http://localhost:3000/";
const OUT = process.argv[2] || "pre";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });

/* first visit of the session */
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: "commit" });
for (const t of [120, 300, 620, 900]) {
  await p.waitForTimeout(t === 120 ? 120 : 0);
  if (t !== 120) await p.waitForTimeout(t - (t === 300 ? 120 : t === 620 ? 300 : 620));
  await p.screenshot({ path: `${OUT}/pre-${t}.png` });
}
await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/pre-after.png` });
console.log("overlay still in DOM after release:", await p.evaluate(() => !!document.querySelector(".vv-preloader")));
console.log("session key:", await p.evaluate(() => sessionStorage.getItem("vivaah:preloader-seen")));
console.log("body scroll restored:", await p.evaluate(() => document.documentElement.style.overflow === ""));

/* second visit in the SAME session: must never appear */
await p.goto(URL, { waitUntil: "commit" });
await p.waitForTimeout(60);
await p.screenshot({ path: `${OUT}/pre-second-60ms.png` });
console.log("second visit skip attr:", await p.evaluate(() => document.documentElement.getAttribute("data-preloader")));
await ctx.close();

/* reduced motion: never appears */
const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const r = await rctx.newPage();
await r.goto(URL, { waitUntil: "commit" });
await r.waitForTimeout(60);
await r.screenshot({ path: `${OUT}/pre-reduced-60ms.png` });
console.log("reduced skip attr:", await r.evaluate(() => document.documentElement.getAttribute("data-preloader")));
await rctx.close();

/* deep link then home in the same session: home must be clean too? (spec: deep link never mounts it) */
const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const d = await dctx.newPage();
await d.goto("http://localhost:3000/rentals", { waitUntil: "commit" });
await d.waitForTimeout(300);
console.log("preloader on deep link:", await d.evaluate(() => !!document.querySelector(".vv-preloader")));
await dctx.close();

await browser.close();
console.log("preloader shots written to", OUT);
