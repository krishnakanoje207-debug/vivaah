import { chromium } from "playwright-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = "http://localhost:3000/rentals";
function srgbToLinear(c) { c = c / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function relLum([r, g, b]) { return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b); }
function cr(a, b) { const L1 = relLum(a), L2 = relLum(b); const hi = Math.max(L1, L2), lo = Math.min(L1, L2); return (hi + 0.05) / (lo + 0.05); }
function parseRgbString(s) { const m = s.match(/rgba?\(([^)]+)\)/); return m[1].split(",").map((x) => parseFloat(x.trim())).slice(0, 3); }

const browser = await chromium.launch({ executablePath: CHROME });
const decoder = await browser.newPage();
await decoder.setContent('<canvas id="c"></canvas>');
async function sampleRegion(pngBuffer, rect, expectedFg) {
  const b64 = pngBuffer.toString("base64");
  return decoder.evaluate(async ({ b64, rect, expectedFg }) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const canvas = document.getElementById("c"); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
    const x = Math.max(0, Math.floor(rect.x)), y = Math.max(0, Math.floor(rect.y));
    const w = Math.max(1, Math.min(Math.ceil(rect.width), canvas.width - x));
    const h = Math.max(1, Math.min(Math.ceil(rect.height), canvas.height - y));
    const data = ctx.getImageData(x, y, w, h).data;
    const rs = [], gs = [], bs = []; let exR = 0, exG = 0, exB = 0, exN = 0;
    const dist = (r, g, b) => Math.sqrt((r - expectedFg[0]) ** 2 + (g - expectedFg[1]) ** 2 + (b - expectedFg[2]) ** 2);
    for (let i = 0; i < data.length; i += 4) { const r = data[i], g = data[i + 1], b = data[i + 2]; rs.push(r); gs.push(g); bs.push(b); if (dist(r, g, b) > 55) { exR += r; exG += g; exB += b; exN++; } }
    function median(arr) { const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
    return { median: [median(rs), median(gs), median(bs)], meanExcl: exN > 0 ? [exR / exN, exG / exN, exB / exN] : [median(rs), median(gs), median(bs)] };
  }, { b64, rect, expectedFg });
}

const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto(URL, { waitUntil: "networkidle" });
await d.waitForTimeout(2500);

const vidInfo = await d.evaluate(() => {
  const v = document.querySelector("#threshold video");
  return v ? { src: v.currentSrc.split("/").pop(), readyState: v.readyState } : null;
});
console.log("threshold video on /rentals:", JSON.stringify(vidInfo));

const boundaries = await d.evaluate(() => {
  const ids = ["threshold", "week", "arithmetic", "craft", "collection", "visit"];
  return ids.map((id) => {
    const el = document.getElementById(id);
    if (!el) return { id, missing: true };
    const r = el.getBoundingClientRect();
    return { id, top: window.scrollY + r.top, height: el.offsetHeight, dataDark: el.hasAttribute("data-dark") };
  });
});
console.log("boundaries:", JSON.stringify(boundaries));

async function fineScanThresholdWeek(centerY) {
  console.log(`\n=== FINE SCAN: threshold -> week (5px steps, center ${centerY}) ===`);
  let worst = Infinity, worstRow = null;
  for (let y = centerY - 60; y <= centerY + 60; y += 5) {
    await d.evaluate((yy) => window.scrollTo(0, Math.max(0, yy)), y);
    await d.waitForTimeout(500);
    const info = await d.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Rooms"]');
      const active = nav.querySelector('a[aria-current="true"]');
      const links = Array.from(nav.querySelectorAll("a"));
      const threshLink = links.find((a) => a.textContent.trim() === "Threshold");
      const r = threshLink.getBoundingClientRect();
      return { activeLabel: active ? active.textContent.trim() : null, color: getComputedStyle(threshLink).color, rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
    });
    const fg = parseRgbString(info.color);
    const shot = await d.screenshot({ type: "png", scale: "css" });
    const sample = await sampleRegion(shot, info.rect, fg);
    const crMedian = cr(fg, sample.median);
    const crExcl = cr(fg, sample.meanExcl);
    console.log(`y=${y} active=${info.activeLabel} fg=[${fg}] bgMedian=[${sample.median.map(Math.round)}] bgExcl=[${sample.meanExcl.map((v) => Math.round(v))}] crMedian=${crMedian.toFixed(2)} crExcl=${crExcl.toFixed(2)}`);
    if (crExcl < worst) { worst = crExcl; worstRow = { y, active: info.activeLabel, fg, bg: sample.meanExcl.map(Math.round), crExcl, crMedian }; }
    if (crMedian < worst) { worst = crMedian; }
  }
  console.log("WORST in window:", JSON.stringify(worstRow));
}

async function spotCheckBoundary(centerY, label) {
  console.log(`\n--- spot check: ${label} (center ${centerY}) ---`);
  for (let y = centerY - 30; y <= centerY + 30; y += 10) {
    await d.evaluate((yy) => window.scrollTo(0, Math.max(0, yy)), y);
    await d.waitForTimeout(400);
    const rows = await d.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Rooms"]');
      const active = nav.querySelector('a[aria-current="true"]');
      return Array.from(nav.querySelectorAll("a")).map((a) => {
        const r = a.getBoundingClientRect();
        return { text: a.textContent.trim(), color: getComputedStyle(a).color, rect: { x: r.x, y: r.y, width: r.width, height: r.height }, active: a === active };
      });
    });
    const shot = await d.screenshot({ type: "png", scale: "css" });
    let worst = Infinity, worstLabel = "";
    for (const row of rows) {
      if (row.rect.width <= 0) continue;
      const fg = parseRgbString(row.color);
      const s = await sampleRegion(shot, row.rect, fg);
      const c = cr(fg, s.meanExcl);
      if (c < worst) { worst = c; worstLabel = row.text; }
    }
    console.log(`y=${y} worstLabel=${worstLabel} worstCrExcl=${worst.toFixed(2)}`);
  }
}

const b = Object.fromEntries(boundaries.map((x) => [x.id, x]));
await fineScanThresholdWeek(b.week.top);
await spotCheckBoundary(b.arithmetic.top, "week -> arithmetic");
await spotCheckBoundary(b.craft.top, "arithmetic -> craft");
await spotCheckBoundary(b.collection.top, "craft -> collection");
await spotCheckBoundary(b.visit.top, "collection -> visit (light -> dark, new)");

await d.close();
await browser.close();
