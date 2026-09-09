import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = "http://localhost:4500/scrollcraft/builds/vivaah/reference.html";
const OUT = "lab";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });

// desktop: full page, plus the peak with the seam dragged
const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto(URL, { waitUntil: "networkidle" });
await d.waitForTimeout(1200);
await d.screenshot({ path: `${OUT}/desktop-full.png`, fullPage: true });

const draft = await d.$("#draft");
await draft.scrollIntoViewIfNeeded();
await d.waitForTimeout(400);
const box = await draft.boundingBox();
await d.screenshot({ path: `${OUT}/peak-default.png` });
// drag the seam to 22% to expose the drawing
await d.mouse.move(box.x + box.width * 0.55, box.y + box.height / 2);
await d.mouse.down();
await d.mouse.move(box.x + box.width * 0.22, box.y + box.height / 2, { steps: 12 });
await d.mouse.up();
await d.waitForTimeout(300);
await d.screenshot({ path: `${OUT}/peak-dragged.png` });
await d.close();

// phone
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await m.goto(URL, { waitUntil: "networkidle" });
await m.waitForTimeout(1200);
await m.screenshot({ path: `${OUT}/mobile-full.png`, fullPage: true });
await m.close();

await browser.close();
console.log("shots written to lab/");
