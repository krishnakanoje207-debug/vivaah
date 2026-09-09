import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2]; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/rentals", { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
console.log("video:", await p.evaluate(() => document.querySelector("#threshold video")?.currentSrc.split("/").pop()));
console.log("rooms:", await p.evaluate(() => [...document.querySelectorAll("[data-room]")].map(e => e.id).join(", ")));
await p.screenshot({ path: `${OUT}/r-threshold.png` });
for (const id of ["week","arithmetic","craft","collection","visit"]) {
  await p.evaluate((i) => document.getElementById(i)?.scrollIntoView(), id);
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `${OUT}/r-${id}.png` });
}
await p.close();
// filtered view must skip the argument
const f = await b.newPage({ viewport: { width: 1440, height: 900 } });
await f.goto("http://localhost:3000/rentals?category=bridal-lehengas", { waitUntil: "networkidle" });
await f.waitForTimeout(1500);
console.log("filtered has threshold:", await f.evaluate(() => !!document.getElementById("threshold")));
console.log("filtered has rail:", await f.evaluate(() => !!document.querySelector('nav[aria-label="Rooms"]')));
await f.screenshot({ path: `${OUT}/r-filtered.png` });
await b.close(); console.log("ok");
