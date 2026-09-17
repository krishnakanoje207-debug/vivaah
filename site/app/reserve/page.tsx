import type { Metadata } from "next";
import { getBookables } from "@/lib/booking";
import { MAX_ITEMS } from "@/lib/bookingRules";
import { RENTAL_CATEGORIES, RETAIL_CATEGORIES } from "@/lib/categories";
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
 * Rentals and jewellery share one date range. Retail joined them in Phase 3
 * (specs/RETAIL_SPEC.md §3.3): a basket of nothing but retail asks for one day
 * rather than a range, because nothing comes back, and a mixed basket keeps the
 * rental's range and collects everything on the pickup day. getBookables drops
 * anything inactive, so a stale link from the tray simply loses the pieces that
 * can no longer be booked.
 *
 * `?variant=&size=` carries a retail product page's answer through, for the one
 * piece that can have made it. Anything else — a piece gathered in the tray, a
 * hand-edited link — is asked on the page itself; the values are checked against
 * the colours and sizes that piece actually has, here and again on the server.
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
  searchParams: Promise<{ items?: string | string[]; variant?: string; size?: string }>;
}) {
  const { items, variant, size } = await searchParams;
  const raw = (Array.isArray(items) ? items.join(",") : (items ?? "")).split(",");
  const slugs = [...new Set(raw.map((s) => s.trim()).filter((s) => SLUG_RE.test(s)))].slice(0, MAX_ITEMS);

  const bookables = await getBookables(slugs);
  if (bookables.length === 0) return <ReserveEmpty />;

  // The prefill applies to the one retail piece in the link, and only when the
  // colour and size are really that piece's and really in stock. A pick that
  // does not survive this is dropped, not corrected: the form then asks.
  const retail = bookables.filter((b) => b.type === "retail");
  const prefill: Record<string, { variant: string; size: string }> = {};
  if (retail.length === 1 && typeof variant === "string" && typeof size === "string") {
    const v = retail[0].variants.find((x) => x.id === variant);
    if (v?.sizes.some((s) => s.size === size && s.inStock)) {
      prefill[retail[0].slug] = { variant, size };
    }
  }

  const pieces: ReservePiece[] = bookables.map((b) => {
    const common = {
      slug: b.slug,
      name: b.name,
      pricePerDay: b.pricePerDay,
      price: b.price,
      variants: b.variants,
    };
    if (b.type === "retail") {
      const own = Array.isArray(b.images)
        ? (b.images as { path?: unknown }[]).find((i) => typeof i?.path === "string" && PATH_RE.test(i.path))
        : undefined;
      const first = b.variants.find((v) => v.images.length > 0)?.images[0]?.path ?? (own?.path as string | undefined) ?? null;
      const sample = first ? null : (RETAIL_CATEGORIES.find((c) => c.slug === b.category)?.image ?? null);
      return {
        ...common,
        type: b.type,
        href: `/retail/${b.slug}`,
        image: first ?? sample,
        sample: sample !== null,
      };
    }
    if (b.type === "rental") {
      const spin = b.spin as { basePath?: unknown } | null;
      const front = typeof spin?.basePath === "string" && PATH_RE.test(spin.basePath) ? `${spin.basePath}/000.webp` : null;
      // No turntable yet: the category picture stands in, labelled as a sample
      // exactly as RentalCard labels it, because it is not this garment.
      const sample = front ? null : (RENTAL_CATEGORIES.find((c) => c.slug === b.category)?.image ?? null);
      return {
        ...common,
        type: b.type,
        href: `/rentals/${b.slug}`,
        image: front ?? sample,
        sample: sample !== null,
      };
    }
    const first = Array.isArray(b.images) ? (b.images as { path?: unknown }[]).find((i) => typeof i?.path === "string" && PATH_RE.test(i.path)) : undefined;
    const own = (first?.path as string | undefined) ?? null;
    const sample = own ? null : b.category ? jewelleryImage(b.category) : null;
    return {
      ...common,
      type: b.type,
      href: `/jewellery/${b.slug}`,
      image: own ?? sample,
      sample: sample !== null,
    };
  });

  return <ReserveFlow initial={pieces} prefill={prefill} />;
}
