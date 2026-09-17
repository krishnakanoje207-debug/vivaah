import { cookies } from "next/headers";
import { after } from "next/server";
import { getBookingForVisitor, quoteExtension, requestExtension } from "@/lib/booking";
import { notify } from "@/lib/comms";
import { accessCookieName } from "@/lib/bookingAccess";

/**
 * Ask to keep a booking longer (BOOKING_ENGINE_SPEC §2.5, V2 §2.5).
 *
 *   POST { token?, newReturn: "YYYY-MM-DD", quote: true }   price + feasibility only
 *   POST { token?, newReturn: "YYYY-MM-DD" }                record the request
 *
 * The charge is quoted and recorded; it is paid at the shop. The shop approves in
 * admin, where the exclusion constraint has the final word.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { token?: unknown; newReturn?: unknown; quote?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : null;
  const cookie = (await cookies()).get(accessCookieName(code))?.value;

  const booking = await getBookingForVisitor(code, token, cookie);
  if (!booking) return Response.json({ error: "not_found" }, { status: 404 });

  const newReturn = typeof body?.newReturn === "string" ? body.newReturn : "";
  const quoting = body?.quote === true;
  const result = quoting ? await quoteExtension(booking.id, newReturn) : await requestExtension(booking.id, newReturn);
  // Only a recorded request is news. A quote is her looking at a price.
  if (!quoting && result.ok) after(() => notify("extension.requested", booking.id, { newReturn }));
  return Response.json(result, { status: result.ok ? 200 : 409 });
}
