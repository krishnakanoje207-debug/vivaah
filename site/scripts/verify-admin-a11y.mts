/**
 * Admin form accessibility, through the real browser.
 *
 *   cd site && npx tsx --env-file=.env.local scripts/verify-admin-a11y.mts
 *
 * LAUNCH_CHECKLIST P2.5. Every admin form already announced its failure and
 * disabled its button while pending. What none of them did was mark the field:
 * there was not one `aria-invalid` or `aria-describedby` in `app/admin/`, so a
 * screen reader heard the message once and then found every input reporting
 * itself as valid, and focus never moved to the bad one.
 *
 * This submits genuinely invalid values and then asks the browser what a
 * screen reader would be told:
 *
 *   - the field says it is invalid,
 *   - the id it points at EXISTS and holds the message the form printed
 *     (a dangling aria-describedby is worse than none, because it reads as
 *     wired while announcing nothing),
 *   - focus is on the first bad field in the order the form reads on screen.
 *
 * Requires the dev server on :3000. It WRITES NOTHING: every submit it makes is
 * rejected by validation, which is the whole point, so no setting is ever saved.
 * A session is minted from SESSION_SECRET rather than typed into the login form,
 * as `verify-booking-e2e.mts` does, because only the password's hash is
 * configured locally and what is under test is the panel.
 */
import { chromium } from "@playwright/test";
import { SESSION_COOKIE, createSession } from "../lib/adminAuth.ts";

const BASE = "http://localhost:3000";
const results: { ok: boolean; label: string; detail: string }[] = [];
const check = (ok: boolean, label: string, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

/** What a screen reader would be told about one field. */
type Announced = {
  invalid: string | null;
  describedBy: string | null;
  /** The text of every element aria-describedby points at, in order. */
  described: string[];
  /** Whether every referenced id actually resolves. */
  allResolve: boolean;
  focused: boolean;
};

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([
    { name: SESSION_COOKIE, value: await createSession(), url: BASE, httpOnly: true, sameSite: "Lax" },
  ]);
  const page = await ctx.newPage();

  const announced = (id: string) =>
    page.evaluate((fieldId): Announced => {
      const el = document.getElementById(fieldId);
      if (!el) return { invalid: null, describedBy: null, described: [], allResolve: false, focused: false };
      const ids = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
      const targets = ids.map((i) => document.getElementById(i));
      return {
        invalid: el.getAttribute("aria-invalid"),
        describedBy: el.getAttribute("aria-describedby"),
        described: targets.map((t) => (t?.textContent ?? "").trim()),
        allResolve: ids.length > 0 && targets.every(Boolean),
        focused: document.activeElement === el,
      };
    }, id);

  // ---------------------------------------------------------------- settings
  await page.goto(`${BASE}/admin/settings`, { waitUntil: "load", timeout: 120000 });
  check(!page.url().includes("/admin/login"), "the panel opens for a signed-in shop", page.url());

  // Before any submit, a field must NOT claim to be invalid. A form that starts
  // out shouting is as useless as one that never does.
  const restingState = await announced("buffer_days");
  check(
    restingState.invalid === "false" || restingState.invalid === null,
    "a field is not marked invalid before anything is submitted",
    `aria-invalid=${restingState.invalid}`,
  );

  // Two bad values at once, so the ORDER the hook uses can be checked: a later
  // field is wrong as well, and focus must still land on the earlier one.
  await page.fill("#buffer_days", "not-a-number");
  await page.fill("#sms_daily_quota", "-5");
  await page.locator("#buffer_days").evaluate((el: HTMLElement) => el.blur());
  await page.locator('form:has(#buffer_days) button[type="submit"]').click();
  await page.waitForFunction(
    () => document.getElementById("buffer_days")?.getAttribute("aria-invalid") === "true",
    undefined,
    { timeout: 30000 },
  );

  const buffer = await announced("buffer_days");
  check(buffer.invalid === "true", "settings: the rejected field reports itself invalid", `aria-invalid=${buffer.invalid}`);
  check(
    buffer.allResolve,
    "settings: every id it points at resolves to a real element",
    `aria-describedby="${buffer.describedBy}" -> ${JSON.stringify(buffer.described)}`,
  );
  check(
    buffer.described.some((t) => /whole number/i.test(t)),
    "settings: the description carries the message the form printed",
    JSON.stringify(buffer.described),
  );
  check(
    buffer.described.length >= 2,
    "settings: it keeps the hint as well as the error, not one instead of the other",
    `${buffer.described.length} descriptions`,
  );
  check(buffer.focused, "settings: focus moved to the first bad field");

  const quota = await announced("sms_daily_quota");
  check(quota.invalid === "true", "settings: the second bad field is also marked", `aria-invalid=${quota.invalid}`);
  check(!quota.focused, "settings: but focus stayed on the first one, in reading order");

  // A field that was fine must not be swept up in the failure.
  const untouched = await announced("cancel_cutoff_hours");
  check(
    untouched.invalid === "false" || untouched.invalid === null,
    "settings: a valid field is left alone",
    `aria-invalid=${untouched.invalid}`,
  );

  // The shop form is a separate useActionState on the same page; submitting the
  // rules form must not make it start reporting errors.
  const otherForm = await announced("name");
  check(
    otherForm.invalid === "false" || otherForm.invalid === null,
    "settings: a different form on the same page is unaffected",
    `aria-invalid=${otherForm.invalid}`,
  );

  // A rejected save must KEEP what she typed. React 19 resets an uncontrolled
  // `<form action={serverAction}>` once the action returns, success or failure,
  // and this form used to be uncontrolled: the message "must be a whole number"
  // appeared above a box that had already been refilled with the stored value,
  // and pressing save again then saved that old value as though nothing had
  // been wrong. This is the check that would have caught it.
  const kept = await page.inputValue("#buffer_days");
  check(kept === "not-a-number", "settings: a rejected save keeps what she typed", `value is ${JSON.stringify(kept)}`);

  // And because the bad value survives, a second attempt is rejected too, and
  // that rejection has to be perceivable rather than silent.
  await page.locator("#sms_daily_quota").focus();
  await page.locator('form:has(#buffer_days) button[type="submit"]').click();
  const refocused = await page
    .waitForFunction(() => document.activeElement?.id === "buffer_days", undefined, { timeout: 60000 })
    .then(() => true)
    .catch(() => false);
  check(refocused, "settings: a second rejection moves focus again", "so the retry is perceivable");
  check(
    !(await page.locator("body").innerText()).includes("Saved."),
    "settings: and nothing was saved along the way",
  );

  // ---------------------------------------------------------------- products
  await page.goto(`${BASE}/admin/products/new`, { waitUntil: "load", timeout: 120000 });
  // The name field carries a native `required`, so an empty submit is stopped by
  // the browser and the server never runs: that is correct, and it is not what
  // is under test. So give it a valid name and a slug the SERVER rejects.
  await page.fill("#name", "A11y Probe");
  await page.fill("#slug", "Not A Slug!");
  // NOT `button[type="submit"]`.first(): the first submit button on any panel
  // page is the sidebar's "Log out", and clicking it ended the session and left
  // the test on the login form wondering where the field had gone.
  await page.getByRole("button", { name: /create product/i }).click();
  const slugMarked = await page
    .waitForFunction(
      () => document.getElementById("slug")?.getAttribute("aria-invalid") === "true",
      undefined,
      { timeout: 30000 },
    )
    .then(() => true)
    .catch(() => false);
  check(slugMarked, "products: the server-rejected field reports itself invalid");
  const pslug = await announced("slug");
  check(
    pslug.allResolve,
    "products: every id it points at resolves",
    `aria-describedby="${pslug.describedBy}" -> ${JSON.stringify(pslug.described)}`,
  );
  check(
    pslug.described.some((t) => /lowercase letters/i.test(t)),
    "products: the description carries the server's own message",
    JSON.stringify(pslug.described),
  );
  check(pslug.focused, "products: focus moved to it");

  await ctx.close();
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (passed !== results.length) {
  console.log("FAILED:");
  for (const r of results.filter((x) => !x.ok)) console.log(`  ${r.label} — ${r.detail}`);
  process.exit(1);
}
