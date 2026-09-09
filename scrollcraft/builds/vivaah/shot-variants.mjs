import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT="C:/Users/HP/AppData/Local/Temp/claude/D--vivaah-website-preview/25d38e88-31d9-440a-b1e0-47f7aa75c17a/scratchpad/edges";
mkdirSync(OUT,{recursive:true});
const TILE = {
  pinked: { w:32, h:16, d:"M0 16 L0 8 L8 0 L16 8 L24 0 L32 8 L32 16 Z" },
  torn:   { w:480, h:26, d:"M0 26 L0 14 L18 9 L37 15 L58 7 L74 13 L96 6 L118 14 L131 8 L152 16 L173 6 L191 12 L214 5 L232 13 L249 8 L268 15 L289 7 L307 14 L326 6 L344 12 L361 7 L383 15 L402 9 L419 16 L438 8 L456 13 L480 6 L480 26 Z" },
  deckle: { w:320, h:12, d:"M0 12 L0 7 L26 5 L52 8 L79 4 L104 7 L130 5 L157 8 L182 4 L208 7 L234 5 L260 8 L286 4 L320 6 L320 12 Z" },
  pinkedBig: { w:64, h:28, d:"M0 28 L0 14 L16 0 L32 14 L48 0 L64 14 L64 28 Z" },
};
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/rentals", { waitUntil: "networkidle" });
await p.waitForTimeout(2000);
await p.evaluate(() => { const el=document.getElementById("visit"); window.scrollTo(0, el.offsetTop - 200); });
await p.waitForTimeout(800);
for (const [name,t] of Object.entries(TILE)) {
  await p.evaluate(({name,t}) => {
    const edge = document.querySelector("#visit > div[aria-hidden='true']");
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${t.w}' height='${t.h}' viewBox='0 0 ${t.w} ${t.h}'><path d='${t.d}' fill='black'/></svg>`;
    const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    edge.style.top = `${-t.h}px`; edge.style.height = `${t.h}px`;
    edge.style.maskImage = mask; edge.style.webkitMaskImage = mask;
    edge.style.maskSize = `${t.w}px ${t.h}px`; edge.style.webkitMaskSize = `${t.w}px ${t.h}px`;
  }, {name,t});
  await p.waitForTimeout(250);
  const box = await p.evaluate(() => document.getElementById("visit").getBoundingClientRect().top);
  await p.screenshot({ path: `${OUT}/variant-${name}.png`, clip: { x: 0, y: Math.max(0, box-60), width: 1440, height: 130 } });
}
await b.close(); console.log("variants rendered");
