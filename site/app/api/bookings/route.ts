import { after } from "next/server";
import { createBooking } from "@/lib/booking";
import { notify } from "@/lib/comms";
import { RANGE_MESSAGES } from "@/lib/bookingRules";
import { clientIp, verifyTurnstile } from "@/lib/turnstile";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Create a booking request (specs/BOOKING_ENGINE_SPEC_V2.md §2.1). No payment:
 * the booking is `pending` until the shop confirms it, and holds its dates
 * meanwhile. Answers `{ code, token }`; the page then opens the status link.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid", message: "Something went wrong sending the form." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid", message: "Something went wrong sending the form." }, { status: 400 });
  }

  // Per IP, alongside the per-phone limit inside createBooking: that one stops
  // one customer flooding the shop with requests, this one stops one machine
  // holding dates across many invented phone numbers (SECURITY_HARDENING_SPEC S1).
  const ip = clientIp(req);
  const limit = await rateLimit(`booking:${ip ?? "unknown"}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: "rate_limited", message: "A lot of requests have come from this connection. Please wait a little, or call the shop." },
      { status: 429 },
    );
  }

  if (!(await verifyTurnstile(body.turnstile, ip))) {
    return Response.json(
      { error: "challenge", message: "We could not check that this came from a person. Please try again." },
      { status: 403 },
    );
  }

  const result = await createBooking({
    items: body.items,
    pickup: body.pickup,
    ret: body.return,
    time: body.time,
    name: body.name,
    phone: body.phone,
    email: body.email,
    note: body.note,
  });

  if (result.ok) {
    // After the response, never in front of it: she should not wait on a mail
    // server to see her own booking (specs/COMMS_FLOW_SPEC_V2.md §4 rule 3).
    // The raw token only exists here, so this is the one message that can
    // deep-link her straight into the booking.
    after(() => notify("booking.created", result.id, { token: result.token }));
    return Response.json({ code: result.code, token: result.token }, { status: 201 });
  }
  switch (result.error) {
    case "invalid":
      return Response.json({ error: "invalid", field: result.field, message: result.message }, { status: 400 });
    case "range":
      return Response.json({ error: "range", message: RANGE_MESSAGES[result.problem] }, { status: 400 });
    case "dates_taken":
      return Response.json(
        {
          error: "dates_taken",
          slugs: result.slugs,
          message: "Those dates were just taken for one of your pieces. Choose other dates.",
        },
        { status: 409 },
      );
    case "rate_limited":
      return Response.json(
        { error: "rate_limited", message: "A few bookings have already come from this number in the last hour. Please call the shop." },
        { status: 429 },
      );
  }
}
