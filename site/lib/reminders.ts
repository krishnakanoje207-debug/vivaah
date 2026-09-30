// E10 and E11, the two reminders (specs/COMMS_FLOW_SPEC_V2.md §2). SERVER CODE ONLY.
//
// Raised once a day at 09:00 IST by the Worker's cron (custom-worker.ts, then
// /api/cron/reminders), never by the lazy sweep: a reminder that arrived only if
// a stranger happened to load the site would be worse than none. The cost is one
// Neon wake a day. What the spec rejected was an hourly schedule that kept a free
// database awake to find nothing.
//
// Idempotent through comms_log: a booking that already has a row for the event
// is not reminded again, so a second firing on the same day sends nothing (Cron
// Triggers do not promise exactly once). A skipped send counts as the attempt on
// purpose. The reminder is for that morning, and nothing later in the day is
// worth retrying for.

import { sql } from "@/lib/db";
import { notify } from "@/lib/comms";
import { todayIST } from "@/lib/bookingRules";

export async function sendReminders(day = todayIST()): Promise<{ pickup: string[]; ret: string[] }> {
  // E10, the day she collects. Confirmed only: a request the shop has not
  // answered is not a booking yet, and its own lapse mail will tell her if it dies.
  const pickup = await sql<{ id: string }>`
    select b.id from bookings b
     where b.status = 'confirmed'
       and lower(b.booked_range) = ${day}::date
       and not exists (select 1 from comms_log c where c.booking_id = b.id and c.event = 'reminder.pickup')`;

  // E11, the day it goes back. Still `confirmed` counts as well as `picked_up`:
  // the shop not having marked the pickup in the panel is no reason to stay quiet.
  // Only a basket with something rented in it, because a bought piece never returns.
  const ret = await sql<{ id: string }>`
    select b.id from bookings b
     where b.status in ('confirmed', 'picked_up')
       and upper(b.booked_range) - 1 = ${day}::date
       and exists (select 1 from booking_items bi join products p on p.id = bi.product_id
                    where bi.booking_id = b.id and p.type <> 'retail')
       and not exists (select 1 from comms_log c where c.booking_id = b.id and c.event = 'reminder.return')`;

  for (const { id } of pickup) await notify("reminder.pickup", id);
  for (const { id } of ret) await notify("reminder.return", id);
  return { pickup: pickup.map((r) => r.id), ret: ret.map((r) => r.id) };
}
