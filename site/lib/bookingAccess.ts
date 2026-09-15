// Proof that a visitor may see one booking — SERVER CODE ONLY.
//
// Two proofs open a booking (specs/BOOKING_ENGINE_SPEC_V2.md §3): the token in
// the status link, or the booking code + the phone it was made with. The second
// is exchanged once for this cookie, so a customer who lost the link does not
// have to pass Turnstile again on every reload or to cancel.
//
// The cookie names one booking and expires; it is an HMAC over both, keyed with
// SESSION_SECRET and domain-separated from the admin session ("booking:" prefix),
// so an admin session token can never pass as one of these or the reverse.

const TTL_SECONDS = 7 * 24 * 60 * 60;

export const accessCookieName = (code: string) => `vivaah_bk_${code}`;

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(message: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))));
}

function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function issueAccess(code: string): Promise<{ name: string; value: string; options: object }> {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  return {
    name: accessCookieName(code),
    value: `${exp}.${await sign(`booking:${code}:${exp}`)}`,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: TTL_SECONDS,
    },
  };
}

export async function verifyAccess(code: string, value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const dot = value.indexOf(".");
  const exp = Number(value.slice(0, dot));
  if (dot <= 0 || !Number.isInteger(exp) || exp * 1000 <= Date.now()) return false;
  return equal(await sign(`booking:${code}:${exp}`), value.slice(dot + 1));
}
