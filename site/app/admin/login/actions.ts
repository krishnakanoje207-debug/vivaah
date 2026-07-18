"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  createSession,
  sessionCookieOptions,
  verifyCredentials,
} from "@/lib/adminAuth";

export type LoginState = { error?: string };

// Rate limit: 5 attempts / 15 min per IP.
// TODO: Upstash sliding window (IMPLEMENTATION_PLAN §7) — in-memory Map is
// per-worker-instance only and resets on redeploy; fine for the foundation.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = await clientIp();
  const now = Date.now();
  const rec = attempts.get(ip);
  const active = rec && rec.resetAt > now ? rec : undefined;

  if (active && active.count >= MAX_ATTEMPTS) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const user = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!(await verifyCredentials(user, password))) {
    const next = active ?? { count: 0, resetAt: now + WINDOW_MS };
    next.count += 1;
    attempts.set(ip, next);
    return { error: "Incorrect username or password." };
  }

  attempts.delete(ip);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSession(), sessionCookieOptions());
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
