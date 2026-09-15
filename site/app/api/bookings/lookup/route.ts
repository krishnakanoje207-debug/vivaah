import { cookies } from "next/headers";
import { getBookingByPhone } from "@/lib/booking";
import { issueAccess } from "@/lib/bookingAccess";
import { CODE_RE } from "@/lib/bookingRules";
import { clientIp, verifyTurnstile } from "@/lib/turnstile";

/**
 * Open a booking with its code + the phone it was made with, for a customer who
 * no longer has the status link (specs/BOOKING_ENGINE_SPEC_V2.md §3). Success
 * sets a signed cookie for that one booking; the answer is the same 404 whether
 * the code does not exist or the phone does not match.
 */
export const dynamic = "force-dynamic";

const NOT_FOUND = { error: "not_found", message: "We could not find a booking with that code and phone number." };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const phone = typeof body?.phone === "string" ? body.phone : "";

  if (!(await verifyTurnstile(body?.turnstile, clientIp(req)))) {
    return Response.json(
      { error: "challenge", message: "We could not check that this came from a person. Please try again." },
      { status: 403 },
    );
  }
  if (!CODE_RE.test(code)) return Response.json(NOT_FOUND, { status: 404 });

  const booking = await getBookingByPhone(code, phone);
  if (!booking) return Response.json(NOT_FOUND, { status: 404 });

  const c = await issueAccess(code);
  (await cookies()).set(c.name, c.value, c.options);
  return Response.json({ code });
}
