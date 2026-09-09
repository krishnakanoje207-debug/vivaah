import { chromium } from "playwright-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
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
await d.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await d.waitForTimeout(2500);

const boundaries = await d.evaluate(() => {
  const ids = ["threshold", "week", "arithmetic", "craft", "vault", "rail", "return"];
  return ids.map((id) => {
    const el = document.getElementById(id);
    const r = el.getBoundingClientRect();
    return { id, top: window.scrollY + r.top, height: el.offsetHeight };
  });
});
console.log(JSON.stringify(boundaries));

async function scanAround(centerY, label) {
  console.log(`\n--- scan around ${label} (center ${centerY}) ---`);
  for (let y = centerY - 40; y <= centerY + 40; y += 8) {
    await d.evaluate((yy) => window.scrollTo(0, Math.max(0, yy)), y);
    await d.waitForTimeout(350);
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

await scanAround(boundaries.find((b) => b.id === "craft").top + boundaries.find((b) => b.id === "craft").height, "craft->vault");
const vault = boundaries.find((b) => b.id === "vault");
await scanAround(vault.top + vault.height, "vault->rail(light)");

await d.close();
await browser.close();
