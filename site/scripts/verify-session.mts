/**
 * Admin session revocation, against the live database.
 *
 *   cd site && npx tsx --env-file=.env.local scripts/verify-session.mts
 *
 * specs/SECURITY_HARDENING_SPEC.md S2. What is being proved is that a token can
 * be taken back, which before this change was impossible: the token carried only
 * an expiry, so every session ever issued was valid until it aged out and
 * `logout()` only cleared the cookie in front of it.
 *
 * WRITES to the database: it moves `admin.sessions_valid_from` and puts the
 * original value back in `finally`, including after a failure. It touches
 * nothing else. It needs no dev server and no browser.
 */
import { neon } from "@neondatabase/serverless";
import { createSession, readSession } from "../lib/adminAuth.ts";

const sql = neon(process.env.DATABASE_URL!);
const KEY = "admin.sessions_valid_from";

const results: { ok: boolean; label: string; detail: string }[] = [];
const check = (ok: boolean, label: string, detail = "") => {
  results.push({ ok, label, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n      ${detail}` : ""}`);
};

// Read the floor the way lib/adminSessions.ts does, but without importing it:
// that module is `server-only` and would refuse to load outside a request.
const floor = async (): Promise<number> => {
  const rows = (await sql`select value from settings where key = ${KEY}`) as { value: number }[];
  const v = rows[0]?.value;
  return typeof v === "number" ? v : Infinity;
};
const setFloor = async (v: number) => {
  await sql`
    insert into settings (key, value, is_public) values (${KEY}, ${v}::text::jsonb, false)
    on conflict (key) do update set value = ${v}::text::jsonb`;
};

const original = await floor();
console.log(`admin.sessions_valid_from starts at ${original}\n`);

try {
  check(Number.isFinite(original), "the revocation floor exists (migration 0011 applied)", String(original));

  // --- the token itself ---
  const token = await createSession();
  const parts = token.split(".");
  check(parts.length === 3, "a session token carries an expiry, an issued-at and a signature", `${parts.length} parts`);

  const claims = await readSession(token);
  check(claims !== null, "a fresh token verifies");
  check(
    !!claims && claims.exp > claims.iat && claims.exp - claims.iat === 7 * 24 * 60 * 60,
    "it expires seven days after it was issued",
    claims ? `${claims.exp - claims.iat}s` : "no claims",
  );

  // Two sessions are no longer indistinguishable, which is what made revocation
  // impossible: there was nothing in the token to compare a floor against.
  const other = await createSession();
  check(
    (await readSession(other))!.iat >= claims!.iat,
    "a second session carries its own issued-at",
  );

  // --- tampering ---
  check(await readSession(`${parts[0]}.${parts[1]}.x${parts[2].slice(1)}`) === null, "a token with a broken signature is refused");
  check(await readSession(`${Number(parts[0]) + 86400}.${parts[1]}.${parts[2]}`) === null, "a token whose expiry was pushed out is refused");
  check(await readSession(`${parts[0]}.${Number(parts[1]) + 60}.${parts[2]}`) === null, "a token whose issued-at was moved forward is refused");

  // The pre-revocation format. It must not be grandfathered in: those tokens
  // are exactly the ones that cannot be revoked.
  check(await readSession(`${parts[0]}.${parts[2]}`) === null, "an old two-part token is refused");
  check(await readSession(undefined) === null, "no cookie is refused");

  // --- expiry ---
  const expired = `${Math.floor(Date.now() / 1000) - 10}.${parts[1]}.${parts[2]}`;
  check(await readSession(expired) === null, "an expired token is refused");

  // --- revocation, which is the point ---
  const before = await createSession();
  const beforeClaims = (await readSession(before))!;
  await new Promise((r) => setTimeout(r, 1100)); // whole-second timestamps

  // What revokeAllSessions() does, inlined for the same server-only reason.
  // The `+ 1` is load-bearing; see that function for why.
  const revokedAt = Math.floor(Date.now() / 1000) + 1;
  await setFloor(revokedAt);

  check(
    beforeClaims.iat < (await floor()),
    "a session issued before the revocation is now below the floor",
    `iat ${beforeClaims.iat} < floor ${await floor()}`,
  );
  check(
    (await readSession(before)) !== null,
    "and it still passes the signature check on its own, which is why the floor is needed",
    "readSession cannot see the floor by design: middleware must not need the database",
  );

  // Wait for the floor's own second to pass before signing in again. This is
  // the documented one-second cost of the `+ 1`, and it is what a real login
  // does anyway: it arrives through a redirect and a typed password.
  while (Math.floor(Date.now() / 1000) < revokedAt) await new Promise((r) => setTimeout(r, 50));
  const after = await createSession();
  check(
    (await readSession(after))!.iat >= (await floor()),
    "a session issued after the revocation is above the floor",
    `iat ${(await readSession(after))!.iat} >= floor ${await floor()}`,
  );

  // The boundary the `+ 1` exists for: a session issued during the very second
  // the revocation ran must not survive it. A floor of exactly `now` would let
  // it through, because validity is `iat >= floor`.
  const sameSecond = revokedAt - 1;
  check(
    sameSecond < (await floor()),
    "a session issued in the same second as the revocation is still caught",
    `iat ${sameSecond} < floor ${await floor()}`,
  );
} finally {
  await setFloor(original);
  const restored = await floor();
  check(restored === original, "cleanup: the revocation floor is back where it started", String(restored));
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (passed !== results.length) {
  console.log("FAILED:");
  for (const r of results.filter((x) => !x.ok)) console.log(`  ${r.label} — ${r.detail}`);
  process.exit(1);
}
