/**
 * Font preload gate.
 *
 *   cd site && node scripts/verify-font-preload.mjs          # needs the dev server
 *   BASE=https://vivaah.vivaah.workers.dev node scripts/verify-font-preload.mjs
 *
 * It needs `.next` from `npm run build` AND a running site. The server half was
 * added on 18 Sep because the build half alone could not see the bug it was
 * written to prevent: the mechanism had been changed to `ReactDOM.preload`,
 * which in a production build emits only a Flight hint into the body and no
 * `<link>` at all, and this gate went on passing 8/8 while not one deployed
 * route asked for a font early. Checking `.next` proves the FILES are right.
 * Only the served document proves the PAGE asks for them.
 *
 * What it is guarding. `lib/fontPreload.ts` names two font files by their
 * content hash, because `next build --webpack` leaves next-font-manifest empty
 * and `next/font` therefore never emits a preload of its own. A content hash
 * changes when the font file changes, and the failure mode if nobody notices is
 * silent in the worst way: the browser ignores a preload for a URL that 404s,
 * no page looks broken, and the 0.161 CLS that §2.3 of PERF_PLAN measured comes
 * quietly back. So this asserts the names still point at something.
 *
 * It also re-checks the premise. If a future Next or a future adapter starts
 * filling the manifest again, the hand-written links become a duplicate of what
 * the framework is already doing and should be deleted; this says so rather
 * than letting them sit there forever.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const NEXT = path.join(ROOT, ".next");
const results = [];
const check = (ok, label, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

if (!existsSync(NEXT)) {
  console.error("No .next directory. Run `npm run build` first.");
  process.exit(1);
}

// The list, read out of the TypeScript source rather than imported, so this
// script stays dependency-free and runnable without a compile step.
const src = readFileSync(path.join(ROOT, "lib", "fontPreload.ts"), "utf8");
const declared = [...src.matchAll(/"(\/_next\/static\/media\/[^"]+\.woff2)"/g)].map((m) => m[1]);
check(declared.length > 0, "lib/fontPreload.ts declares at least one font", declared.join("\n      "));

// 1. Every declared file must actually exist in the build.
for (const url of declared) {
  const file = path.join(NEXT, url.replace(/^\/_next\//, ""));
  check(
    existsSync(file),
    `the build contains ${path.basename(url)}`,
    existsSync(file) ? `${readFileSync(file).length} bytes` : "MISSING — the font hash changed; update lib/fontPreload.ts from .next/static/media",
  );
}

// 2. Each must be a file next/font itself marked preloadable, and must really
//    be referenced by the generated stylesheet. A name that exists but is no
//    longer in the CSS is a font nothing uses.
const cssDir = path.join(NEXT, "static", "css");
const css = existsSync(cssDir)
  ? readdirSync(cssDir).filter((f) => f.endsWith(".css")).map((f) => readFileSync(path.join(cssDir, f), "utf8")).join("\n")
  : "";
for (const url of declared) {
  const base = path.basename(url);
  check(base.includes("-s.p."), `${base} is one next/font marked preloadable`, base.includes("-s.p.") ? "" : "not a .p. file: next/font does not consider this a preload candidate");
  check(css.includes(base), `${base} is still referenced by the built CSS`, css.includes(base) ? "" : "in the build but unused by any @font-face");
}

// 3. The premise: the manifest is empty, which is the only reason this file
//    exists. If it fills up, the hand-written links are redundant.
const manifestPath = path.join(NEXT, "server", "next-font-manifest.json");
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const appEntries = Object.keys(manifest.app ?? {}).length;
  check(
    appEntries === 0,
    "next/font still emits no preloads of its own (the reason lib/fontPreload.ts exists)",
    appEntries === 0
      ? "next-font-manifest app: {} — as expected on a --webpack build"
      : `manifest now has ${appEntries} route(s). next/font is preloading again: delete lib/fontPreload.ts and its <link>s in app/layout.tsx, or they will be duplicated.`,
  );
} else {
  check(false, "next-font-manifest.json is present in the build");
}

// 4. The served document. Everything above is about the build; this is about
//    what a browser is actually handed. The link has to be inside <head> — a
//    preload discovered halfway down the body has already lost the race with
//    the stylesheet, which is the whole point of the file.
const BASE = process.env.BASE ?? "http://localhost:3000";
// One route with a Suspense boundary and one without: when this broke, it broke
// on both, and that is what proved it was the API and not the boundary.
for (const route of ["/", "/policies"]) {
  let head;
  try {
    const res = await fetch(`${BASE}${route}`);
    const html = await res.text();
    const end = html.indexOf("</head>");
    head = end === -1 ? "" : html.slice(0, end);
  } catch (e) {
    check(false, `${route} responds (is the dev server up?)`, String(e).slice(0, 140));
    continue;
  }
  for (const url of declared) {
    const base = path.basename(url);
    const inHead = head.includes(url) && /<link[^>]*as="font"/.test(head);
    check(
      inHead,
      `${route} serves <link rel="preload" as="font"> for ${base} inside <head>`,
      inHead ? "" : "not in the served <head>. A Flight hint in the body is not a preload: see the comment in app/layout.tsx.",
    );
  }
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (passed !== results.length) {
  console.log("FAILED:");
  for (const r of results.filter((x) => !x.ok)) console.log(`  ${r.label} — ${r.detail}`);
  process.exit(1);
}
