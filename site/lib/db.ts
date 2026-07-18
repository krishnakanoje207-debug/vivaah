// Neon Postgres client — SERVER CODE ONLY. Reads DATABASE_URL (owner connection,
// bypasses RLS), so this module must never be imported into client components.
// No `server-only` package is installed; keep imports of this file in server files.
import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null = null;

function getClient() {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — cannot connect to Neon Postgres.");
  }
  client = neon(url);
  return client;
}

// Lazily-initialised tagged-template helper. Usage: const rows = await sql`select 1`;
export function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...params: unknown[]
): Promise<T[]> {
  return getClient()(strings, ...params) as Promise<T[]>;
}
