// /jewellery rebuild: head (arcade, nav scrim), every section, and piece pages.
// Usage: node shots-jewellery.mjs [slug]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT = "lab/jewellery";
mkdirSync(OUT, { recursive: true });
const slug = process.argv[2];
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const errors = [];

async function open(url, w, h, reduced = false) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? "reduce" : "no-preference", isMobile: w < 500, hasTouch: w < 500 });
  await ctx.addInitScript(() => localStorage.setItem("vivaah:consent", JSON.stringify({ analytics: false, at: new Date().toISOString() })));
  const p = await ctx.newPage();
  p.on("console", (m) => m.type() === "error" && errors.push(`${url} ${w}: ${m.text()}`));
  p.on("pageerror", (e) => errors.push(`${url} ${w}: ${e.message}`));
  const res = await p.goto(`http://localhost:3000${url}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(3500);
  return { p, status: res.status() };
}

async function fullSlices(p, name, h) {
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0, k = 0; y < H; y += h, k++) {
    await p.evaluate((y) => scrollTo(0, y), y);
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/${name}-${k}.png` });
  }
  return H;
}

for (const [w, h] of [[1920, 1080], [1440, 900], [390, 844]]) {
  const { p, status } = await open("/jewellery", w, h);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const H = await fullSlices(p, `list-${w}`, h);
  // Nav while the head is part scrolled: is there a ground behind the links?
  await p.evaluate(() => scrollTo(0, 200));
  await p.waitForTimeout(900);
  const nav = await p.evaluate(() => getComputedStyle(document.querySelector("header")).backgroundColor);
  await p.screenshot({ path: `${OUT}/list-${w}-scrolled200.png` });
  console.log(`/jewellery ${w}: status=${status} height=${H} overflowX=${ov} navBg@200=${nav}`);
  await p.close();
}

{
  const { p, status } = await open("/jewellery", 1440, 900, true);
  await p.screenshot({ path: `${OUT}/list-1440-rm.png` });
  console.log(`/jewellery rm: status=${status}`);
  await p.close();
}
{
  const { p, status } = await open("/jewellery?category=bridal#pieces", 1440, 900);
  await p.screenshot({ path: `${OUT}/list-bridal.png` });
  console.log(`/jewellery?category=bridal: status=${status}`);
  await p.close();
}
{
  const { p, status } = await open("/jewellery/no-such-piece", 1440, 900);
  console.log(`/jewellery/no-such-piece: status=${status}`);
  await p.close();
}
if (slug) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { p, status } = await open(`/jewellery/${slug}`, w, h);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const H = await fullSlices(p, `piece-${w}`, h);
    console.log(`/jewellery/${slug} ${w}: status=${status} height=${H} overflowX=${ov}`);
    await p.close();
  }
  const { p } = await open(`/jewellery?category=`, 1440, 900);
  await p.evaluate(() => document.getElementById("pieces").scrollIntoView());
  await p.waitForTimeout(2000);
  await p.screenshot({ path: `${OUT}/list-with-piece.png` });
  await p.close();
}
console.log("errors:", errors.length ? errors : "none");
await b.close();
