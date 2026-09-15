import { getNewArrivals } from "@/lib/rentals";

/**
 * The pieces behind the new-stock notice, read by the notice after it mounts.
 *
 * A route rather than a query in the root layout: `/retail`, `/visit`,
 * `/policies` and `/jewellery` are prerendered, so a layout read would freeze
 * the list at deploy time on those pages and never announce what arrived since.
 *
 * `force-dynamic` for the same reason as sitemap.ts. A failed read answers an
 * empty list: the notice is never an error the visitor should meet.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const pieces = await getNewArrivals().catch(() => []);
  return Response.json(pieces, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=300" },
  });
}
