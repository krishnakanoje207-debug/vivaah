import { chromium } from "playwright-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
function hexToRgb(hex) { hex = hex.replace("#", ""); return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]; }
function srgbToLinear(c) { c = c / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function relLum([r, g, b]) { return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b); }
function cr(a, b) { const L1 = relLum(a), L2 = relLum(b); const hi = Math.max(L1, L2), lo = Math.min(L1, L2); return (hi + 0.05) / (lo + 0.05); }

const browser = await chromium.launch({ executablePath: CHROME });
const decoder = await browser.newPage();
await decoder.setContent('<canvas id="c"></canvas>');

async function sampleRegion(pngBuffer, rect, expectedFg) {
  const b64 = pngBuffer.toString("base64");
  return decoder.evaluate(async ({ b64, rect, expectedFg }) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const canvas = document.getElementById("c");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const x = Math.max(0, Math.floor(rect.x)), y = Math.max(0, Math.floor(rect.y));
    const w = Math.max(1, Math.min(Math.ceil(rect.width), canvas.width - x));
    const h = Math.max(1, Math.min(Math.ceil(rect.height), canvas.height - y));
    const data = ctx.getImageData(x, y, w, h).data;
    const rs = [], gs = [], bs = [];
    let exR = 0, exG = 0, exB = 0, exN = 0;
    const dist = (r, g, b) => Math.sqrt((r - expectedFg[0]) ** 2 + (g - expectedFg[1]) ** 2 + (b - expectedFg[2]) ** 2);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      rs.push(r); gs.push(g); bs.push(b);
      if (dist(r, g, b) > 55) { exR += r; exG += g; exB += b; exN++; }
    }
    function median(arr) { const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
    return { median: [median(rs), median(gs), median(bs)], meanExcl: exN > 0 ? [exR / exN, exG / exN, exB / exN] : [median(rs), median(gs), median(bs)] };
  }, { b64, rect, expectedFg });
}

const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await d.waitForTimeout(2500);

function parseRgbString(s) { const m = s.match(/rgba?\(([^)]+)\)/); return m[1].split(",").map((x) => parseFloat(x.trim())).slice(0, 3); }

for (let y = 2100; y <= 2220; y += 5) {
  await d.evaluate((yy) => window.scrollTo(0, yy), y);
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
}

await d.close();
await browser.close();
