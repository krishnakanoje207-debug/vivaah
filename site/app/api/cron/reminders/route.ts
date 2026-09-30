import { isDate } from "@/lib/bookingRules";
import { cronKey } from "@/lib/cronKey";
import { sendReminders } from "@/lib/reminders";

/**
 * The daily reminders (COMMS_FLOW_SPEC_V2 E10, E11), called by the Worker's own
 * `scheduled` handler in custom-worker.ts at 09:00 IST. It never crosses the
 * network: the handler calls the Next server in-process with a key derived from
 * SESSION_SECRET (lib/cronKey.ts). Anything without that key gets a plain 404,
 * the same as a route that does not exist.
 *
 *   POST /api/cron/reminders                            today, in IST
 *   POST /api/cron/reminders  {"day":"YYYY-MM-DD"}      another day
 *
 * The cron never sends `day`. It exists for the gate: every harness here runs
 * against the live database, so scripts/verify-reminders.mts needs a day no real
 * booking holds, the way verify-booking books ten weeks out.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !same(req.headers.get("authorization") ?? "", `Bearer ${await cronKey(secret)}`)) {
    return new Response(null, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as { day?: unknown } | null;
  const day = isDate(body?.day) ? body.day : undefined;
  return Response.json(await sendReminders(day));
}

// Constant time over the whole string. The length is not secret: it is fixed.
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
