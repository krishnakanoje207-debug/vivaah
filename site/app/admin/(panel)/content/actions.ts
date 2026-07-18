"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

export type ContentState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Upsert a content block: key + {en, hi}. Editing an existing key overwrites it.
export async function saveBlock(_prev: ContentState, form: FormData): Promise<ContentState> {
  const key = String(form.get("key") ?? "").trim();
  const en = String(form.get("en") ?? "");
  const hi = String(form.get("hi") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (key === "") {
    fieldErrors.key = "A key is required (e.g. home.hero).";
  } else if (!/^[a-z0-9]+([._-][a-z0-9]+)*$/.test(key)) {
    fieldErrors.key = "Use lowercase letters, numbers and . _ - only (e.g. home.hero).";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const content = JSON.stringify({ en, hi });
  await sql`
    insert into site_content (key, content)
    values (${key}, ${content}::jsonb)
    on conflict (key) do update set content = excluded.content
  `;

  revalidatePath("/admin/content");
  return { ok: true };
}

export async function deleteBlock(form: FormData): Promise<void> {
  const key = String(form.get("key") ?? "").trim();
  if (key) {
    await sql`delete from site_content where key = ${key}`;
    revalidatePath("/admin/content");
  }
}
