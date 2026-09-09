import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:4500/scrollcraft/builds/vivaah/reference.html", { waitUntil: "networkidle" });
await p.waitForTimeout(800);
console.log(await p.evaluate(() => {
  const d = document.getElementById("draft");
  if (!d) return "NO ELEMENT";
  const r = d.getBoundingClientRect();
  const cs = getComputedStyle(d);
  return { w: r.width, h: r.height, display: cs.display, imgs: d.querySelectorAll("img").length,
           bodyH: document.body.scrollHeight, imgOK: [...document.images].filter(i=>i.naturalWidth>0).length + "/" + document.images.length };
}));
await b.close();
