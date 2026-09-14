import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
for (const r of ["/", "/rentals", "/rentals/sage-rose", "/retail", "/jewellery"]) {
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000" + r, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  const d = await p.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const secs = [...main.querySelectorAll("section")];
    const last = secs[secs.length - 1];
    // every actionable thing in the page, in document order
    const acts = [...main.querySelectorAll('a[href^="http"], a[href^="tel"], a[href^="/visit"], a[href^="/rentals"], a[href^="/retail"], a[href^="/jewellery"], button')]
      .filter(a => a.offsetParent !== null)
      .map(a => `${a.tagName}:${(a.textContent||"").trim().replace(/\s+/g," ").slice(0,34)}`);
    return {
      sections: secs.length,
      lastSectionText: (last?.textContent || "").trim().replace(/\s+/g, " ").slice(0, 110),
      wa: [...main.querySelectorAll('a[href*="wa.me"]')].length,
      tel: [...main.querySelectorAll('a[href^="tel"]')].length,
      acts: acts.slice(-6),
    };
  });
  console.log(`\n${r}  (${d.sections} sections)  whatsapp=${d.wa} tel=${d.tel}`);
  console.log("  ends with:", d.lastSectionText);
  console.log("  last actions:", d.acts.join(" | "));
  await p.close();
}
await b.close();
