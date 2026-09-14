import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
mkdirSync("lab/tray", { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const [w,h,tag] of [[1440,900,"desktop"],[390,844,"phone"]]) {
  const p = await (await b.newContext({ viewport:{width:w,height:h} })).newPage();
  await p.goto("http://localhost:3000/rentals", { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  // gather two pieces
  const btns = p.locator('button[aria-label^="Add "]');
  const n = Math.min(await btns.count(), 2);
  for (let i=0;i<n;i++){ await btns.nth(i).scrollIntoViewIfNeeded(); await btns.nth(i).click(); await p.waitForTimeout(1400); }
  await p.locator('button[aria-label^="Your selection"]').click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: `lab/tray/${tag}.png` });
  const href = await p.locator('a:has-text("Send this request")').getAttribute("href");
  console.log(tag, "->", decodeURIComponent(href||"(none)").slice(0,150));
  await p.close();
}
await b.close();
