// Cloudflare Turnstile verification — SERVER CODE ONLY.
//
// Production requires TURNSTILE_SECRET_KEY: without it every protected request
// is refused, because a booking form with no bot check would let anyone hold
// every garment's dates with a loop. Outside production, Cloudflare's published
// always-pass test secret stands in, so the flow works on a dev machine with no
// account (https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

const TEST_SECRET = "1x0000000000000000000000000000000AA";

export function turnstileSecret(): string | null {
  const s = process.env.TURNSTILE_SECRET_KEY;
  if (s) return s;
  return process.env.NODE_ENV === "production" ? null : TEST_SECRET;
}

export async function verifyTurnstile(token: unknown, ip: string | null): Promise<boolean> {
  const secret = turnstileSecret();
  if (!secret || typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false; // fail closed: an unreachable verifier is not a pass
  }
}

export const clientIp = (req: Request) =>
  req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
