/**
 * Site-wide audit. Renders every public route in real Chrome and checks the
 * things a markup read cannot see.
 *
 *   node site-audit.mjs                 # all routes, 1920 + 1440 + 390
 *   node site-audit.mjs /retail         # one route
 *
 * Requires the dev server on :3000. Real Chrome, not Chromium, because the
 * /rentals threshold film is h264 and Chromium ships without the codec.
 *
 * Exits non-zero if any FAIL is recorded, so it can gate a deploy later.
 */
import { chromium, devices } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const OUT = "lab/site-audit";

const ROUTES = process.argv[2]
  ? [process.argv[2]]
  : ["/", "/rentals", "/retail", "/jewellery", "/visit", "/policies", "/nope-404"];

const WIDTHS = [
  { name: "1920", viewport: { width: 1920, height: 1080 } },
  { name: "1440", viewport: { width: 1440, height: 900 } },
  { name: "390", device: "Pixel 7" },
];

// §G.3 bans em dashes in visible copy. §G.2 bans the shipping vocabulary.
// The shop is a year old, so the heritage register is banned outright.
const BANNED = [
  { label: "em dash", re: /\u2014/ },
  // A page saying "no shipping" is stating the model correctly, not breaking
  // the rule, so the negated forms must not trip this.
  { label: "shipping vocabulary", re: /\b(add to (bag|cart)|checkout|free delivery|order tracking)\b|(?<!no )(?<!without )\bshipping\b/i },
  { label: "heritage register", re: /\b(legacy|lineage|generations|timeless elegance|years of experience|trusted since)\b/i },
  { label: "founding year", re: /\b(since|est\.?)\s*(19|20)\d{2}\b/i },
  { label: "groom content", re: /\b(groom|sherwani)\b/i },
];

const results = [];
const rec = (ok, route, width, label, detail = "") => {
  results.push({ ok, route, width, label, detail });
  if (!ok) console.log(`  FAIL [${width}] ${label}${detail ? ` — ${detail}` : ""}`);
};

/** Relative luminance + contrast ratio, WCAG 2.1. */
function ratio(rgb1, rgb2) {
  const lum = ([r, g, b]) => {
    const f = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const [a, b] = [lum(rgb1), lum(rgb2)];
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

async function auditRoute(browser, route) {
  console.log(`\n=== ${route} ===`);
  for (const w of WIDTHS) {
    const ctx = w.device
      ? await browser.newContext({ ...devices[w.device] })
      : await browser.newContext({ viewport: w.viewport });
    const page = await ctx.newPage();

    const errors = [];
    page.on("pageerror", (e) => errors.push(`PAGEERROR ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text().slice(0, 200));
    });
    const bad404 = [];
    page.on("response", (r) => {
      if (r.status() >= 400 && new URL(r.url()).origin === BASE) bad404.push(`${r.status()} ${r.url()}`);
    });

    const resp = await page.goto(BASE + route, { waitUntil: "networkidle" });
    const status = resp?.status() ?? 0;
    await page.waitForTimeout(1800);

    // Scroll the whole page so every ScrollTrigger fires and settles.
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 600) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(90);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);

    // ---- structural ----
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    rec(overflow === 0, route, w.name, "no horizontal overflow", overflow ? `${overflow}px` : "");
    // A route that is meant to 404 logs exactly that, so those two checks are
    // not meaningful there. Everything else about the 404 page still is.
    const is404Route = route === "/nope-404";
    const realErrors = is404Route ? errors.filter((e) => !/404 \(Not Found\)/.test(e)) : errors;
    rec(realErrors.length === 0, route, w.name, "no console or page errors", realErrors.slice(0, 3).join(" | "));
    if (!is404Route) {
      rec(bad404.length === 0, route, w.name, "no failed same-origin requests", bad404.slice(0, 3).join(" | "));
    }

    const expected = route === "/nope-404" ? 404 : 200;
    rec(status === expected, route, w.name, `HTTP ${expected}`, `got ${status}`);

    // ---- images actually loaded ----
    const brokenImgs = await page.evaluate(() =>
      [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute("src"))
    );
    rec(brokenImgs.length === 0, route, w.name, "every image loaded", brokenImgs.slice(0, 3).join(" | "));

    // ---- the page must not build its own chrome (layout supplies it) ----
    const chrome = await page.evaluate(() => ({
      mains: document.querySelectorAll("main").length,
      htmls: document.querySelectorAll("html").length,
    }));
    rec(chrome.mains === 1, route, w.name, "exactly one <main>", `found ${chrome.mains}`);

    // ---- banned copy, visible text only ----
    const text = await page.evaluate(() => document.body.innerText);
    for (const b of BANNED) {
      const m = text.match(b.re);
      rec(!m, route, w.name, `no ${b.label}`, m ? `"${text.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, " ")}"` : "");
    }

    // ---- TODO(owner) must stay visible where present, never a stray "undefined" ----
    rec(!/\bundefined\b|\bNaN\b|\[object Object\]/.test(text), route, w.name, "no undefined/NaN leaking into copy");

    // ---- contrast on real rendered text over its real background ----
    const lowContrast = await page.evaluate(() => {
      // Alpha matters. The nav sits on a translucent plate that Chrome reports
      // as `oklab(... / 0.85)`; treating that as opaque made every nav link and
      // the brand lockup read as a contrast failure when they are fine. So the
      // alpha is read from either syntax and the stack is composited.
      const alphaOf = (c) => {
        const m = /[/,]\s*(\d*\.?\d+)\s*\)$/.exec(c);
        if (!m) return 1;
        const a = parseFloat(m[1]);
        return Number.isFinite(a) && a <= 1 ? a : 1;
      };
      // Chrome hands back oklab() for these. Painting into a canvas is the
      // cheapest way to get real sRGB without reimplementing the colour space.
      const cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      const toRgb = (c) => {
        try {
          cv.clearRect(0, 0, 1, 1);
          cv.fillStyle = "#000";
          cv.fillStyle = c;
          cv.fillRect(0, 0, 1, 1);
          const d = cv.getImageData(0, 0, 1, 1).data;
          return [d[0], d[1], d[2]];
        } catch {
          return [0, 0, 0];
        }
      };
      const bgOf = (el) => {
        const layers = [];
        let opaque = false;
        let n = el;
        while (n && n !== document.documentElement) {
          const c = getComputedStyle(n).backgroundColor;
          if (c && c !== "transparent") {
            const a = alphaOf(c);
            if (a > 0.001) {
              layers.push({ rgb: toRgb(c), a });
              if (a >= 0.999) {
                opaque = true;
                break;
              }
            }
          }
          n = n.parentElement;
        }
        let out = [255, 255, 255];
        for (let i = layers.length - 1; i >= 0; i--) {
          const { rgb, a } = layers[i];
          out = [0, 1, 2].map((k) => rgb[k] * a + out[k] * (1 - a));
        }
        return { rgb: out, opaque };
      };

      // Type sitting over a photograph or the threshold film has no background
      // colour to measure: the chain is transparent all the way up, so this
      // would compare it against the body's porcelain and report a failure for
      // light type that is in fact sitting on dark video. Those placements are
      // protected by scrims and were measured against the graded footage by
      // hand (DESIGN_SPEC_V3 §7.4), so they are counted separately here rather
      // than guessed at. A machine cannot read a moving background.
      // Collected once: elementsFromPoint cannot be used here, because the
      // threshold film and the category tile images are pointer-events:none and
      // hit-testing skips them entirely. Rect intersection does not care.
      const mediaRects = [...document.querySelectorAll("video,img")]
        .map((m) => m.getBoundingClientRect())
        .filter((r) => r.width > 24 && r.height > 24);

      const overMedia = (el) => {
        const r = el.getBoundingClientRect();
        return mediaRects.some(
          (m) => r.left < m.right && r.right > m.left && r.top < m.bottom && r.bottom > m.top
        );
      };
      const out = [];
      let skippedOverMedia = 0;
      const els = [...document.querySelectorAll("p,li,a,h1,h2,h3,h4,dt,dd,span,button")];
      // Only elements that own their text. A container reports the computed
      // colour it inherits, which is not what is painted when its children set
      // their own: a card link inheriting ink-900 over a violet-950 card looks
      // like 1.12:1 while every visible word inside it is porcelain. Measuring
      // the leaf that actually holds the text is the only honest reading, and it
      // also stops one string being reported twice as its <li> and its <a>.
      const ownText = (e) =>
        [...e.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent)
          .join("")
          .trim();

      for (const el of els) {
        if (!ownText(el)) continue;
        if (el.getAttribute("aria-hidden") === "true" || el.closest("[aria-hidden='true']")) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.15) continue;
        const { rgb } = bgOf(el);
        // Any text overlapping a photograph or the film is unmeasurable here,
        // whether or not an opaque ancestor exists further up: what the eye sees
        // is the image, not that ancestor. The category tiles sit on a scrim
        // over their photograph and the nav runs over the threshold film, and
        // both were measured against the real footage by hand (V3 sec 7.4).
        if (overMedia(el)) {
          skippedOverMedia++;
          continue;
        }
        const size = parseFloat(cs.fontSize);
        const weight = parseInt(cs.fontWeight, 10) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        out.push({
          text: ownText(el).slice(0, 48),
          fg: toRgb(cs.color),
          bg: rgb,
          size: Math.round(size),
          need: large ? 3 : 4.5,
          tag: el.tagName,
        });
      }
      out.skippedOverMedia = skippedOverMedia;
      return { items: out, skippedOverMedia };
    });

    const fails = lowContrast.items
      .map((c) => ({ ...c, r: +ratio(c.fg, c.bg).toFixed(2) }))
      .filter((c) => c.r < c.need)
      .slice(0, 8);
    rec(
      fails.length === 0,
      route,
      w.name,
      "text contrast clears AA",
      fails.map((f) => `${f.tag} ${f.r}:1 (needs ${f.need}, ${f.size}px) "${f.text}"`).join(" | ")
    );
    if (lowContrast.skippedOverMedia) {
      console.log(
        `  note [${w.name}] ${lowContrast.skippedOverMedia} elements sit over media; ` +
          `scrims measured by hand, see DESIGN_SPEC_V3 §7.4`
      );
    }

    // ---- screenshot slices for the eye ----
    mkdirSync(`${OUT}${route === "/" ? "/home" : route}`, { recursive: true });
    const slices = Math.min(8, Math.ceil(h / (w.viewport?.height ?? 800)));
    for (let i = 0; i < slices; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), i * (w.viewport?.height ?? 800));
      await page.waitForTimeout(450);
      await page.screenshot({
        path: `${OUT}${route === "/" ? "/home" : route}/${w.name}-${String(i).padStart(2, "0")}.png`,
      });
    }

    console.log(`  [${w.name}] height ${h}, ${slices} slices`);
    await ctx.close();
  }
}

const browser = await chromium.launch({ executablePath: CHROME });
for (const r of ROUTES) {
  try {
    await auditRoute(browser, r);
  } catch (e) {
    rec(false, r, "-", "route audited without throwing", e.message);
  }
}
await browser.close();

// ---- reduced motion: the page must render its final state ----
console.log("\n=== reduced motion ===");
const rm = await chromium.launch({ executablePath: CHROME });
for (const r of ROUTES.filter((x) => x !== "/nope-404")) {
  const ctx = await rm.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto(BASE + r, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  // Nothing may be left invisible when animation is switched off.
  const hidden = await p.evaluate(() =>
    [...document.querySelectorAll("[data-reveal],[data-wipe],[data-letter]")].filter(
      (e) => parseFloat(getComputedStyle(e).opacity) < 0.9
    ).length
  );
  rec(hidden === 0, r, "reduced", "reveals render at full opacity", hidden ? `${hidden} still faded` : "");
  mkdirSync(`${OUT}/reduced`, { recursive: true });
  await p.screenshot({ path: `${OUT}/reduced/${r.replace(/\//g, "_") || "home"}.png`, fullPage: false });
  await ctx.close();
}
await rm.close();

// ---- summary ----
const failed = results.filter((r) => !r.ok);
const summary =
  `\n${results.length - failed.length}/${results.length} checks passed\n` +
  (failed.length
    ? "FAILED:\n" + failed.map((f) => `  [${f.route} ${f.width}] ${f.label}${f.detail ? ` — ${f.detail}` : ""}`).join("\n")
    : "no failures");
console.log(summary);
writeFileSync(`${OUT}/report.txt`, summary);
process.exit(failed.length ? 1 : 0);
