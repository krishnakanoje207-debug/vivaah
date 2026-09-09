import { chromium } from "playwright-core";
const OUT="C:/Users/HP/AppData/Local/Temp/claude/D--vivaah-website-preview/25d38e88-31d9-440a-b1e0-47f7aa75c17a/scratchpad";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const r of ["rentals","retail","jewellery"]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://localhost:3000/"+r, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  console.log(r, "h1/h2 font:", await p.evaluate(() => {
    const h = document.querySelector("h1,h2");
    return h ? getComputedStyle(h).fontFamily.split(",")[0] : "none";
  }));
  await p.screenshot({ path: `${OUT}/page-${r}.png` });
  await p.close();
}
await b.close();
