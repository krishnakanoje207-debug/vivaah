// Neon Postgres client — SERVER CODE ONLY. Reads DATABASE_URL_PUBLIC (the
// app_public role: RLS-constrained, SELECT-only on the public catalogue), so
// this module must never be imported into client components.
// No `server-only` package is installed; keep imports of this file in server files.
import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null = null;

function getClient() {
  if (client) return client;
  const url = process.env.DATABASE_URL_PUBLIC;
  if (!url) {
    throw new Error("DATABASE_URL_PUBLIC is not set — cannot connect to Neon Postgres.");
  }
  client = neon(url);
  return client;
}

// Lazily-initialised tagged-template helper. Usage: const rows = await sqlPublic`select 1`;
export function sqlPublic<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...params: unknown[]
): Promise<T[]> {
  return getClient()(strings, ...params) as Promise<T[]>;
}
