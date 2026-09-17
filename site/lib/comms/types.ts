// Shared shapes for the comms layer. Kept apart from index.ts so the message
// copy can import them without pulling in the database client.

export type EventKind =
  | "booking.created"
  | "booking.confirmed"
  | "booking.declined"
  | "booking.lapsed"
  | "booking.cancelled_shop"
  | "booking.cancelled_no_answer"
  | "booking.cancelled_customer"
  | "extension.requested"
  | "extension.approved"
  | "extension.rejected";

/** Everything a message needs, loaded in one query by `notify`. */
export type CommsBooking = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string | null;
  pickup: string;
  ret: string;
  time: string | null;
  expiresAt: string | null;
  createdAt: string;
  items: { name: string; colour: string | null; size: string | null }[];
};

export type Channel = "email" | "whatsapp" | "sms" | "push";
export type Recipient = "owner" | "customer";

/** What one channel did with one message. A dark channel is `skipped`, not an error. */
export type SendResult = {
  status: "sent" | "failed" | "skipped";
  address: string | null;
  detail: string | null;
};
