import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const ROUTES = ["/", "/rentals", "/rentals/sage-rose", "/retail", "/jewellery", "/visit", "/policies", "/nope-404"];
for (const r of ROUTES) {
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000" + r, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  const d = await p.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")];
    const noAlt = imgs.filter(i => !i.hasAttribute("alt"));
    const emptyAlt = imgs.filter(i => i.getAttribute("alt") === "");
    const decorative = emptyAlt.filter(i => i.getAttribute("aria-hidden") === "true");
    return {
      title: document.title,
      desc: document.querySelector('meta[name="description"]')?.content?.slice(0, 60) ?? null,
      imgs: imgs.length, noAlt: noAlt.length,
      emptyAltNotHidden: emptyAlt.length - decorative.length,
      h1: document.querySelectorAll("h1").length,
      canonical: !!document.querySelector('link[rel="canonical"]'),
    };
  });
  console.log(r.padEnd(22), `h1=${d.h1} imgs=${d.imgs} noAlt=${d.noAlt} emptyAlt(not aria-hidden)=${d.emptyAltNotHidden} canon=${d.canonical}`);
  console.log("   title:", d.title);
  console.log("   desc :", d.desc);
  await p.close();
}
await b.close();
