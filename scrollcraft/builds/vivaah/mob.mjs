import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await p.goto("http://localhost:4500/scrollcraft/builds/vivaah/reference.html", { waitUntil: "networkidle" });
await p.waitForTimeout(1000);
const h = await p.evaluate(() => document.documentElement.scrollHeight);
console.log("scrollHeight(css px):", h);
await p.screenshot({ path: "lab/mobile-full.png", fullPage: true });
await b.close();
