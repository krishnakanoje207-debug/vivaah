import { getBlockedRanges, getBookables, getPublicBookingSettings, lapseExpired } from "@/lib/booking";
import { MAX_ITEMS, isDate, todayIST, wouldBlock } from "@/lib/bookingRules";
import { sqlPublic } from "@/lib/dbPublic";

/**
 * The calendar behind /reserve (specs/BOOKING_ENGINE_SPEC_V2.md §6).
 *
 *   GET /api/availability?items=a,b                      blocked ranges per piece
 *   GET /api/availability?items=a,b&from=D&to=D          + jewellery free for D..D
 *
 * A retail piece carries its colours and their sizes instead of blocked days:
 * it is guarded by a count, not by a calendar. /reserve re-reads this after a
 * lost race so a size that has just gone stops being offered.
 *
 * Dates only: product_unavailable_ranges() on the storefront connection is the
 * one sanctioned public view of the calendar, and it carries nothing about who
 * holds a date. The lapse sweep runs first on the owner connection so a hold
 * whose window has passed is not shown as taken.
 */
export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]{1,120}$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slugs = [...new Set((url.searchParams.get("items") ?? "").split(",").filter((s) => SLUG_RE.test(s)))].slice(0, MAX_ITEMS);

  await lapseExpired();
  const [settings, products] = await Promise.all([getPublicBookingSettings(), getBookables(slugs)]);
  const blocked = await getBlockedRanges(products.map((p) => p.id));

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  let jewellery: { slug: string; name: string; pricePerDay: number | null; image: string | null }[] | undefined;
  if (isDate(from) && isDate(to) && from <= to) {
    const range = wouldBlock(from, to, settings.bufferDays);
    const rows = await sqlPublic<{ slug: string; name: string; rental_price: string | null; images: unknown }>`
      select p.slug, p.name, p.rental_price, p.images
        from products p
       where p.type = 'jewellery' and p.is_active
         and not (p.slug = any(${slugs}::text[]))
         and not exists (
           select 1 from product_unavailable_ranges(p.id) r
            where r.blocked && daterange(${range.start}::date, ${range.end}::date, '[)'))
       order by p.created_at desc
       limit 24`;
    jewellery = rows.map((r) => {
      const first = Array.isArray(r.images) ? (r.images[0] as { path?: unknown } | undefined) : undefined;
      const path = typeof first?.path === "string" && /^(\/(?!\/)|https:\/\/)/.test(first.path) ? first.path : null;
      return { slug: r.slug, name: r.name, pricePerDay: r.rental_price == null ? null : Number(r.rental_price), image: path };
    });
  }

  return Response.json(
    {
      today: todayIST(),
      bufferDays: settings.bufferDays,
      cancelCutoffHours: settings.cancelCutoffHours,
      pickupHours: settings.pickupHours,
      products: products.map((p) => ({
        slug: p.slug,
        name: p.name,
        type: p.type,
        pricePerDay: p.pricePerDay,
        blocked: blocked.get(p.id) ?? [],
        // Retail is not held by its dates but by a count, so what this route
        // reports for it is which sizes are still to be had. No quantity
        // crosses the wire — `RetailVariant` carries none (RETAIL_SPEC R3).
        ...(p.type === "retail" ? { variants: p.variants } : {}),
      })),
      ...(jewellery ? { jewellery } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
