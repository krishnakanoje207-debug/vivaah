/** RoomIndex at rest vs summoned, and the /rentals reorder. */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const OUT = "lab/roomindex";
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
await p.goto("http://localhost:3000/rentals", { waitUntil: "networkidle" });
await p.waitForTimeout(2600);

// At rest: no scroll for 2s, so the reveal timer has expired.
await p.screenshot({ path: `${OUT}/rest.png` });

// Summoned by hover.
await p.locator('nav[aria-label="Rooms"] a').first().hover();
await p.waitForTimeout(450);
await p.screenshot({ path: `${OUT}/hover.png` });

// Summoned by keyboard focus alone.
await p.mouse.move(960, 1000);
await p.waitForTimeout(1700);
await p.evaluate(() =>
  document.querySelector('nav[aria-label="Rooms"] a')?.focus()
);
await p.waitForTimeout(450);
await p.screenshot({ path: `${OUT}/focus.png` });

// The reorder: what comes first in the collection room.
const order = await p.evaluate(() => {
  const room = document.getElementById("collection");
  if (!room) return null;
  const firstCard = room.querySelector('a[href^="/rentals/"]');
  const firstTile = room.querySelector('a[href^="/rentals?category="]');
  const y = (el) =>
    el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null;
  return {
    firstGarmentY: y(firstCard),
    firstCategoryTileY: y(firstTile),
    garmentsFirst: y(firstCard) !== null && y(firstCard) < (y(firstTile) ?? Infinity),
  };
});
console.log("collection room order:", JSON.stringify(order));

await b.close();
console.log(`Wrote ${OUT}/`);
