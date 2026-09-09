import { chromium } from "playwright-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ executablePath: CHROME });
const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await d.waitForTimeout(2500);

// Replicate the exact sequence: threshold scroll fractions, then calibration-style
// mutation, then jump straight to vault, exactly as contrast-audit-v3 does.
const travel = await d.evaluate(() => {
  const sec = document.getElementById("threshold");
  return sec.offsetHeight - window.innerHeight;
});
for (const frac of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
  await d.evaluate((y) => window.scrollTo(0, y), travel * frac);
  await d.waitForTimeout(300);
}

// calibration-style mutation (same as calibrateAlpha)
await d.evaluate(() => window.scrollTo(0, 0));
await d.waitForTimeout(300);
await d.evaluate(() => {
  const vid = document.querySelector("#threshold video");
  const img = document.querySelector("#threshold img");
  if (vid) vid.style.opacity = "0";
  if (img) img.style.opacity = "0";
  const sticky = document.querySelector("#threshold > div");
  sticky.style.backgroundColor = "#000000";
});
await d.waitForTimeout(150);
await d.evaluate(() => { document.querySelector("#threshold > div").style.backgroundColor = "#ffffff"; });
await d.waitForTimeout(150);

// now jump straight to vault like measureRoomRail does
const info = await d.evaluate(() => {
  const el = document.getElementById("vault");
  const rect = el.getBoundingClientRect();
  return { top: window.scrollY + rect.top, height: el.offsetHeight, innerHeight: window.innerHeight };
});
console.log("vault info after full sequence:", JSON.stringify(info));

for (const f of [0, 0.5, 0.9]) {
  const y = info.top + f * Math.max(0, info.height - info.innerHeight * 0.3);
  await d.evaluate((yy) => window.scrollTo(0, yy), y);
  await d.waitForTimeout(900);
  const state = await d.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Rooms"]');
    const active = nav.querySelector('a[aria-current="true"]');
    return { activeLabel: active ? active.textContent : null, scrollY: window.scrollY, activeColor: active? getComputedStyle(active).color : null };
  });
  console.log(`f=${f} y=${y}`, JSON.stringify(state));
}

await d.close();
await browser.close();
