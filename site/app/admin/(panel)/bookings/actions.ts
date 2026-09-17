"use server";

// Booking status transitions for the admin panel. Every transition is guarded
// IN SQL (`where id=… and status='<expected>'`) so a stale click or a second
// open tab can never drive an illegal move — if 0 rows match, the booking has
// already moved on and we return an error the UI surfaces. Transitions follow
// BOOKING_ENGINE_SPEC_V2 §1; the DB triggers cascade status to booking_items,
// so we never touch that table here.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { sql } from "@/lib/db";
import { approveExtension, rejectExtension } from "@/lib/booking";
import { requireAdmin } from "@/lib/requireAdmin";
import { notify } from "@/lib/comms";

export type ActionState = { ok?: boolean; error?: string };

const STALE =
  "This booking already moved on — it may have lapsed or been updated in another tab. Refresh to see its current state.";

// Distinct from STALE: not a race on the row, a race on the DATES. The revive
// UPDATE re-fires the GiST exclusion constraint (23P01) if another booking took
// the range while this one sat cancelled.
const DATES_TAKEN =
  "Those dates are no longer free — another booking now holds them, so this one can’t be revived.";

const EXTENSION_STALE =
  "This request was already decided, or the booking is no longer confirmed or picked up. Refresh to see its current state.";

const EXTENSION_DATES_TAKEN =
  "Another booking holds one of these pieces in the extra days, so the booking can’t be extended. The request has been marked rejected; refresh to see it.";

function refresh(id: string) {
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);
}

// pending → confirmed: she has spoken to the customer and accepts the request.
// `verified_at` is reused as "confirmed at"; the lapse deadline no longer applies.
export async function confirmBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const rows = await sql`
    update bookings set status = 'confirmed', verified_at = now(), expires_at = null
    where id = ${id} and status = 'pending'
    returning id`;
  if (rows.length === 0) return { error: STALE };
  after(() => notify("booking.confirmed", id));
  refresh(id);
  return { ok: true };
}

// pending → cancelled (the shop declines the request).
export async function declineBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const rows = await sql`
    update bookings set status = 'cancelled', cancelled_by = 'shop', expires_at = null
    where id = ${id} and status = 'pending'
    returning id`;
  if (rows.length === 0) return { error: STALE };
  after(() => notify("booking.declined", id));
  refresh(id);
  return { ok: true };
}

// confirmed → cancelled (admin, per policy). Dates release automatically.
export async function cancelConfirmed(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const rows = await sql`
    update bookings set status = 'cancelled', cancelled_by = 'shop'
    where id = ${id} and status = 'confirmed'
    returning id`;
  if (rows.length === 0) return { error: STALE };
  after(() => notify("booking.cancelled_shop", id));
  refresh(id);
  return { ok: true };
}

// confirmed → cancelled, because nobody answered the call before the
// appointment (specs/RETAIL_SPEC.md R2). The same transition as cancelConfirmed
// and deliberately a separate action: the reason is recorded, so she can see
// how often this happens rather than reading it back out of free-text notes.
// Whatever the booking held is released by the triggers — the dates, and a
// retail piece's count.
export async function cancelNoAnswer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const rows = await sql`
    update bookings
       set status = 'cancelled', cancelled_by = 'shop', cancel_reason = 'no_answer'
     where id = ${id} and status = 'confirmed'
    returning id`;
  if (rows.length === 0) return { error: STALE };
  after(() => notify("booking.cancelled_no_answer", id));
  revalidatePath("/admin");
  refresh(id);
  return { ok: true };
}

// cancelled → confirmed (admin revive). The sync trigger re-derives the items to
// 'confirmed', re-firing the exclusion constraint — if the dates were taken while
// this booking sat cancelled, Postgres raises 23P01, which we surface distinctly
// from staleness. Revive IS the confirmed transition, so backfill verified_at.
export async function reviveBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  let rows;
  try {
    rows = await sql`
      update bookings
         set status = 'confirmed', verified_at = coalesce(verified_at, now()),
             expires_at = null, cancelled_by = null
       where id = ${id} and status = 'cancelled'
      returning id`;
  } catch (err) {
    // 23P01 = exclusion_violation: the dates are no longer free.
    if (err && typeof err === "object" && (err as { code?: string }).code === "23P01") {
      return { error: DATES_TAKEN };
    }
    throw err;
  }
  if (rows.length === 0) return { error: STALE };
  refresh(id);
  return { ok: true };
}

// confirmed → picked_up.
export async function markPickedUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const rows = await sql`
    update bookings set status = 'picked_up'
    where id = ${id} and status = 'confirmed'
    returning id`;
  if (rows.length === 0) return { error: STALE };
  refresh(id);
  return { ok: true };
}

// picked_up → returned (dates release automatically via the item sync trigger).
export async function markReturned(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const rows = await sql`
    update bookings set status = 'returned'
    where id = ${id} and status = 'picked_up'
    returning id`;
  if (rows.length === 0) return { error: STALE };
  refresh(id);
  return { ok: true };
}

// Extension decisions. The guarded writes live in lib/booking (approval widens
// the booking through the exclusion constraint); these only gate and word them.
export async function approveExtensionRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await approveExtension(String(formData.get("request")));
  // Not refreshed on failure: a collision marks the request rejected, and a
  // re-render would unmount these buttons and the message with them.
  if (!result.ok) return { error: result.error === "dates_taken" ? EXTENSION_DATES_TAKEN : EXTENSION_STALE };
  const id = String(formData.get("id"));
  // The booking row now carries the new return day, so the message reads it off
  // the booking rather than being told it twice.
  after(() => notify("extension.approved", id));
  refresh(id);
  return { ok: true };
}

export async function rejectExtensionRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await rejectExtension(String(formData.get("request")));
  if (!result.ok) return { error: EXTENSION_STALE };
  const id = String(formData.get("id"));
  after(() => notify("extension.rejected", id));
  refresh(id);
  return { ok: true };
}
