import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT="lab/wide"; mkdirSync(OUT,{recursive:true});
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const w of [2560, 3840]) {
  for (const r of ["/", "/retail"]) {
    const p = await b.newPage({ viewport: { width: w, height: 1200 } });
    await p.goto("http://localhost:3000"+r, { waitUntil: "networkidle" });
    await p.waitForTimeout(2500);
    const m = await p.evaluate(() => {
      const s = document.querySelector(".shell") || document.querySelector(".shell-wide");
      const r2 = s ? s.getBoundingClientRect() : null;
      return { vw: innerWidth, shell: r2 ? Math.round(r2.width) : null,
        gutter: r2 ? Math.round(r2.left) : null,
        pct: r2 ? Math.round(r2.width / innerWidth * 100) : null,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        h: document.body.scrollHeight };
    });
    console.log(w, r, JSON.stringify(m));
    await p.screenshot({ path: `${OUT}/${w}${r.replace('/','_')||'home'}.png` });
    await p.close();
  }
}
await b.close();
