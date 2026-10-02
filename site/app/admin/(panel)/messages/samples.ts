// The bookings the message editor previews against. Made up, dated from today
// so the preview never shows a day long gone, and built on the server so the
// first paint and every re-render agree on what "today" is.
import { addDays } from "@/lib/bookingRules";
import type { CommsBooking } from "@/lib/comms/types";
import type { Extra } from "@/lib/comms/messages";

export type Sample = { label: string; booking: CommsBooking; extra: Extra };

/** `expiryMinutes` is the real "Confirm within" setting, so {hours} previews what she would be told. */
export function samples(today: string, expiryMinutes: number): Sample[] {
  const created = Date.parse(`${today}T05:00:00Z`);
  const person = {
    name: "Priya Sharma",
    phone: "9876543210",
    createdAt: new Date(created).toISOString(),
    expiresAt: new Date(created + expiryMinutes * 60_000).toISOString(),
  };
  return [
    {
      label: "A rental, with a pickup time",
      booking: {
        ...person,
        id: "sample-rental",
        code: "VVH-7K2M",
        email: "priya@example.com",
        pickup: addDays(today, 10),
        ret: addDays(today, 12),
        time: "11:30",
        items: [
          { name: "Rani Pink Bridal Lehenga", type: "rental", colour: null, size: null },
          { name: "Kundan Choker Set", type: "jewellery", colour: null, size: null },
          { name: "Chikankari Kurti", type: "retail", colour: "Mint", size: "M" },
        ],
      },
      // The raw link key is only ever handed to the first message; this stands
      // in for it so the preview shows the link she would really get.
      extra: { token: "sample-link-key", newReturn: addDays(today, 14) },
    },
    {
      label: "A one-day collection, no time chosen",
      booking: {
        ...person,
        id: "sample-collection",
        code: "VVH-3PQA",
        email: null,
        pickup: addDays(today, 4),
        ret: addDays(today, 4),
        time: null,
        items: [{ name: "Chikankari Kurti", type: "retail", colour: "Mint", size: "M" }],
      },
      extra: { token: "sample-link-key" },
    },
  ];
}
