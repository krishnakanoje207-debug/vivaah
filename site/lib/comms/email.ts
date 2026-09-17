// Email via Resend — SERVER CODE ONLY. The only channel of the five in
// specs/COMMS_FLOW_SPEC_V2.md §3 that can send anything today.
//
// Two separate switches, because they light up at different times:
//
//   RESEND_API_KEY   an account exists          -> the owner can be told.
//   COMMS_FROM       a verified sending domain  -> the customer can be told.
//
// Resend will not deliver to an arbitrary recipient from an unverified domain;
// until the client buys the domain it delivers only to the address that owns the
// account. So owner alerts work the day a key exists, and customer mail stays
// dark rather than half-sending. A message that reaches the shop but not the
// bride is worse than a clean "not configured".

import type { SendResult } from "@/lib/comms/types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** The address the shop reads. Owner alerts are pointless without it. */
export const ownerAddress = () => process.env.OWNER_EMAIL || null;

/**
 * The From address. `onboarding@resend.dev` is Resend's shared sender: it works
 * with no domain, but only to the account's own address, so it is treated as
 * owner-only below.
 */
const fromAddress = () => process.env.COMMS_FROM || "onboarding@resend.dev";

const isVerifiedDomain = () => {
  const from = process.env.COMMS_FROM;
  return !!from && !from.trim().toLowerCase().endsWith("@resend.dev");
};

/** Why a send would be skipped, or null if it would go. */
export function emailBlocker(to: "owner" | "customer", address: string | null): string | null {
  if (!process.env.RESEND_API_KEY) return "not_configured: no RESEND_API_KEY";
  if (!address) return to === "owner" ? "not_configured: no OWNER_EMAIL" : "no_address: she gave no email";
  if (to === "customer" && !isVerifiedDomain()) return "not_configured: no verified sending domain";
  return null;
}

export async function sendEmail(
  to: "owner" | "customer",
  address: string | null,
  subject: string,
  text: string
): Promise<SendResult> {
  const blocked = emailBlocker(to, address);
  if (blocked) return { status: "skipped", address, detail: blocked };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Vivaah Dresses and Suits <${fromAddress()}>`,
        to: [address],
        subject,
        text,
        html: html(text),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { status: "failed", address, detail: `${res.status} ${body.slice(0, 200)}` };
    }
    const data = (await res.json()) as { id?: string };
    return { status: "sent", address, detail: data.id ?? null };
  } catch (e) {
    // Never rethrow: a booking must not fail because a mail server did.
    return { status: "failed", address, detail: e instanceof Error ? e.message.slice(0, 200) : "send failed" };
  }
}

/**
 * The plain text, wrapped in the site's colours. Deliberately small: a
 * table-based marketing template would be a different voice from the one the
 * text is written in, and every client renders this one the same way.
 */
function html(text: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = esc(text)
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return (
    `<div style="background:#faf8f5;padding:32px 16px;font-family:Georgia,'Times New Roman',serif">` +
    `<div style="max-width:520px;margin:0 auto;background:#fff;padding:32px;border-top:3px solid #a8894a">` +
    `<div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#a8894a;margin-bottom:24px">Vivaah</div>` +
    `<div style="font-size:16px;line-height:1.6;color:#2a2028">${body}</div>` +
    `</div></div>`
  );
}
