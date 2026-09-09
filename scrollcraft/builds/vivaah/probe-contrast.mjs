import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/visit", { waitUntil: "networkidle" });
await p.waitForTimeout(2000);
const out = await p.evaluate(() => {
  const g = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    let n = el, bg = "none";
    while (n) { const c = getComputedStyle(n).backgroundColor;
      if (c && !/,\s*0\)$/.test(c) && c !== "rgba(0, 0, 0, 0)") { bg = c; break; } n = n.parentElement; }
    return { text: el.innerText.slice(0,30), color: cs.color, fontSize: cs.fontSize, weight: cs.fontWeight, bg };
  };
  return {
    brandMain: g("[data-brand-slot]"),
    brandSub: g("header a span span:nth-child(2), nav a span span:nth-child(2)"),
    navLink: g("header nav ul a, nav ul a"),
    eyebrow: g(".eyebrow"),
    navBg: getComputedStyle(document.querySelector("header") || document.querySelector("nav")).backgroundColor,
  };
});
console.log(JSON.stringify(out, null, 2));
await b.close();
