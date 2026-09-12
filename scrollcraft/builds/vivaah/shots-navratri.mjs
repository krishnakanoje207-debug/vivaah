/**
 * The Navratri band as it ships today (the "before" countdown state).
 *
 * The "during" states cannot be captured here: the band is a server component
 * and reads the server's clock, so Playwright's clock API cannot move it. Those
 * phases are proven by site/probe-navratri.mts instead, which exercises every
 * date boundary including the IST/UTC one.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT = "lab/navratri";
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

for (const [name, w] of [["1920", 1920], ["390", 390]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(2400);

  const band = p.locator("section", { hasText: "Navratri" }).first();
  if (await band.count()) {
    await band.scrollIntoViewIfNeeded();
    await p.waitForTimeout(600);
    await band.screenshot({ path: `${OUT}/band-${name}.png` });
  }

  const m = await p.evaluate(() => ({
    overflowX:
      document.documentElement.scrollWidth > window.innerWidth,
    swatches: document.querySelectorAll('section ul[aria-hidden="true"] li').length,
    hasNotice: document.body.textContent.includes("A request, not a reservation"),
    cholisLink: !!document.querySelector('a[href="/rentals?category=chaniya-cholis"]'),
  }));
  console.log(`${name}  swatches=${m.swatches}  notice=${m.hasNotice}  cholisLink=${m.cholisLink}  overflowX=${m.overflowX}  errors=${errors.length}`);
  await ctx.close();
}
await b.close();
console.log(`Wrote ${OUT}/`);
