"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/requireAdmin";
import { SLOTS, validate } from "@/lib/comms/messages";
import { clearTemplate, storeTemplate } from "@/lib/comms/templates";

export type TemplateState = {
  ok?: boolean;
  /** Set when the message went back to the built-in wording, so the form can show it. */
  reverted?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Save the shop's wording for one message, or go back to the built-in wording.
 *
 * The rules are the ones `notify` applies again on every send
 * (lib/comms/messages.ts `validate`), so what is refused here is exactly what
 * would never be sent. Wording identical to the built-in is stored as no
 * override at all, so a later improvement to the built-in copy reaches her
 * instead of being frozen behind a copy of the old one.
 */
export async function saveTemplate(_prev: TemplateState, form: FormData): Promise<TemplateState> {
  await requireAdmin();
  const slot = SLOTS.find((s) => s.id === String(form.get("id") ?? ""));
  if (!slot) return { error: "That message does not exist. Go back to the list and try again." };

  if (form.get("intent") === "revert") {
    await clearTemplate(slot.id);
    revalidatePath("/admin/messages", "layout");
    return { ok: true, reverted: true };
  }

  // Browsers send a textarea's line breaks as \r\n; the renderer splits on \n.
  const subject = String(form.get("subject") ?? "").trim();
  const text = String(form.get("text") ?? "").replace(/\r\n?/g, "\n").trim();
  const fieldErrors = validate({ subject, text }, slot);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  if (subject === slot.builtIn.subject && text === slot.builtIn.text) await clearTemplate(slot.id);
  else await storeTemplate(slot.id, { subject, text });
  revalidatePath("/admin/messages", "layout");
  return { ok: true };
}
