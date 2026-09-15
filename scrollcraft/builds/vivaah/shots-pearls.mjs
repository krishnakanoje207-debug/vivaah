// Pearl strands across the full /jewellery head.  node shots-pearls.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT = "lab/pearls-full";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const errors = [];
const runs = [[2560,1440],[1920,1080],[1440,900],[1280,720],[1024,1366],[768,1024],[600,960],[430,932],[390,844],[360,740],[1440,900,true],[390,844,true]];
for (const [w, h, reduced] of runs) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? "reduce" : "no-preference", isMobile: w < 500, hasTouch: w < 500 });
  await ctx.addInitScript(() => localStorage.setItem("vivaah:consent", JSON.stringify({ analytics: false, at: "x" })));
  const p = await ctx.newPage();
  p.on("console", (m) => m.type() === "error" && errors.push(`${w}: ${m.text()}`));
  p.on("pageerror", (e) => errors.push(`${w}: ${e.message}`));
  await p.goto("http://localhost:3000/jewellery", { waitUntil: "networkidle" });
  await p.waitForTimeout(4000);
  const tag = `${w}x${h}${reduced ? "-rm" : ""}`;
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const sec = await p.evaluate(() => document.querySelector("section[data-dark-hero]").getBoundingClientRect().height);
  await p.screenshot({ path: `${OUT}/${tag}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(sec, 2000) } , fullPage: sec > h });
  if (!reduced && (w === 1440 || w === 390)) {
    await p.waitForTimeout(2600);
    await p.screenshot({ path: `${OUT}/${tag}-later.png` });
  }
  console.log(`${tag} overflowX=${ov} section=${Math.round(sec)}`);
  await ctx.close();
}
console.log("errors:", errors.length ? errors : "none");
await b.close();
