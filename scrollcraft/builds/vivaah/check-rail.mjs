import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const [w,h,label] of [[390,844,"mobile"],[1024,900,"lg-edge"],[1440,900,"desktop"],[1920,1080,"wide"]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.evaluate(() => document.getElementById("craft").scrollIntoView());
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Rooms"]');
    const vis = nav && getComputedStyle(nav).display !== "none";
    const nb = vis ? nav.getBoundingClientRect() : null;
    // right-most edge of the craft room's content
    const seam = document.querySelector('#craft [role="slider"]')?.closest("div[style]");
    const sb = seam?.getBoundingClientRect();
    return { vis, railLeft: nb ? Math.round(nb.left) : null, contentRight: sb ? Math.round(sb.right) : null };
  });
  console.log(label.padEnd(9), JSON.stringify(r), r.vis && r.contentRight ? (r.railLeft - r.contentRight >= 0 ? "CLEAR by " + (r.railLeft - r.contentRight) + "px" : "OVERLAP " + (r.contentRight - r.railLeft) + "px") : "");
  await p.close();
}
await b.close();
