import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:4500/scrollcraft/builds/vivaah/reference.html", { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
const info = await p.evaluate(() => { const v=document.getElementById('thvideo');
  return {readyState:v.readyState, dur:v.duration, w:v.videoWidth, h:v.videoHeight, t:v.currentTime}; });
console.log("video:", JSON.stringify(info));
await p.screenshot({ path: "lab/th-00.png" });
// scrub to ~65% of the threshold
await p.evaluate(() => window.scrollTo(0, document.getElementById('threshold').offsetHeight * 0.62));
await p.waitForTimeout(2000);
const t2 = await p.evaluate(() => document.getElementById('thvideo').currentTime);
console.log("currentTime after scroll:", t2);
await p.screenshot({ path: "lab/th-62.png" });
// the cut into Room I
await p.evaluate(() => document.getElementById('week').scrollIntoView());
await p.waitForTimeout(600);
await p.screenshot({ path: "lab/cut-room1.png" });
await b.close();
