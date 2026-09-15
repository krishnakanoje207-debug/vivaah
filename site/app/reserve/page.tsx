import type { Metadata } from "next";
import { getBookables } from "@/lib/booking";
import { MAX_ITEMS } from "@/lib/bookingRules";
import { RENTAL_CATEGORIES } from "@/lib/categories";
import { jewelleryImage } from "@/app/jewellery/images";
import { ReserveFlow, type ReservePiece } from "@/components/booking/ReserveFlow";
import { ReserveEmpty } from "@/components/booking/ReserveEmpty";

/**
 * The booking page (specs/BOOKING_ENGINE_SPEC_V2.md, D5): one page for a
 * product page's Reserve and for the selection tray, `/reserve?items=a,b`.
 *
 *   Act      Ground        Composition                            Device
 *   Head     violet-950    the pieces hung on a rail, the ask      tear
 *   Booking  porcelain-50  dates, time, details; the slip beside   the calendar
 *
 * Rentals and jewellery share one date range. Retail is not bookable until
 * Phase 3, and getBookables drops it along with anything inactive, so a stale
 * link from the tray simply loses the pieces that can no longer be booked.
 *
 * Not indexed: the page is a form about pieces someone chose, and a search
 * result pointing at it would open on somebody else's choice.
 */

export const metadata: Metadata = {
  title: "Reserve your dates",
  robots: { index: false },
};

const SLUG_RE = /^[a-z0-9-]{1,120}$/;
// The same test the availability route applies to a jewellery image path: a
// site path or https, never a protocol-relative or script URL from the admin.
const PATH_RE = /^(\/(?!\/)|https:\/\/)/;

export default async function ReservePage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string | string[] }>;
}) {
  const { items } = await searchParams;
  const raw = (Array.isArray(items) ? items.join(",") : (items ?? "")).split(",");
  const slugs = [...new Set(raw.map((s) => s.trim()).filter((s) => SLUG_RE.test(s)))].slice(0, MAX_ITEMS);

  const bookables = await getBookables(slugs);
  if (bookables.length === 0) return <ReserveEmpty />;

  const pieces: ReservePiece[] = bookables.map((b) => {
    if (b.type === "rental") {
      const spin = b.spin as { basePath?: unknown } | null;
      const front = typeof spin?.basePath === "string" && PATH_RE.test(spin.basePath) ? `${spin.basePath}/000.webp` : null;
      // No turntable yet: the category picture stands in, labelled as a sample
      // exactly as RentalCard labels it, because it is not this garment.
      const sample = front ? null : (RENTAL_CATEGORIES.find((c) => c.slug === b.category)?.image ?? null);
      return {
        slug: b.slug,
        name: b.name,
        type: b.type,
        pricePerDay: b.pricePerDay,
        href: `/rentals/${b.slug}`,
        image: front ?? sample,
        sample: sample !== null,
      };
    }
    const first = Array.isArray(b.images) ? (b.images as { path?: unknown }[]).find((i) => typeof i?.path === "string" && PATH_RE.test(i.path)) : undefined;
    const own = (first?.path as string | undefined) ?? null;
    const sample = own ? null : b.category ? jewelleryImage(b.category) : null;
    return {
      slug: b.slug,
      name: b.name,
      type: b.type,
      pricePerDay: b.pricePerDay,
      href: `/jewellery/${b.slug}`,
      image: own ?? sample,
      sample: sample !== null,
    };
  });

  return <ReserveFlow initial={pieces} />;
}
