import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT="lab/wide2"; mkdirSync(OUT,{recursive:true});
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 2560, height: 1200 } });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
const h = await p.evaluate(()=>document.body.scrollHeight);
for (let y=0;y<h;y+=1200){ await p.evaluate(v=>scrollTo(0,v),y); await p.waitForTimeout(500); }
await p.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(800);
for (let i=1;i<Math.min(5,Math.ceil(h/1200));i++){
  await p.evaluate(v=>scrollTo(0,v), i*1200); await p.waitForTimeout(600);
  await p.screenshot({path:`${OUT}/s${i}.png`});
}
console.log("h",h);
await b.close();
