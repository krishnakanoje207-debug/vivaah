// The key the Worker's cron presents to /api/cron/reminders.
//
// Derived from SESSION_SECRET instead of being a secret of its own, so shipping
// the reminders needs no new `wrangler secret put`. That hands out nothing new:
// whoever holds SESSION_SECRET can already mint an admin session. The label keeps
// the two uses apart, since a session signature is an HMAC of "<exp>.<iat>" and
// can never equal this one.
//
// WebCrypto and no imports, because custom-worker.ts bundles this outside Next.
export async function cronKey(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode("vivaah:cron:reminders")));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}
