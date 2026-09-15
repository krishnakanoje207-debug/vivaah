// Sakura behind the /retail arcade, and the new-stock notice (API mocked with
// one real slug so the notice has something to announce).
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT = "lab/sakura-notice";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const errors = [];

async function page(vp, { reduced = false, consent = true, mock = false } = {}) {
  const ctx = await b.newContext({ viewport: vp, reducedMotion: reduced ? "reduce" : "no-preference", isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  if (consent) await ctx.addInitScript(() => localStorage.setItem("vivaah:consent", JSON.stringify({ analytics: false, at: new Date().toISOString() })));
  if (mock) {
    await ctx.route("**/api/new-arrivals", (r) => r.fulfill({ json: [
      { slug: "sage-rose", name: "Sage Rose", pricePerDay: 2500, image: "/rentals/lahenga1/frames/000.webp", sample: false, createdAt: new Date(Date.now() - 3600e3).toISOString() },
      { slug: "x2", name: "Second", pricePerDay: 1800, image: null, sample: true, createdAt: new Date().toISOString() },
    ] }));
  }
  const p = await ctx.newPage();
  p.on("console", (m) => m.type() === "error" && errors.push(`${vp.width}: ${m.text()}`));
  p.on("pageerror", (e) => errors.push(`${vp.width}: ${e.message}`));
  return p;
}

for (const [w, h] of [[1920, 1080], [1440, 900], [390, 844]]) {
  for (const reduced of [false, true]) {
    const p = await page({ width: w, height: h }, { reduced });
    await p.goto("http://localhost:3000/retail", { waitUntil: "networkidle" });
    await p.waitForTimeout(4000);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await p.screenshot({ path: `${OUT}/retail-${w}${reduced ? "-rm" : ""}.png` });
    if (w === 390) {
      await p.evaluate(() => scrollTo(0, 600));
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${OUT}/retail-${w}${reduced ? "-rm" : ""}-arcade.png` });
    }
    console.log(`retail ${w}${reduced ? " rm" : ""} overflowX=${ov}`);
    await p.close();
  }
}

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await page({ width: w, height: h }, { mock: true });
  await p.goto("http://localhost:3000/visit", { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await p.evaluate(() => scrollTo(0, innerHeight * 1.2));
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const a = document.querySelector('aside[aria-label="New in the shop"]');
    const bar = [...document.querySelectorAll("div")].find((d) => d.className?.includes?.("fixed inset-x-0 bottom-0 z-40"));
    const ar = a?.getBoundingClientRect(), br = bar?.getBoundingClientRect();
    return { notice: a ? getComputedStyle(a).opacity : "absent", noticeBottom: ar?.bottom, barTop: br && getComputedStyle(bar).opacity !== "0" ? br.top : null };
  });
  console.log(`notice ${w}`, JSON.stringify(r));
  await p.screenshot({ path: `${OUT}/notice-${w}.png` });
  if (w === 1440) {
    await p.keyboard.press("Escape");
    await p.waitForTimeout(600);
    const seen = await p.evaluate(() => localStorage.getItem("vivaah:new-stock-seen"));
    await p.reload({ waitUntil: "networkidle" });
    await p.evaluate(() => scrollTo(0, innerHeight * 1.2));
    await p.waitForTimeout(3000);
    const again = await p.evaluate(() => document.querySelector('aside[aria-label="New in the shop"]') ? "mounted" : "absent");
    console.log(`after Escape seen=${seen} reload=${again}`);
  }
  await p.close();
}
console.log("errors:", errors.length ? errors : "none");
await b.close();
