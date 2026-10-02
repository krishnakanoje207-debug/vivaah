import { SLOTS, type Slot } from "@/lib/comms/messages";

// A message's address in the panel: "customer:booking.cancelled_no_answer" ->
// "customer-booking-cancelled-no-answer". No dots, so nothing along the way can
// mistake the last segment for a file extension.
export const slugOf = (slot: Slot) => slot.id.replace(/[:._]/g, "-");
export const slotBySlug = (slug: string) => SLOTS.find((s) => slugOf(s) === slug);
