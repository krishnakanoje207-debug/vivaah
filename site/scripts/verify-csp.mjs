/**
 * Content Security Policy gate. specs/SECURITY_HARDENING_SPEC.md S3.
 *
 *   cd site && node scripts/verify-csp.mjs          # needs the dev server
 *   BASE=https://vivaah.vivaah.workers.dev node scripts/verify-csp.mjs
 *
 * This asks the running site rather than reading middleware.ts, because every way
 * this can break is a runtime one: a matcher that stops covering a route, a
 * second policy from somewhere else being intersected with this one, a nonce
 * that is minted but never reaches the markup.
 *
 * The failure it exists for is quiet. If the preloader's inline script loses
 * its nonce the browser refuses it, repeat visitors sit through the preloader
 * every time, and no page looks broken. Nothing else would notice.
 */
const BASE = process.env.BASE ?? "http://localhost:3000";

// Documents only. /api and /_next are deliberately outside the matcher.
const ROUTES = ["/", "/rentals", "/retail", "/jewellery", "/visit", "/policies", "/privacy", "/reserve", "/admin/login", "/nope-404"];

const results = [];
const check = (ok, label, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

const directive = (csp, name) => {
  const found = csp.split(";").map((d) => d.trim()).find((d) => d === name || d.startsWith(`${name} `));
  return found ? found.slice(name.length).trim() : null;
};

for (const route of ROUTES) {
  let res;
  try {
    res = await fetch(`${BASE}${route}`, { redirect: "manual" });
  } catch (e) {
    check(false, `${route} responds`, String(e).slice(0, 120));
    continue;
  }

  const csp = res.headers.get("content-security-policy");
  if (!csp) {
    check(false, `${route} carries a Content-Security-Policy`, `HTTP ${res.status}, no header`);
    continue;
  }
  check(true, `${route} carries a Content-Security-Policy`, `HTTP ${res.status}`);

  const script = directive(csp, "script-src");
  const nonceMatch = script?.match(/'nonce-([A-Za-z0-9+/=]+)'/);
  check(!!nonceMatch, `${route} script-src carries a nonce`, script ?? "no script-src at all");

  // The whole point: an injected inline script must not run.
  check(
    !!script && !script.includes("'unsafe-inline'"),
    `${route} script-src does not allow inline`,
    script ?? "",
  );
  check(!!script && script.includes("'strict-dynamic'"), `${route} script-src is strict-dynamic`);

  for (const [name, expected] of [
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'self'"],
  ]) {
    check(directive(csp, name) === expected, `${route} ${name} is ${expected}`, directive(csp, name) ?? "missing");
  }

  // A nonce that is never reused is a nonce that is not doing anything.
  if (nonceMatch && res.status === 200) {
    const html = await res.text();
    const nonce = nonceMatch[1];
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)].map((m) => m[1]);
    const unnonced = inline.filter((attrs) => !attrs.includes(`nonce="${nonce}"`));
    check(
      inline.length > 0 && unnonced.length === 0,
      `${route} every inline script carries this request's nonce`,
      `${inline.length} inline script(s), ${unnonced.length} without it` +
        (unnonced.length ? `\n      first offender: <script${unnonced[0].slice(0, 90)}>` : ""),
    );

    // Two requests must not share a nonce, or it is a constant with extra steps.
    const again = await fetch(`${BASE}${route}`, { redirect: "manual" });
    const second = again.headers.get("content-security-policy")?.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1];
    check(!!second && second !== nonce, `${route} mints a fresh nonce per request`, `${nonce.slice(0, 12)}… vs ${second?.slice(0, 12)}…`);
  }
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (passed !== results.length) {
  console.log("FAILED:");
  for (const r of results.filter((x) => !x.ok)) console.log(`  ${r.label} — ${r.detail}`);
  process.exit(1);
}
