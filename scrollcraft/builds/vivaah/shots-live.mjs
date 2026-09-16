/**
 * Screenshot the DEPLOYED site, to check a deploy with the eye rather than with
 * a status code.
 *
 *   node shots-live.mjs                     # the default routes
 *   node shots-live.mjs /reserve?items=x    # one route
 *
 * Read-only: it loads pages and takes pictures. It never posts a form, so it
 * cannot write anything to the live database.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "https://vivaah.vivaah.workers.dev";
const OUT = "lab/live";

const ROUTES = process.argv[2]
  ? [process.argv[2]]
  : ["/", "/rentals", "/reserve?items=sage-rose", "/booking/VVH-0000"];

const safe = (r) => (r === "/" ? "home" : r.replace(/^\//, "").replace(/[^a-zA-Z0-9_-]+/g, "_"));

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
for (const route of ROUTES) {
  for (const w of [
    { name: "1440", viewport: { width: 1440, height: 900 } },
    { name: "390", viewport: { width: 390, height: 844 } },
  ]) {
    const ctx = await browser.newContext({ viewport: w.viewport });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 140)));
    // Over the network, "load" waits on every last asset and a cold Worker can
    // outrun the default timeout. Paint first, then let it settle.
    const res = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("load", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/${safe(route)}-${w.name}.png` });
    console.log(
      `${res?.status()} ${route} [${w.name}]` + (errors.length ? `  ERRORS: ${errors.slice(0, 2).join(" | ")}` : "")
    );
    await ctx.close();
  }
}
await browser.close();
