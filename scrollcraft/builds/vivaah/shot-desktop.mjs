import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT = "lab/desktop"; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.waitForTimeout(3000);
const h = await p.evaluate(() => document.body.scrollHeight);
// how much of the width is actually used?
const use = await p.evaluate(() => {
  const els = [...document.querySelectorAll("section .shell > *, section .shell")];
  const vw = window.innerWidth;
  const shell = document.querySelector(".shell");
  const r = shell.getBoundingClientRect();
  return { vw, shellW: Math.round(r.width), sideGutter: Math.round(r.left), ratio: +(r.width / vw).toFixed(2) };
});
console.log("height", h, JSON.stringify(use));
for (let i = 0; i < Math.min(6, Math.ceil(h / 1080)); i++) {
  await p.evaluate((y) => window.scrollTo(0, y), i * 1080);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/${String(i).padStart(2, "0")}.png` });
}
await b.close(); console.log("done");
