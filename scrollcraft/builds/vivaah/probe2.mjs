import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const [url, needle] of [["http://localhost:3000/jewellery","Kundan"],["http://localhost:3000/visit","+91"]]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(2000);
  const info = await p.evaluate((n) => {
    const el = [...document.querySelectorAll("a,dd,p,span")].find(e => e.innerText && e.innerText.trim().startsWith(n));
    if (!el) return "not found";
    const chain = [];
    let x = el;
    while (x && x !== document.documentElement && chain.length < 8) {
      const cs = getComputedStyle(x);
      chain.push({ tag: x.tagName, cls: (x.className||"").toString().slice(0,70), bgc: cs.backgroundColor, bgi: cs.backgroundImage.slice(0,40) });
      x = x.parentElement;
    }
    return { text: el.innerText.slice(0,30), color: getComputedStyle(el).color, chain };
  }, needle);
  console.log("###", url, needle);
  console.log(JSON.stringify(info, null, 1));
  await p.close();
}
await b.close();
