import { cookies } from "next/headers";
import { after } from "next/server";
import { cancelByCustomer, getBookingForVisitor } from "@/lib/booking";
import { notify } from "@/lib/comms";
import { accessCookieName } from "@/lib/bookingAccess";

/**
 * Customer cancellation (specs/BOOKING_ENGINE_SPEC_V2.md §2.6): allowed while the
 * booking is pending or confirmed and pickup is more than the cutoff away. The
 * proof is the link token (body) or the signed lookup cookie; the booking id the
 * UPDATE targets comes from that authenticated load, never from the request.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : null;
  const cookie = (await cookies()).get(accessCookieName(code))?.value;

  const booking = await getBookingForVisitor(code, token, cookie);
  if (!booking) return Response.json({ error: "not_found" }, { status: 404 });

  if (!(await cancelByCustomer(booking.id))) {
    return Response.json(
      {
        error: "not_cancellable",
        message:
          booking.status === "cancelled"
            ? "This booking is already cancelled."
            : "It is too close to pickup to cancel online. Please call the shop.",
      },
      { status: 409 },
    );
  }
  // The shop needs to know the dates are free again; she gets an acknowledgement.
  after(() => notify("booking.cancelled_customer", booking.id));
  return Response.json({ ok: true });
}
