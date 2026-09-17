// The revocation floor for admin sessions — SERVER CODE ONLY.
// specs/SECURITY_HARDENING_SPEC.md S2.
//
// Kept apart from lib/adminAuth.ts on purpose. That module is imported by
// middleware and must stay free of the database and of `next/headers`; this one
// is the half that needs a query, and it is only ever reached from a Server
// Action or a Server Component.
//
// Why a single timestamp and not a session store: there is exactly one admin.
// Per-session revocation would mean minting ids and reading a store on every
// request in order to express "log this one device out and keep the others",
// which this business never needs. What it needs is "stop everything that is
// open now", and that is one number.

import "server-only";
import { sql } from "@/lib/db";

const KEY = "admin.sessions_valid_from";

/**
 * Epoch seconds. A session is valid only if its `iat` is at or after this.
 *
 * Fails CLOSED. If the row is missing or the query throws, this returns
 * Infinity, so every session is treated as revoked and the owner is sent to the
 * login page. The opposite default would mean a database blip silently
 * reinstating sessions she had revoked, which is the one outcome this whole
 * mechanism exists to prevent. Being asked to log in again is the cheap failure.
 */
export async function sessionsValidFrom(): Promise<number> {
  try {
    const rows = await sql<{ value: number }>`select value from settings where key = ${KEY}`;
    const v = rows[0]?.value;
    return typeof v === "number" && Number.isFinite(v) ? v : Infinity;
  } catch {
    return Infinity;
  }
}

/**
 * End every session that exists, including the caller's own.
 *
 * `+ 1`, and the direction matters. A session is valid while `iat >= validFrom`,
 * and both timestamps are whole seconds, so a floor of exactly `now` would let
 * a token issued during that same second survive the revocation that was meant
 * to kill it. Setting the floor one second into the future makes every token
 * issued at or before `now` invalid, which is the whole set that exists when
 * this runs.
 *
 * The cost is that a session minted in the same second as the revocation is
 * also refused. Reaching that would mean signing out of every device and
 * completing a fresh login inside one second, through a redirect and a
 * credential form; and the recovery is to sign in again a second later.
 */
export async function revokeAllSessions(): Promise<void> {
  const now = Math.floor(Date.now() / 1000) + 1;
  await sql`
    insert into settings (key, value, is_public) values (${KEY}, ${now}::text::jsonb, false)
    on conflict (key) do update set value = ${now}::text::jsonb`;
}
