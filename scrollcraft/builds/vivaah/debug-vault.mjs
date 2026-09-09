import { chromium } from "playwright-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ executablePath: CHROME });
const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await d.waitForTimeout(2500);

const info = await d.evaluate(() => {
  const ids = ["threshold", "week", "arithmetic", "craft", "vault", "rail", "return"];
  return ids.map((id) => {
    const el = document.getElementById(id);
    if (!el) return { id, missing: true };
    const r = el.getBoundingClientRect();
    return { id, offsetTop: window.scrollY + r.top, offsetHeight: el.offsetHeight, dataDark: el.hasAttribute("data-dark") };
  });
});
console.log(JSON.stringify(info, null, 2));

// scroll to vault top precisely and check RoomIndex state
const vault = info.find((i) => i.id === "vault");
await d.evaluate((y) => window.scrollTo(0, y), vault.offsetTop);
await d.waitForTimeout(900);
const state = await d.evaluate(() => {
  const nav = document.querySelector('nav[aria-label="Rooms"]');
  const active = nav.querySelector('a[aria-current="true"]');
  const anyLink = nav.querySelector("a");
  return {
    activeLabel: active ? active.textContent : null,
    activeColor: active ? getComputedStyle(active).color : null,
    inactiveColor: getComputedStyle(nav.querySelectorAll("a")[1]).color,
    scrollY: window.scrollY,
    innerHeight: window.innerHeight,
  };
});
console.log("at vault.offsetTop scroll state:", JSON.stringify(state, null, 2));

await d.close();
await browser.close();
