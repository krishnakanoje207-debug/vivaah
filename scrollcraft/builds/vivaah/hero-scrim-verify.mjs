/**
 * Hero scrim verification — the one thing site-audit.mjs cannot check.
 *
 * The audit skips any text sitting over media, because elementsFromPoint cannot
 * tell it what colour a photograph is behind a word (DESIGN_SPEC_V3 §7.4). This
 * measures it from the pixels instead: it renders the hero as shipped, samples
 * the actual composited background under every line of hero type, and reports
 * the worst cell against WCAG AA. It also reports how much of the photograph's
 * own light the scrim leaves on her face, which is the cost side of the trade.
 *
 *   node hero-scrim-verify.mjs            # 1920, 1440, 390 and Pixel 7
 *
 * Requires the dev server on :3000, and real Chrome. Exits non-zero on a fail.
 *
 * Method is v7's, cut down: the type's own client rects are diced into cells, a
 * screenshot with the type hidden gives each cell its true background, and the
 * p90 of that cell's luminance is the light the glyph edge has to beat. p90
 * rather than the mean because a word fails on its brightest patch, not on
 * average. The face box comes from the same skin/red detector v6 settled on.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = "http://localhost:3000/";
const OUT = "lab/hero-scrim";
const HERO = "section.on-dark";
mkdirSync(OUT, { recursive: true });

const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lumRGB = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratioL = (a, b) => { const hi = Math.max(a, b), lo = Math.min(a, b); return (hi + 0.05) / (lo + 0.05); };
const hex = (h) => [0, 2, 4].map((i) => parseInt(h.slice(1).slice(i, i + 2), 16));
const L_PORCELAIN = lumRGB(hex("#fafaf7"));
const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;

/* The face box, measured once at 1920 against the annotated overlay in v6 and
   reused here. It is a fraction of the hero box, so it follows the crop. */
const FACE = { fx0: 0.494, fx1: 0.563, fy0: 0.238, fy1: 0.363 };

const VIEWPORTS = [
  { tag: "1920", viewport: { width: 1920, height: 1080 } },
  { tag: "1440", viewport: { width: 1440, height: 900 } },
  { tag: "390", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { tag: "pixel7", viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
];

const browser = await chromium.launch({ executablePath: CHROME });
const decoder = await browser.newPage();
await decoder.setContent('<canvas id="c"></canvas>');

/** Mean colour and luminance quantiles of a list of boxes, in image pixels. */
const sample = (buf, rects) =>
  decoder.evaluate(async ({ b64, rects }) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.getElementById("c"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
    const W = c.width, H = c.height, D = ctx.getImageData(0, 0, W, H).data;
    const l = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (r, g, b) => 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b);
    return rects.map((r) => {
      const x0 = Math.max(0, Math.round(r.x)), y0 = Math.max(0, Math.round(r.y));
      const w = Math.min(Math.round(r.width), W - x0), h = Math.min(Math.round(r.height), H - y0);
      if (w <= 0 || h <= 0) return { id: r.id };
      const Ls = []; let sr = 0, sg = 0, sb = 0;
      for (let y = y0; y < y0 + h; y++) { let i = (y * W + x0) * 4;
        for (let x = 0; x < w; x++, i += 4) { sr += D[i]; sg += D[i + 1]; sb += D[i + 2]; Ls.push(lum(D[i], D[i + 1], D[i + 2])); } }
      Ls.sort((a, b) => a - b);
      const n = Ls.length, q = (p) => Ls[Math.min(n - 1, Math.floor(p * n))];
      return { id: r.id, mean: [sr / n, sg / n, sb / n], Lmean: Ls.reduce((a, b) => a + b, 0) / n, L90: q(0.9), L99: q(0.99) };
    });
  }, { b64: buf.toString("base64"), rects });

const results = [];
const rec = (ok, tag, label, detail) => { results.push({ ok, tag, label, detail }); if (!ok) console.log(`  FAIL [${tag}] ${label} — ${detail}`); };

for (const vp of VIEWPORTS) {
  const page = await browser.newPage(vp);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2400);
  await page.evaluate(() => scrollTo(0, 0));

  const hero = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; }, HERO);
  const clip = { x: hero.x, y: hero.y, width: hero.width, height: hero.height };

  /* One box per visual line, from the range's own client rects, so a wrapped
     headline is measured line by line rather than as one loose rectangle. */
  const lines = await page.evaluate((sel) => {
    const shell = document.querySelector(sel).querySelector(".shell");
    const out = [];
    const push = (id, r) => { if (r.width > 3 && r.height > 3) out.push({ id, x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }); };
    const parts = [["eyebrow", shell.querySelector("p.eyebrow")], ["h1", shell.querySelector("h1")], ["body", shell.querySelector("h1 ~ p")]];
    for (const [id, el] of parts) {
      if (!el) continue;
      const range = document.createRange(); range.selectNodeContents(el);
      const bands = [];
      for (const r of Array.from(range.getClientRects()).filter((r) => r.width > 2 && r.height > 2)) {
        const b = bands.find((b) => Math.abs((b.y + b.height / 2) - (r.y + r.height / 2)) < r.height * 0.6);
        if (b) { const x2 = Math.max(b.x + b.width, r.x + r.width), y2 = Math.max(b.y + b.height, r.y + r.height); b.x = Math.min(b.x, r.x); b.y = Math.min(b.y, r.y); b.width = x2 - b.x; b.height = y2 - b.y; }
        else bands.push({ x: r.x, y: r.y, width: r.width, height: r.height });
      }
      bands.forEach((b, i) => push(`${id}#${i + 1}`, b));
    }
    /* The two CTAs paint their own grounds, so only their labels' ground is the
       photograph, and that is already the button's fill. Skipped on purpose. */
    return out;
  }, HERO);

  const toLocal = (r) => ({ id: r.id, x: r.x - clip.x, y: r.y - clip.y, width: r.width, height: r.height });
  const cells = [];
  for (const r of lines.map(toLocal)) {
    const cols = 14, rows = 3, pad = 3;
    const w = r.width + pad * 2, h = r.height + pad * 2, cw = w / cols, ch = h / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cells.push({ id: `${r.id}|${i},${j}`, x: r.x - pad + i * cw, y: r.y - pad + j * ch, width: cw, height: ch });
  }

  const hide = (v) => page.evaluate(({ sel, v }) => { document.querySelector(sel).querySelector(".shell").style.visibility = v; }, { sel: HERO, v });
  const scrims = (display) => page.evaluate(({ sel, display }) => {
    document.querySelector(sel).querySelectorAll(':scope > div[aria-hidden="true"]').forEach((el) => { el.style.display = display; });
  }, { sel: HERO, display });

  const faceBox = { id: "face", x: FACE.fx0 * clip.width, y: FACE.fy0 * clip.height, width: (FACE.fx1 - FACE.fx0) * clip.width, height: (FACE.fy1 - FACE.fy0) * clip.height };
  const whole = { id: "whole", x: 0, y: 0, width: clip.width, height: clip.height };

  await hide("hidden");
  await page.waitForTimeout(220);
  const shot = await page.screenshot({ type: "png", scale: "css", fullPage: true, clip });
  writeFileSync(`${OUT}/${vp.tag}-scrimmed.png`, shot);

  await scrims("none"); await page.waitForTimeout(220);
  const bare = await page.screenshot({ type: "png", scale: "css", fullPage: true, clip });
  writeFileSync(`${OUT}/${vp.tag}-bare.png`, bare);
  await scrims(""); await hide("visible"); await page.waitForTimeout(220);
  writeFileSync(`${OUT}/${vp.tag}-shipped.png`, await page.screenshot({ type: "png", scale: "css", fullPage: true, clip }));

  const [m, b] = [await sample(shot, [...cells, faceBox, whole]), await sample(bare, [faceBox, whole])];
  const cr = m.filter((r) => r.id.includes("|")).map((r) => ({ id: r.id, cr90: r2(ratioL(L_PORCELAIN, r.L90)), cr99: r2(ratioL(L_PORCELAIN, r.L99)) }));
  const worst = cr.reduce((a, c) => (c.cr90 < a.cr90 ? c : a));
  const fails = cr.filter((c) => c.cr90 < 4.5);
  const pick = (rows, id) => rows.find((r) => r.id === id);
  const retainFace = r2(pick(m, "face").Lmean / pick(b, "face").Lmean);
  const retainWhole = r2(pick(m, "whole").Lmean / pick(b, "whole").Lmean);

  console.log(`\n=== ${vp.tag}  hero ${Math.round(hero.width)}x${Math.round(hero.height)}, ${lines.length} lines, ${cr.length} cells`);
  console.log(`  worst cell ${worst.cr90} (${worst.id})   face keeps ${retainFace}x its light, whole frame ${retainWhole}x`);
  rec(fails.length === 0, vp.tag, "hero type clears AA over the photograph", `${fails.length} cells under 4.5:1, worst ${worst.cr90} at ${worst.id}`);
  rec(retainFace >= 0.3, vp.tag, "the photograph survives its own scrim", `face keeps ${retainFace}x, want 0.3 or better`);
  results.push({ tag: vp.tag, worst: worst.cr90, retainFace, retainWhole, cells: cr.length, silent: true });
  await page.close();
}

await decoder.close(); await browser.close();
const checks = results.filter((r) => !r.silent);
const bad = checks.filter((r) => !r.ok);
writeFileSync(`${OUT}/result.json`, JSON.stringify(results, null, 2));
console.log(`\n${checks.length - bad.length}/${checks.length} checks passed`);
console.log(bad.length ? "FAILURES ABOVE" : "no failures");
process.exit(bad.length ? 1 : 0);
