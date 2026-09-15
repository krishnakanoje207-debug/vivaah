// Full-bleed mogra garland across the /rentals head.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT = "lab/garland-full";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const errors = [];
const only = process.argv[2];
const sizes = [[2560, 1440], [1920, 1080], [1440, 900], [1280, 720], [768, 1024], [390, 844], [360, 780], [600, 960]];
for (const [w, h] of sizes) {
  if (only && !only.split(",").includes(String(w))) continue;
  for (const reduced of [false, true]) {
    if (reduced && ![1440, 390].includes(w)) continue;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? "reduce" : "no-preference", isMobile: w < 500, hasTouch: w < 500 });
    await ctx.addInitScript(() => localStorage.setItem("vivaah:consent", JSON.stringify({ analytics: false, at: new Date().toISOString() })));
    const p = await ctx.newPage();
    p.on("console", (m) => m.type() === "error" && errors.push(`${w}: ${m.text()}`));
    p.on("pageerror", (e) => errors.push(`${w}: ${e.message}`));
    await p.goto("http://localhost:3000/rentals", { waitUntil: "networkidle" });
    await p.waitForTimeout(3500);
    const tag = `${w}${reduced ? "-rm" : ""}`;
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const head = await p.evaluate(() => { const r = document.getElementById("head").getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; });
    await p.setViewportSize({ width: w, height: Math.max(h, Math.ceil(head.top + head.h)) });
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/${tag}.png`, clip: { x: 0, y: 0, width: w, height: Math.ceil(head.top + head.h) } });
    if (!reduced && (w === 1920 || w === 390)) {
      await p.waitForTimeout(7000);
      await p.screenshot({ path: `${OUT}/${tag}-mid.png`, clip: { x: 0, y: 0, width: w, height: Math.ceil(head.top + head.h) } });
    }
    console.log(`${tag} overflowX=${ov} headH=${Math.round(head.h)}`);
    await ctx.close();
  }
}
console.log("errors:", errors.length ? errors : "none");
await b.close();
