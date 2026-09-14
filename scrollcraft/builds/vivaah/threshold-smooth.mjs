/**
 * How smooth the /rentals threshold scrub actually is, measured rather than felt.
 *
 * Real Chrome (the film is h264). Wheels down the scroll track in even steps
 * and records, from inside the page: seeks issued (writes to currentTime),
 * seeks completed (`seeked`), and every frame the compositor actually presented
 * (requestVideoFrameCallback). Stalls are the gaps between presented frames
 * while the scroll is moving; that is what reads as rough.
 *
 *   node threshold-smooth.mjs [label]     (dev server up)
 */
import { chromium } from "playwright-core";
const label = process.argv[2] || "run";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const out = [];
for (const [w, h, speed] of [[1920, 1080, 120], [1920, 1080, 40], [390, 844, 60]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
    window.__m = { issued: 0, done: 0, shown: [], long: [] };
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__m.long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: "longtask", buffered: true });
    Object.defineProperty(HTMLMediaElement.prototype, "currentTime", { get() { return d.get.call(this); }, set(v) { window.__m.issued++; d.set.call(this, v); } });
    document.addEventListener("seeked", () => window.__m.done++, true);
  });
  await p.goto("http://localhost:3000/rentals", { waitUntil: "networkidle" });
  await p.waitForFunction(() => { const v = document.querySelector("#threshold video"); return v && v.readyState >= 3; }, null, { timeout: 60000 });
  await p.evaluate(() => { const v = document.querySelector("#threshold video"); const loop = (now) => { window.__m.shown.push(now); v.requestVideoFrameCallback(loop); }; v.requestVideoFrameCallback(loop); window.__m.issued = 0; window.__m.done = 0; window.__m.shown = []; window.__m.long = []; });
  const track = await p.evaluate(() => document.querySelector("#threshold").offsetHeight - innerHeight);
  const t0 = Date.now(); let y = 0;
  await p.mouse.move(w / 2, h / 2);
  while (y < track) { await p.mouse.wheel(0, speed); y += speed; await p.waitForTimeout(16); }
  const scrollMs = Date.now() - t0;
  await p.waitForTimeout(1500);
  const m = await p.evaluate(() => { const s = window.__m.shown; const gaps = s.slice(1).map((t, i) => t - s[i]); gaps.sort((a, b) => b - a); return { issued: window.__m.issued, done: window.__m.done, shown: s.length, worst: gaps.slice(0, 3).map(Math.round), worstAt: (() => { const g = s.slice(1).map((t, i) => t - s[i]); const i = g.indexOf(Math.max(...g)); return `${i}/${g.length} at ${Math.round(s[i] - s[0])}ms`; })(), over100: gaps.filter(g => g > 100).length, long: window.__m.long.map(([st, d]) => `${Math.round(st - (s[0] || 0))}ms+${d}`).join(" "), spanMs: s.length ? Math.round(s[s.length - 1] - s[0]) : 0 }; });
  const row = { label, vp: `${w}x${h}`, wheel: speed, scrollMs, ...m, fps: m.spanMs ? +(m.shown / (m.spanMs / 1000)).toFixed(1) : 0 };
  console.log(JSON.stringify(row)); out.push(row);
  await ctx.close();
}
await b.close();
