"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  createSession,
  sessionCookieOptions,
  verifyCredentials,
} from "@/lib/adminAuth";
import { rateLimit } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";

export type LoginState = { error?: string };

// specs/SECURITY_HARDENING_SPEC.md S1. One username and one password stand
// between a stranger and every customer's name, phone number and address, so
// this form gets both halves of the guard:
//
//   - Turnstile, which is what stops a script submitting the form at all, needs
//     no account and is already used by the booking form and the lookup;
//   - a sliding window in lib/rateLimit.ts, which is Upstash when the owner has
//     an account and the old per-isolate Map when she does not.
//
// The Map that used to live here was not a rate limit. Cloudflare runs many
// isolates for one Worker, so five attempts per isolate is as many attempts as
// an attacker cares to buy, and a deploy reset it.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = await clientIp();

  // Counted before the password is looked at, so a correct guess arriving after
  // the allowance is spent still does not get in.
  const limit = await rateLimit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!limit.ok) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  // Turnstile before the credential check: an automated password run should not
  // even reach `verifyCredentials`, and the check costs a network call that a
  // real sign-in pays once.
  if (!(await verifyTurnstile(formData.get("turnstile"), ip === "unknown" ? null : ip))) {
    return { error: "We could not check that this came from a person. Please try again." };
  }

  const user = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!(await verifyCredentials(user, password))) {
    return { error: "Incorrect username or password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSession(), sessionCookieOptions());
  redirect("/admin");
}

export async function logout(): Promise<void> {
  // Clears the cookie in this browser only. Ending every session everywhere is
  // a separate, explicit control in Settings, because for a single admin an
  // ordinary log-out that also signed her out on her phone would be surprising
  // (SECURITY_HARDENING_SPEC S2).
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
