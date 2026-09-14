import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });

for (const route of ["/", "/rentals", "/rentals/sage-rose"]) {
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000" + route, { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  const d = await p.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")];
    return {
      imgs: imgs.length,
      noDims: imgs.filter(i => !i.hasAttribute("width") && !i.style.aspectRatio && !getComputedStyle(i).aspectRatio.includes("/")).length,
      lazy: imgs.filter(i => i.loading === "lazy").length,
      cls: performance.getEntriesByType("layout-shift").reduce((s, e) => e.hadRecentInput ? s : s + e.value, 0),
      ttfb: Math.round(performance.getEntriesByType("navigation")[0]?.responseStart ?? 0),
      domLoad: Math.round(performance.getEntriesByType("navigation")[0]?.domContentLoadedEventEnd ?? 0),
    };
  });
  console.log(route.padEnd(22), `imgs=${d.imgs} noExplicitDims=${d.noDims} lazy=${d.lazy} CLS=${d.cls.toFixed(4)} ttfb=${d.ttfb}ms domLoaded=${d.domLoad}ms`);
  await p.close();
}

// How long is the product stage blank before the first frame paints?
const p = await ctx.newPage();
const t0 = Date.now();
await p.goto("http://localhost:3000/rentals/sage-rose", { waitUntil: "domcontentloaded" });
const blankMs = await p.evaluate(() => new Promise(res => {
  const start = performance.now();
  const tick = () => {
    const c = document.querySelector("canvas");
    if (c && parseFloat(getComputedStyle(c).opacity) > 0.5) return res(Math.round(performance.now() - start));
    if (performance.now() - start > 20000) return res(-1);
    requestAnimationFrame(tick);
  };
  tick();
}));
console.log(`product stage blank for ${blankMs}ms after DOM ready (canvas opacity 0 -> visible)`);
await b.close();
