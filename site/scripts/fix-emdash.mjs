/**
 * One-off: the project bans em dashes in visible copy, and the seeded
 * `sage-rose` description carries one. Rewrites that one field, both language
 * keys if present, and prints before/after so the change is auditable.
 *
 *   cd site && node scripts/fix-emdash.mjs          # dry run, shows the diff
 *   cd site && node scripts/fix-emdash.mjs --write  # applies it
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const match = env.match(/^DATABASE_URL=\s*["']?([^"'\r\n]+)/m);
if (!match) {
  console.error("DATABASE_URL not found in site/.env.local");
  process.exit(1);
}

const sql = neon(match[1]);
const WRITE = process.argv.includes("--write");
const EM_DASH = "—";

// " — " becomes a full stop and a capital. A comma was the first instinct, but
// the one row this touches already has commas either side, and "motifs, an
// unhurried, romantic look" stacks three of them. The clause after the dash
// reads as its own descriptive line, which is the site's voice anyway.
const clean = (s) =>
  s.replaceAll(/\s*—\s*(.)/g, (_, next) => `. ${next.toUpperCase()}`);

const rows = await sql`
  select slug, description
  from products
  where description::text like ${"%" + EM_DASH + "%"}
`;

if (rows.length === 0) {
  console.log("No product copy contains an em dash. Nothing to do.");
  process.exit(0);
}

for (const row of rows) {
  const next = {};
  for (const [lang, text] of Object.entries(row.description ?? {})) {
    next[lang] = typeof text === "string" ? clean(text) : text;
  }

  console.log(`\n${row.slug}`);
  for (const lang of Object.keys(next)) {
    if (next[lang] !== row.description[lang]) {
      console.log(`  ${lang} before: ${row.description[lang]}`);
      console.log(`  ${lang} after : ${next[lang]}`);
    }
  }

  if (WRITE) {
    await sql`
      update products set description = ${JSON.stringify(next)}::jsonb
      where slug = ${row.slug}
    `;
  }
}

if (!WRITE) {
  console.log("\nDry run. Re-run with --write to apply.");
} else {
  const left = await sql`
    select count(*)::int as n from products
    where description::text like ${"%" + EM_DASH + "%"}
  `;
  console.log(`\nApplied. Product rows still containing an em dash: ${left[0].n}`);
}
