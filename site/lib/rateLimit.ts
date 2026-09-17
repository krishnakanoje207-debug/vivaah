// Rate limiting — SERVER CODE ONLY. specs/SECURITY_HARDENING_SPEC.md S1.
//
// The limiter that was here before this file lived in a module-level Map in
// app/admin/login/actions.ts and carried its own TODO. On Cloudflare that Map is
// per-isolate: the platform runs many isolates for one Worker, so an attacker
// spreading requests gets the whole allowance *per isolate*, and every deploy
// empties it. It was a speed bump on one machine, not a rate limit.
//
// Upstash over its REST API, because it is `fetch` and nothing else, which is
// what a Worker can do. Hand-rolled rather than pulling in @upstash/ratelimit
// and @upstash/redis: this is the only limiter the site needs, it is a sliding
// window log in four commands, and the project has just spent a performance pass
// taking weight out of the bundle.
//
// A sliding window log, not a fixed window: a fixed window lets twice the
// allowance through across a boundary, which for a five-attempt login window is
// the difference between five guesses and ten.

import "server-only";

export type Decision = {
  ok: boolean;
  /** Attempts used in the current window, including this one. */
  count: number;
  limit: number;
  /** Which store answered. `memory` means Upstash is not configured or failed. */
  backend: "upstash" | "memory";
};

const url = () => process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.UPSTASH_REDIS_REST_TOKEN;

export const rateLimitBackend = (): "upstash" | "memory" => (url() && token() ? "upstash" : "memory");

/**
 * Count this hit against `key` and say whether it is allowed.
 *
 * Never throws. A limiter that takes down the thing it protects is worse than
 * the attack: if Upstash is unreachable this falls through to the in-process
 * window rather than refusing the request, and reports `memory` so the caller
 * can see which answered. On the login that is the safe direction, because the
 * form is also behind Turnstile.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<Decision> {
  if (rateLimitBackend() === "upstash") {
    try {
      const count = await upstashSlidingWindow(key, windowMs);
      return { ok: count <= limit, count, limit, backend: "upstash" };
    } catch {
      // fall through to memory
    }
  }
  const count = memorySlidingWindow(key, windowMs);
  return { ok: count <= limit, count, limit, backend: "memory" };
}

/**
 * ZREMRANGEBYSCORE to drop what has aged out, ZADD this hit, ZCARD to count,
 * PEXPIRE so an idle key cannot live forever. Sent as one pipeline: four round
 * trips to another continent on a login is not worth the tidiness of four calls.
 *
 * The member has to be unique or ZADD would overwrite a hit that happened in the
 * same millisecond and undercount a burst, which is exactly the shape of the
 * traffic this is meant to catch.
 */
async function upstashSlidingWindow(key: string, windowMs: number): Promise<number> {
  const now = Date.now();
  const member = `${now}-${crypto.randomUUID()}`;
  const res = await fetch(`${url()}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["ZREMRANGEBYSCORE", key, 0, now - windowMs],
      ["ZADD", key, now, member],
      ["ZCARD", key],
      ["PEXPIRE", key, windowMs],
    ]),
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const out = (await res.json()) as { result?: number; error?: string }[];
  const card = out[2]?.result;
  if (typeof card !== "number") throw new Error("upstash: no count");
  return card;
}

// --- the fallback -----------------------------------------------------------
// Per-isolate and therefore partial, which is the whole reason S1b exists. It is
// kept because partial is better than nothing while the owner has no Upstash
// account, and because it is what answers if Upstash is ever unreachable.

const hits = new Map<string, number[]>();

function memorySlidingWindow(key: string, windowMs: number): number {
  const now = Date.now();
  const kept = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
  kept.push(now);
  hits.set(key, kept);
  // Unbounded growth is a real risk in a long-lived isolate under attack, since
  // every distinct IP leaves a key behind. Sweep the dead ones occasionally.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => t <= now - windowMs)) hits.delete(k);
  }
  return kept.length;
}
