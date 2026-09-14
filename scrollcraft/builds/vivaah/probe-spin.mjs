import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const reqs = [];
p.on("request", r => { const u = r.url(); if (/lahenga1|ezgif|frame/i.test(u)) reqs.push(u.split("/").pop()); });
await p.goto("http://localhost:3000/rentals/sage-rose", { waitUntil: "networkidle" });
await p.waitForTimeout(4000);
const s = await p.evaluate(() => {
  const el = document.querySelector('[role="slider"], [aria-valuenow]');
  return el ? { now: el.getAttribute("aria-valuenow"), min: el.getAttribute("aria-valuemin"), max: el.getAttribute("aria-valuemax"), label: el.getAttribute("aria-label") } : "no slider";
});
console.log("slider:", JSON.stringify(s));
console.log("first 6 frame requests:", reqs.slice(0,6).join(", "));
console.log("last 3:", reqs.slice(-3).join(", "), " total:", reqs.length);
await b.close();
