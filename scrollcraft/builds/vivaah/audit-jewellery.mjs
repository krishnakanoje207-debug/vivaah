import { chromium, devices } from "playwright-core";
import { mkdirSync } from "node:fs";

// Verification pass for /jewellery. Real Chrome, not Chromium. 390 goes through
// device emulation because a true sub-500px headless window is clamped by the OS
// and the shot comes back clipped.
const OUT = "lab/jewellery";
mkdirSync(OUT, { recursive: true });
const URL = "http://localhost:3000/jewellery";

const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

async function run(label, contextOpts, sliceH) {
  const ctx = await b.newContext(contextOpts);
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
  p.on("console", (m) => {
    if (m.type() === "error") errs.push(`console: ${m.text()}`);
  });

  await p.goto(URL, { waitUntil: "networkidle" });
  await p.waitForTimeout(2000);

  // Scroll the whole page so every ScrollTrigger fires and settles.
  const h = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 400) {
    await p.evaluate((v) => window.scrollTo(0, v), y);
    await p.waitForTimeout(90);
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(1200);

  const overflow = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );

  const n = Math.ceil(h / sliceH);
  for (let i = 0; i < n; i++) {
    await p.evaluate((y) => window.scrollTo(0, y), i * sliceH);
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${label}-${String(i).padStart(2, "0")}.png` });
  }

  console.log(
    label,
    "| height", h,
    "| slices", n,
    "| hOverflow", overflow,
    "| errors", errs.length ? errs : "none"
  );
  await ctx.close();
}

await run("w1920", { viewport: { width: 1920, height: 1080 } }, 1080);
await run("w1440", { viewport: { width: 1440, height: 1000 } }, 1000);
await run("w390", { ...devices["iPhone 12"], viewport: { width: 390, height: 844 } }, 844);

await b.close();
console.log("done");
