import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = "http://localhost:3000/";
const OUT = process.argv[2] || "contrast-out-v2";
mkdirSync(OUT, { recursive: true });

/* ---------------- WCAG math ---------------- */
function srgbToLinear(c) { c = c / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function relLuminance([r, g, b]) { return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b); }
function contrastRatio(a, b) {
  const L1 = relLuminance(a), L2 = relLuminance(b);
  const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}
function hexToRgb(hex) { hex = hex.replace("#", ""); return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]; }
function clamp255(v) { return Math.min(255, Math.max(0, v)); }
function blend(fg, bg, alpha) { return [0, 1, 2].map((i) => alpha * fg[i] + (1 - alpha) * bg[i]); }
function parseRgbString(s) {
  const m = s.match(/rgba?\(([^)]+)\)/);
  const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
  return [parts[0], parts[1], parts[2]];
}
const VIOLET_950 = hexToRgb("#191129");

async function makeDecoder(browser) {
  const p = await browser.newPage();
  await p.setContent('<canvas id="c"></canvas>');
  return p;
}

async function sampleRegion(decoder, pngBuffer, rect, expectedFg) {
  const b64 = pngBuffer.toString("base64");
  return decoder.evaluate(
    async ({ b64, rect, expectedFg }) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b64;
      await img.decode();
      const canvas = document.getElementById("c");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const x = Math.max(0, Math.floor(rect.x));
      const y = Math.max(0, Math.floor(rect.y));
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
      return {
        median: [median(rs), median(gs), median(bs)],
        meanExclGlyph: exN > 0 ? [exR / exN, exG / exN, exB / exN] : [median(rs), median(gs), median(bs)],
        n: rs.length, nExcl: exN,
      };
    },
    { b64, rect, expectedFg }
  );
}

async function getElement(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { rect: { x: r.x, y: r.y, width: r.width, height: r.height }, color: cs.color, opacity: parseFloat(cs.opacity), fontSize: parseFloat(cs.fontSize), text: el.textContent.trim().slice(0, 40) };
  }, selector);
}

async function getAllRailLabels(page) {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('nav[aria-label="Rooms"] a'));
    return links.map((a) => {
      const r = a.getBoundingClientRect();
      const cs = getComputedStyle(a);
      return { rect: { x: r.x, y: r.y, width: r.width, height: r.height }, color: cs.color, opacity: parseFloat(cs.opacity), active: a.getAttribute("aria-current") === "true", label: a.textContent.trim() };
    });
  });
}

async function calibrateAlpha(page, decoder, rect) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const vid = document.querySelector("#threshold video");
    const img = document.querySelector("#threshold img");
    if (vid) vid.style.opacity = "0";
    if (img) img.style.opacity = "0";
    const sticky = document.querySelector("#threshold > div");
    sticky.style.backgroundColor = "#000000";
  });
  await page.waitForTimeout(150);
  const blackBuf = await page.screenshot({ type: "png", scale: "css" });
  const blackSample = await sampleRegion(decoder, blackBuf, rect, [0, 0, 0]);

  await page.evaluate(() => { document.querySelector("#threshold > div").style.backgroundColor = "#ffffff"; });
  await page.waitForTimeout(150);
  const whiteBuf = await page.screenshot({ type: "png", scale: "css" });
  const whiteSample = await sampleRegion(decoder, whiteBuf, rect, [255, 255, 255]);

  const aFromBlack = [0, 1, 2].map((i) => blackSample.median[i] / VIOLET_950[i]);
  const aFromWhite = [0, 1, 2].map((i) => (255 - whiteSample.median[i]) / (255 - VIOLET_950[i]));
  const all = [...aFromBlack, ...aFromWhite].filter((v) => Number.isFinite(v));
  const avgAlpha = all.reduce((a, b) => a + b, 0) / all.length;
  return { alpha: Math.min(1, Math.max(0, avgAlpha)), aFromBlack, aFromWhite, blackSample, whiteSample };
}

async function measureAcrossScroll({ page, decoder, travel, fractions, getDesc, label, out }) {
  for (const frac of fractions) {
    await page.evaluate((y) => window.scrollTo(0, y), travel * frac);
    await page.waitForTimeout(1400);
    const desc = await getDesc();
    if (!desc) { out.push({ label, frac, error: "element not found" }); continue; }
    const list = Array.isArray(desc) ? desc : [desc];
    const shot = await page.screenshot({ type: "png", scale: "css" });
    for (const d of list) {
      if (d.rect.width <= 0 || d.rect.height <= 0) continue;
      const fgColor = parseRgbString(d.color);
      const sample = await sampleRegion(decoder, shot, d.rect, fgColor);
      out.push({
        label: d.label ? `${label}:${d.label}` : label, frac, rect: d.rect, fontSize: d.fontSize, active: d.active,
        cssColor: fgColor, elementOpacity: d.opacity, bgMedian: sample.median, bgMeanExclGlyph: sample.meanExclGlyph,
        nPixels: sample.n, nExcluded: sample.nExcl,
      });
    }
  }
}

// Measure rail labels while parked inside a given room id, at several scroll offsets within that room.
async function measureRoomRail({ page, decoder, roomId, out }) {
  const info = await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { top: window.scrollY + rect.top, height: el.offsetHeight, innerHeight: window.innerHeight };
  }, roomId);
  if (!info) { out.push({ label: `room:${roomId}`, error: "room not found" }); return; }
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const offsets = [0, 0.5, 0.9].map((f) => Math.min(maxScroll, info.top + f * Math.max(0, info.height - info.innerHeight * 0.3)));
  for (const y of offsets) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(900);
    const labels = await getAllRailLabels(page);
    const shot = await page.screenshot({ type: "png", scale: "css" });
    for (const d of labels) {
      if (d.rect.width <= 0 || d.rect.height <= 0) continue;
      const fgColor = parseRgbString(d.color);
      const sample = await sampleRegion(decoder, shot, d.rect, fgColor);
      out.push({
        label: `room:${roomId}:${d.label}`, y, rect: d.rect, active: d.active,
        cssColor: fgColor, elementOpacity: d.opacity, bgMedian: sample.median, bgMeanExclGlyph: sample.meanExclGlyph,
        nPixels: sample.n, nExcluded: sample.nExcl,
      });
    }
  }
}

/* ================= RUN ================= */
const browser = await chromium.launch({ executablePath: CHROME });
const decoder = await makeDecoder(browser);
const FRACTIONS = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

const results = { desktop: [], mobile: [], lightRooms: [], calibration: {} };

/* ---------- DESKTOP 1440x900 ---------- */
{
  const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await d.goto(URL, { waitUntil: "networkidle" });
  await d.waitForTimeout(2500);

  const travel = await d.evaluate(() => {
    const sec = document.getElementById("threshold");
    return sec.offsetHeight - window.innerHeight;
  });
  console.log("desktop travel(px):", travel);

  await measureAcrossScroll({ page: d, decoder, travel, fractions: FRACTIONS, getDesc: () => getElement(d, "#threshold h1"), label: "h1", out: results.desktop });
  await measureAcrossScroll({ page: d, decoder, travel, fractions: FRACTIONS, getDesc: () => getAllRailLabels(d), label: "rail", out: results.desktop });
  await measureAcrossScroll({ page: d, decoder, travel, fractions: FRACTIONS, getDesc: () => getElement(d, "header span.font-display"), label: "nav-brand", out: results.desktop });
  await measureAcrossScroll({ page: d, decoder, travel, fractions: FRACTIONS, getDesc: () => getElement(d, 'header a[href="/rentals"]'), label: "nav-link-rent", out: results.desktop });

  const h1Desc = await getElement(d, "#threshold h1");
  const railDescs = await getAllRailLabels(d);
  const brandDesc = await getElement(d, "header span.font-display");
  const linkDesc = await getElement(d, 'header a[href="/rentals"]');

  results.calibration.desktop = {
    h1: await calibrateAlpha(d, decoder, h1Desc.rect),
    railActive: await calibrateAlpha(d, decoder, railDescs.find((r) => r.active).rect),
    railInactiveWeek: await calibrateAlpha(d, decoder, railDescs.find((r) => !r.active).rect),
    navBrand: await calibrateAlpha(d, decoder, brandDesc.rect),
    navLink: await calibrateAlpha(d, decoder, linkDesc.rect),
  };

  // ---- NEW: rail over the light rooms "week" and "arithmetic" (no scrim there) ----
  await measureRoomRail({ page: d, decoder, roomId: "week", out: results.lightRooms });
  await measureRoomRail({ page: d, decoder, roomId: "arithmetic", out: results.lightRooms });

  await d.close();
}

/* ---------- MOBILE 390x844 (h1 + nav brand only) ---------- */
{
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.goto(URL, { waitUntil: "networkidle" });
  await m.waitForTimeout(2500);

  const travel = await m.evaluate(() => {
    const sec = document.getElementById("threshold");
    return sec.offsetHeight - window.innerHeight;
  });
  console.log("mobile travel(px):", travel);

  await measureAcrossScroll({ page: m, decoder, travel, fractions: FRACTIONS, getDesc: () => getElement(m, "#threshold h1"), label: "h1", out: results.mobile });
  await measureAcrossScroll({ page: m, decoder, travel, fractions: FRACTIONS, getDesc: () => getElement(m, "header span.font-display"), label: "nav-brand", out: results.mobile });

  const h1Desc = await getElement(m, "#threshold h1");
  const brandDesc = await getElement(m, "header span.font-display");
  results.calibration.mobile = {
    h1: await calibrateAlpha(m, decoder, h1Desc.rect),
    navBrand: await calibrateAlpha(m, decoder, brandDesc.rect),
  };

  await m.close();
}

await decoder.close();
await browser.close();

writeFileSync(`${OUT}/raw-results.json`, JSON.stringify(results, null, 2));
console.log("wrote", `${OUT}/raw-results.json`);
