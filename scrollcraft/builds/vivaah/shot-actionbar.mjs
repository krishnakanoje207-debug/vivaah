import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
mkdirSync("lab/actionbar", { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);

const at = async (label, frac) => {
  await p.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), frac);
  await p.waitForTimeout(900);
  const s = await p.evaluate(() => {
    const bar = [...document.querySelectorAll("div")].find(d => d.className?.includes?.("fixed inset-x-0 bottom-0 z-40"));
    const cc = [...document.querySelectorAll("div")].find(d => d.className?.includes?.("fixed inset-x-0 bottom-0 z-50"));
    return { bar: bar ? getComputedStyle(bar).opacity : "absent", cookie: cc ? "up" : "none" };
  });
  console.log(`${label.padEnd(14)} bar opacity=${s.bar}  cookieBanner=${s.cookie}`);
  await p.screenshot({ path: `lab/actionbar/${label}.png` });
};
await at("top", 0);
await at("mid", 0.5);
await at("bottom", 1);
await b.close();
