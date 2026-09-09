import { chromium } from "playwright-core";
const OUT="C:/Users/HP/AppData/Local/Temp/claude/D--vivaah-website-preview/25d38e88-31d9-440a-b1e0-47f7aa75c17a/scratchpad";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.evaluate(() => document.getElementById("craft").scrollIntoView());
await p.waitForTimeout(900);

console.log("svg filters present:", await p.evaluate(() => document.querySelectorAll("filter[id^='distort']").length));
const h = await p.$("#craft h2");
const box = await h.boundingBox();
console.log("heading box:", JSON.stringify(box));

// sweep the pointer fast across the heading, sampling the filter + the map scale
await p.mouse.move(box.x - 40, box.y + box.height/2);
const samples = [];
for (let i = 0; i <= 10; i++) {
  await p.mouse.move(box.x + (box.width * i)/10, box.y + box.height/2 + (i%2?6:-6));
  samples.push(await p.evaluate(() => {
    const el = document.querySelector("#craft h2");
    const map = document.querySelector("filter[id^='distort'] feDisplacementMap");
    return { filter: el.style.filter || getComputedStyle(el).filter, scale: map?.getAttribute("scale") };
  }));
}
console.log(JSON.stringify(samples));
await p.screenshot({ path: `${OUT}/distort-mid.png`, clip: { x: box.x-20, y: box.y-20, width: box.width+60, height: box.height+40 } });
await b.close();
