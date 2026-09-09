import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const r of ["/", "/rentals", "/retail", "/jewellery", "/visit", "/policies"]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const msgs = [];
  p.on("console", (m) => { const t = m.text(); if (/hydrat|did not match|Warning|Error/i.test(t)) msgs.push(m.type().toUpperCase()+": "+t.slice(0,300)); });
  p.on("pageerror", (e) => msgs.push("PAGEERROR: " + e.message.slice(0,300)));
  await p.goto("http://localhost:3000" + r, { waitUntil: "networkidle" });
  await p.waitForTimeout(3000);
  console.log("=== " + r + " ===");
  console.log(msgs.length ? msgs.slice(0,4).join("\n") : "  clean");
  await p.close();
}
await b.close();
