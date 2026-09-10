"use server";

// Booking status transitions for the admin panel. Every transition is guarded
// IN SQL (`where id=… and status='<expected>'`) so a stale click or a second
// open tab can never drive an illegal move — if 0 rows match, the booking has
// already moved on and we return an error the UI surfaces. Transitions follow
// BOOKING_ENGINE_SPEC §1 exactly; the DB triggers cascade status to
// booking_items, so we never touch that table here.
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export type ActionState = { ok?: boolean; error?: string };

const STALE =
  "This booking already moved on — it may have expired or been updated in another tab. Refresh to see its current state.";

// Distinct from STALE: not a race on the row, a race on the DATES. The revive
// UPDATE re-fires the GiST exclusion constraint (23P01) if another booking took
// the range while this one sat cancelled.
const DATES_TAKEN =
  "Those dates are no longer free — another booking now holds them, so this one can’t be revived.";

function refresh(id: string) {
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);
}

// pending → confirmed: record verification, drop the hold deadline.
export async function verifyPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const rows = await sql`
    update bookings set status = 'confirmed', verified_at = now(), expires_at = null
    where id = ${id} and status = 'pending'
    returning id`;
  if (rows.length === 0) return { error: STALE };
  refresh(id);
  return { ok: true };
}

// pending → cancelled (admin reject before verification).
export async function cancelBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const rows = await sql`
    update bookings set status = 'cancelled', expires_at = null
    where id = ${id} and status = 'pending'
    returning id`;
  if (rows.length === 0) return { error: STALE };
  refresh(id);
  return { ok: true };
}

// confirmed → cancelled (admin, per policy). Dates release automatically.
export async function cancelConfirmed(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const rows = await sql`
    update bookings set status = 'cancelled'
    where id = ${id} and status = 'confirmed'
    returning id`;
  if (rows.length === 0) return { error: STALE };
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
         set status = 'confirmed', verified_at = coalesce(verified_at, now()), expires_at = null
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
