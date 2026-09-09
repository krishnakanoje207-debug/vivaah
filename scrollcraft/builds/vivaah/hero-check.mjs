import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT="lab/hero"; mkdirSync(OUT,{recursive:true});
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const w of [1440, 1920, 2560]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 } });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  const m = await p.evaluate(() => {
    const img = document.querySelector("section img");
    const r = img.getBoundingClientRect();
    return { natural: img.naturalWidth+"x"+img.naturalHeight,
      rendered: Math.round(r.width)+"x"+Math.round(r.height),
      ratioNat: +(img.naturalWidth/img.naturalHeight).toFixed(3),
      ratioRen: +(r.width/r.height).toFixed(3),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  console.log(w, JSON.stringify(m));
  await p.screenshot({ path: `${OUT}/${w}.png`, fullPage: false });
  await p.close();
}
await b.close();
