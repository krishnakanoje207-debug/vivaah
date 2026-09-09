import { chromium } from "playwright-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const b = await chromium.launch({ executablePath: CHROME });

// warm the dev compile first
const w = await b.newContext(); const wp = await w.newPage();
await wp.goto("http://localhost:3000/", { waitUntil: "networkidle" }); await w.close();

const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const t0 = Date.now();
await p.goto("http://localhost:3000/", { waitUntil: "commit" });
const log = [];
for (let i = 0; i < 22; i++) {
  const s = await p.evaluate(() => {
    const el = document.querySelector(".vv-preloader");
    if (!el) return { present: false };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { present: true, pos: cs.position, h: Math.round(r.height), w: Math.round(r.width), op: cs.opacity };
  });
  log.push(`${String(Date.now() - t0).padStart(5)}ms ${JSON.stringify(s)}`);
  if (i === 6) await p.screenshot({ path: "C:/Users/HP/AppData/Local/Temp/claude/D--vivaah-website-preview/25d38e88-31d9-440a-b1e0-47f7aa75c17a/scratchpad/pre/probe-mid.png" });
  await p.waitForTimeout(100);
}
console.log(log.join("\n"));
await b.close();
