// Mogra garland behind the /rentals head arcade.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT = "lab/garland";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const errors = [];
for (const [w, h] of [[1920, 1080], [1440, 900], [390, 844]]) {
  for (const reduced of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? "reduce" : "no-preference", isMobile: w < 500, hasTouch: w < 500 });
    await ctx.addInitScript(() => localStorage.setItem("vivaah:consent", JSON.stringify({ analytics: false, at: new Date().toISOString() })));
    const p = await ctx.newPage();
    p.on("console", (m) => m.type() === "error" && errors.push(`${w}: ${m.text()}`));
    p.on("pageerror", (e) => errors.push(`${w}: ${e.message}`));
    await p.goto("http://localhost:3000/rentals", { waitUntil: "networkidle" });
    await p.waitForTimeout(3000);
    const tag = `${w}${reduced ? "-rm" : ""}`;
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await p.screenshot({ path: `${OUT}/${tag}.png` });
    if (!reduced) {
      await p.waitForTimeout(6000);
      await p.screenshot({ path: `${OUT}/${tag}-mid.png` });
    }
    if (w === 390) {
      await p.evaluate(() => scrollTo(0, 380));
      await p.waitForTimeout(900);
      await p.screenshot({ path: `${OUT}/${tag}-arcade.png` });
    }
    console.log(`${tag} overflowX=${ov}`);
    await ctx.close();
  }
}
console.log("errors:", errors.length ? errors : "none");
await b.close();
