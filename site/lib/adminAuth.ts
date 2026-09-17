// App-layer session auth for the single owner-admin. WebCrypto only (no Node
// `crypto`) so this module runs in both middleware (Edge) and route handlers on
// Cloudflare Workers. Deliberately imports nothing from `next/headers` — cookie
// read/write lives in the caller (middleware reads the request cookie; the login
// server action sets it) so middleware can import verifySession() safely.

export const SESSION_COOKIE = "vivaah_admin";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// --- base64url <-> bytes -----------------------------------------------------
function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Length-independent constant-time byte compare (length is not secret here).
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// --- password (PBKDF2/SHA-256) ----------------------------------------------
async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    keyMaterial,
    256, // 32-byte key
  );
  return new Uint8Array(bits);
}

// storedHash format: pbkdf2:<iterations>:<salt_b64url>:<hash_b64url>
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number.parseInt(parts[1], 10);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  const derived = await pbkdf2(password, b64urlToBytes(parts[2]), iterations);
  return timingSafeEqual(derived, b64urlToBytes(parts[3]));
}

export async function verifyCredentials(user: string, password: string): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USER;
  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUser || !storedHash) {
    throw new Error("Admin auth not configured (ADMIN_USER / ADMIN_PASSWORD_HASH).");
  }
  const enc = new TextEncoder();
  const userOk = timingSafeEqual(enc.encode(user), enc.encode(expectedUser));
  const passOk = await verifyPassword(password, storedHash); // always run (no short-circuit)
  return userOk && passOk;
}

// --- session token ----------------------------------------------------------
// <expEpochSeconds>.<iatEpochSeconds>.<base64url HMAC-SHA256(secret, "exp.iat")>
//
// The issued-at is what makes revocation possible (SECURITY_HARDENING_SPEC S2).
// Before it the token carried only an expiry, so every session minted in the
// same second was byte-identical and none of them could be told apart, let
// alone stopped. `lib/adminSessions.ts` holds the floor that `iat` is compared
// against; this module stays free of the database and of `next/headers` so
// middleware can keep importing it.
//
// Two-part tokens from before this change no longer parse and are refused. That
// is deliberate: the point of the change is to be able to invalidate sessions,
// so the ones issued while that was impossible do not get grandfathered in.
async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    b64urlToBytes(secret) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

export type SessionClaims = { exp: number; iat: number };

export async function createSession(): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set.");
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + SESSION_TTL_SECONDS;
  const sig = await hmac(secret, `${exp}.${iat}`);
  return `${exp}.${iat}.${bytesToB64url(sig)}`;
}

/**
 * Verify signature and expiry, and hand back the claims.
 *
 * This is everything that can be decided without the database. Whether the
 * session has been revoked is a separate question, asked by `requireAdmin()`
 * and the admin layout through `lib/adminSessions.ts`, because answering it
 * needs a query and this module is imported by middleware.
 */
export async function readSession(token: string | undefined | null): Promise<SessionClaims | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null; // including every pre-revocation token
  const exp = Number.parseInt(parts[0], 10);
  const iat = Number.parseInt(parts[1], 10);
  if (!Number.isInteger(exp) || !Number.isInteger(iat)) return null;
  if (exp * 1000 <= Date.now()) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const expected = await hmac(secret, `${parts[0]}.${parts[1]}`);
  if (!timingSafeEqual(expected, b64urlToBytes(parts[2]))) return null;
  return { exp, iat };
}

/** Signature and expiry only. Middleware's check; not authoritative on its own. */
export async function verifySession(token: string | undefined | null): Promise<boolean> {
  return (await readSession(token)) !== null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
