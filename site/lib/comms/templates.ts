// Where the shop's own wording is kept — SERVER CODE ONLY.
// specs/COMMS_TEMPLATES_SPEC.md §3.
//
// One row in `settings`, key `comms.templates`, is_public false:
//
//     { "en": { "customer:booking.created": { "subject": "...", "text": "..." }, ... } }
//
// Only overrides are stored. No row, or no key for a message, means the built-in
// wording in lib/comms/messages.ts, so nothing is seeded and the defaults have
// one home. The `en` level is where Phase 4's Hindi goes beside it.
//
// `settings` and not `site_content` (which COMMS_FLOW_SPEC_V2 §4.2 named): the
// storefront role can read every site_content row, and nothing public needs the
// wording of the shop's own alerts; and the Content page renders every
// site_content row as an en/hi text block, where this nested row would show up
// broken. A settings row with is_public false is owner-only under the policy
// that already exists, so it needs no migration and no new grant.

import { sql } from "@/lib/db";
import type { Template } from "@/lib/comms/messages";

const KEY = "comms.templates";

/** Every stored override, by message id. Throws if the read fails; callers decide what that means. */
export async function readTemplates(): Promise<Record<string, unknown>> {
  const rows = await sql<{ en: unknown }>`select value->'en' as en from settings where key = ${KEY}`;
  const en = rows[0]?.en;
  return en && typeof en === "object" && !Array.isArray(en) ? (en as Record<string, unknown>) : {};
}

/**
 * Keep the shop's wording for one message. One statement, merged on the server,
 * so two messages saved at once cannot overwrite each other.
 */
export async function storeTemplate(id: string, t: Template): Promise<void> {
  const own = JSON.stringify({ subject: t.subject, text: t.text });
  await sql`
    insert into settings (key, value, is_public)
    values (${KEY}, jsonb_build_object('en', jsonb_build_object(${id}::text, ${own}::jsonb)), false)
    on conflict (key) do update
       set value = settings.value || jsonb_build_object(
             'en', coalesce(settings.value->'en', '{}'::jsonb) || jsonb_build_object(${id}::text, ${own}::jsonb))`;
}

/** Forget the shop's wording for one message, so the built-in wording goes out again. */
export async function clearTemplate(id: string): Promise<void> {
  await sql`
    update settings set value = jsonb_set(value, '{en}', coalesce(value->'en', '{}'::jsonb) - ${id}::text)
     where key = ${KEY}`;
}
