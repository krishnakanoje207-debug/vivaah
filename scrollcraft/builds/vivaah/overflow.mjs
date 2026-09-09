import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:4500/scrollcraft/builds/vivaah/reference.html", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
const r = await p.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const bad = [];
  document.querySelectorAll("*").forEach(el => {
    const b = el.getBoundingClientRect();
    if (b.right > vw + 2 || b.left < -2) {
      bad.push({ tag: el.tagName, cls: el.className && String(el.className).slice(0,40),
                 id: el.id, left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width) });
    }
  });
  return { vw, scrollW: document.documentElement.scrollWidth, bodyScrollW: document.body.scrollWidth, bad: bad.slice(0, 12) };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
