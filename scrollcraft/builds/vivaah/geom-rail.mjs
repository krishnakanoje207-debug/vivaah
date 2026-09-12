/** Rail alignment probe — does the first card start on the shell's own margin? */
import { chromium } from "playwright-core";
const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
for (const w of [1920, 1440, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(1800);
  const m = await p.evaluate(() => {
    const ul = document.querySelector('ul[class*="snap-x"]');
    const sec = ul?.closest("section");
    const head = sec?.querySelector("h2");
    const first = ul?.children[0];
    const cs = ul ? getComputedStyle(ul) : null;
    const r = (el) => Math.round(el?.getBoundingClientRect().left ?? -1);
    return {
      headingLeft: r(head),
      shellWideLeft: r(sec?.querySelector(".shell-wide")),
      railPadLeft: cs?.paddingLeft,
      firstCardLeft: r(first),
      firstCardW: Math.round(first?.getBoundingClientRect().width ?? -1),
      scrollLeft: ul?.scrollLeft,
    };
  });
  console.log(String(w).padEnd(6), JSON.stringify(m));
  await ctx.close();
}
await b.close();
