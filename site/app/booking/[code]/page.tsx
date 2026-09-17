import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { SectionEdge } from "@/components/site/SectionEdge";
import { Button } from "@/components/ui/Button";
import { getBookingForVisitor, type CustomerBooking } from "@/lib/booking";
import { accessCookieName } from "@/lib/bookingAccess";
import { MAX_DAYS, TZ, addDays, daysBetween, formatDay, formatTime, maskPhone } from "@/lib/bookingRules";
import { sql } from "@/lib/db";
import { hasRealPhone } from "@/lib/enquiry";
import { formatINR } from "@/lib/format";
import { RENTAL_CATEGORIES, RETAIL_CATEGORIES } from "@/lib/categories";
import { SHOP, hasRealAddress } from "@/lib/site";
import { jewelleryImage } from "@/app/jewellery/images";
import { LookupForm } from "./LookupForm";
import { CancelBooking } from "./CancelBooking";
import { ExtendBooking } from "./ExtendBooking";

/**
 * `/booking/[code]` — where a customer comes back to one booking
 * (specs/BOOKING_ENGINE_SPEC_V2.md §2.5, §2.6, §3).
 *
 * Printed matter, like /visit: a claim ticket rather than an account page. The
 * code is set as the largest thing on the page because it is what she reads out
 * when she calls, and the status under it is a sentence, not a badge.
 *
 *   Section   Ground        Composition
 *   Head      violet-950    code, the seam of four stations, the status
 *   Ledger    porcelain-50  the dates | the pieces
 *   Changes   stage         keep it longer | cancel (only when either applies)
 *   Shop      violet-950    hours, address, call, WhatsApp
 *
 * Retail changes what the page may promise, not how it is built. A piece she is
 * buying is collected once and kept, so a booking with nothing rented in it has
 * a day rather than dates, no return, no length and nothing to extend; a booking
 * holding both lists what she is renting apart from what she is buying, because
 * the two carry different promises (RETAIL_SPEC §2, §3.3).
 *
 * No proof (link token or lookup cookie) renders the code + phone form, and it
 * renders the same whether or not the code exists. Nothing here moves on scroll:
 * this is a page people open to check one fact, so all of it is there at once.
 *
 * The link token is never rendered. The client components read it back from the
 * address bar when they post, so it is not serialised into the page either.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};

// An instant, e.g. a lapse or cancel deadline, as the shop's own clock reads it.
function istMoment(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${formatDay(`${get("year")}-${get("month")}-${get("day")}`)} at ${formatTime(`${get("hour")}:${get("minute")}`)}`;
}

const STATIONS = ["Requested", "Confirmed", "Collected", "Returned"] as const;
const STATION_OF = { pending: 0, confirmed: 1, picked_up: 2, returned: 3 } as const;
// A collection ends where it ends: nothing she bought comes back, and the
// booking never enters `returned`, so the fourth station would be a promise of
// something that is not going to happen (RETAIL_SPEC §2).
const COLLECT_STATIONS = STATIONS.slice(0, 3);

const isCollectOnly = (b: CustomerBooking) => b.items.every((p) => p.type === "retail");

function statusCopy(b: CustomerBooking): { word: string; line: string; detail: string | null } {
  const it = b.items.length === 1 ? "it" : "them";
  const collect = isCollectOnly(b);
  const buying = b.items.some((p) => p.type === "retail");
  const when = b.time ? `${formatDay(b.pickup)} at ${formatTime(b.time)}` : formatDay(b.pickup);
  // What a lapse or a cancellation gives back: the dates, for something on loan;
  // the piece itself, for something she was buying, which goes back on the rail.
  const freed = collect
    ? `${b.items.length === 1 ? "the piece goes" : "the pieces go"} back on the rail`
    : "the dates are released";
  const freedPast = collect
    ? `${b.items.length === 1 ? "the piece went" : "the pieces went"} back on the rail`
    : "the dates were released";
  switch (b.status) {
    case "pending":
      return {
        word: "Requested.",
        line: "We'll call or message you to confirm.",
        detail: b.expiresAt
          ? `If we have not confirmed it by ${istMoment(b.expiresAt)}, the request lapses and ${freed}.`
          : null,
      };
    case "confirmed":
      return {
        word: "Confirmed.",
        line: collect ? `Come in to the shop on ${when}.` : `Collect ${it} at the shop on ${when}.`,
        detail: null,
      };
    case "picked_up":
      if (collect) {
        return { word: "Collected.", line: `${b.items.length === 1 ? "It is" : "They are"} yours. Thank you.`, detail: null };
      }
      return {
        word: "Collected.",
        line: buying
          ? `Bring what you rented back to the shop on ${formatDay(b.ret)}.`
          : `Bring ${it} back to the shop on ${formatDay(b.ret)}.`,
        detail: null,
      };
    case "returned":
      return { word: "Returned.", line: "Everything is back at the shop. Thank you.", detail: null };
    case "cancelled":
      if (b.cancelledBy === "lapsed") {
        return { word: "Lapsed.", line: `The request lapsed before we could confirm it, so ${freedPast}.`, detail: null };
      }
      if (b.cancelledBy === "shop") {
        return { word: "Cancelled.", line: "We could not take this booking. Call the shop if you would like to talk it through.", detail: null };
      }
      if (b.cancelledBy === "customer") {
        return { word: "Cancelled.", line: `You cancelled this booking, and ${freedPast}.`, detail: null };
      }
      return { word: "Cancelled.", line: "This booking was cancelled.", detail: null };
  }
}

type Piece = CustomerBooking["items"][number];

function ownImage(images: unknown): string | null {
  const first = Array.isArray(images)
    ? (images as { path?: unknown }[]).find((i) => typeof i?.path === "string" && i.path.startsWith("/"))
    : undefined;
  return first ? (first.path as string) : null;
}

// The piece's own photograph where one exists, else its category's, labelled.
function pieceImage(p: Piece): { src: string; sample: boolean } | null {
  if (p.type === "jewellery") {
    const own = ownImage(p.images);
    if (own) return { src: own, sample: false };
    const s = p.category ? jewelleryImage(p.category) : null;
    return s ? { src: s, sample: true } : null;
  }
  // Retail has no frame set to take a plate from, so it is the product's own
  // photograph or its category's, the way the rail on /retail shows it.
  if (p.type === "retail") {
    const own = ownImage(p.images);
    if (own) return { src: own, sample: false };
    const s = RETAIL_CATEGORIES.find((c) => c.slug === p.category)?.image;
    return s ? { src: s, sample: true } : null;
  }
  const base = (p.spin as { basePath?: unknown } | null)?.basePath;
  if (typeof base === "string" && base.startsWith("/")) return { src: `${base}/000.webp`, sample: false };
  const s = RENTAL_CATEGORIES.find((c) => c.slug === p.category)?.image;
  return s ? { src: s, sample: true } : null;
}

type Extension = { status: "pending" | "approved" | "rejected"; requested_return: string; charge: string };

const telHref = `tel:${SHOP.phone.replace(/\s/g, "")}`;

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const code = (await params).code.toUpperCase();
  const { k } = await searchParams;
  const cookie = (await cookies()).get(accessCookieName(code))?.value;
  const booking = await getBookingForVisitor(code, typeof k === "string" ? k : null, cookie);

  if (!booking) return <Lookup code={code} />;

  const b = booking;
  const copy = statusCopy(b);
  const cancelled = b.status === "cancelled";
  const station = b.status === "cancelled" ? -1 : STATION_OF[b.status];

  // The two trades, kept apart for the ledger. A mixed booking runs on the
  // rental's range and she comes in once, on the pickup day, for all of it.
  const toRent = b.items.filter((p) => p.type !== "retail");
  const toKeep = b.items.filter((p) => p.type === "retail");
  const collectOnly = toRent.length === 0;

  // Nothing goes home on loan in a collection, so there is nothing to keep
  // longer; in a mixed booking the extension is the rental's.
  const extendable = !collectOnly && (b.status === "confirmed" || b.status === "picked_up");
  const [ext] = extendable
    ? await sql<Extension>`
        select status::text as status, to_char(requested_return, 'YYYY-MM-DD') as requested_return,
               charge_amount::text as charge
          from extension_requests
         where booking_id = ${b.id}
         order by created_at desc
         limit 1`
    : [];
  const maxExtra = MAX_DAYS - (daysBetween(b.pickup, b.ret) + 1);
  const cancelColumn = b.status === "pending" || b.status === "confirmed";

  const waHref = `https://wa.me/${SHOP.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
    `Hello, I am asking about my booking ${b.code}.`,
  )}`;

  return (
    <>
      {/* ---------- Head ---------------------------------------------------- */}
      <section data-dark-hero className="grain on-dark -mt-16 bg-violet-950 pt-28 pb-24 md:pt-32 md:pb-32">
        <div className="shell-wide relative">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,7rem)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="eyebrow">Your booking</p>
              <div className="mt-4 hidden h-px bg-gold-500/40 lg:block" />
            </div>

            <div>
              {/* Set in the sans, not Bodoni: the Didone's hairline 1 reads as an
                  I at this size, and the code exists to be read out over a call.
                  Tracked open so no two characters touch. */}
              <h1
                aria-label={`Booking ${b.code}`}
                className="tabular font-sans text-[clamp(2.75rem,1.4rem+5.6vw,6.5rem)] leading-none font-medium tracking-[0.06em] text-porcelain-50"
              >
                {b.code}
              </h1>
              <p className="mt-4 text-caption text-violet-300">
                Read this code out if you call the shop.
              </p>

              {!cancelled && <Seam at={station} stations={collectOnly ? COLLECT_STATIONS : STATIONS} />}

              <p className="mt-12 max-w-[34ch] font-display text-h2 text-balance text-porcelain-50">
                <span className="text-gold-500">{copy.word}</span> {copy.line}
              </p>
              {copy.detail && <p className="mt-5 max-w-[52ch] text-violet-300">{copy.detail}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Ledger and pieces -------------------------------------- */}
      <section className="relative bg-porcelain-50 pt-24 pb-20 md:pt-28 md:pb-24">
        <SectionEdge seed={51} paper="var(--color-violet-950)" reveal="var(--color-porcelain-50)" />

        {/* The dates and the pieces side by side, on the head's heading line
            (its 7rem margin plus the gap). A card grid left one tile stranded
            at the left of a 1300px band, and most bookings are one piece. */}
        <div className="shell-wide relative">
          <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-24 lg:pl-[11rem]">
            <div>
              <h2 className="text-h2 text-ink-900">
                {collectOnly
                  ? cancelled
                    ? "The day it held"
                    : "The day"
                  : cancelled
                    ? "The dates it held"
                    : "The dates"}
              </h2>
              <dl className="mt-10 border-t border-ink-900/15">
                <div className="border-b border-ink-900/15 py-6">
                  <dt className="eyebrow">{collectOnly ? "Come in" : "Collect"}</dt>
                  <dd className="mt-2 font-display text-h2 text-ink-900">{formatDay(b.pickup)}</dd>
                  <dd className="mt-1 text-caption text-ink-600">
                    {b.time
                      ? `at ${formatTime(b.time)}, ${collectOnly ? "at the shop" : "from the shop"}`
                      : `${collectOnly ? "at the shop" : "from the shop"}, in opening hours`}
                  </dd>
                </div>
                {/* Nothing she is buying comes back, so a collection has no
                    second date at all; in a mixed booking only what she rented
                    is owed (RETAIL_SPEC §2). */}
                {!collectOnly && (
                  <div className="border-b border-ink-900/15 py-6">
                    <dt className="eyebrow">Return</dt>
                    <dd className="mt-2 font-display text-h2 text-ink-900">{formatDay(b.ret)}</dd>
                    <dd className="mt-1 text-caption text-ink-600">
                      {toKeep.length > 0 ? "what you rented, to the shop" : "to the shop"}
                    </dd>
                  </div>
                )}
                <div className="border-b border-ink-900/15 py-6">
                  <dt className="eyebrow">Phone</dt>
                  <dd className="tabular mt-2 font-display text-h2 text-ink-900">{maskPhone(b.phone)}</dd>
                  <dd className="mt-1 text-caption text-ink-600">the number you booked with</dd>
                </div>
              </dl>
            </div>

            <div>
              <h2 className="text-h2 text-ink-900">
                {b.items.length === 1 ? "The piece" : `The ${b.items.length} pieces`}
              </h2>
              {/* Under separate headings when the booking holds both: the two
                  carry different promises, and one of them she keeps
                  (RETAIL_SPEC §3.3). One trade alone needs no heading. */}
              {toRent.length > 0 && toKeep.length > 0 ? (
                <>
                  <p className="eyebrow mt-10">To rent</p>
                  <ul className="mt-4 border-t border-ink-900/15">
                    {toRent.map((p) => (
                      <PieceLine key={p.slug} p={p} />
                    ))}
                  </ul>
                  <p className="eyebrow mt-10">To keep</p>
                  <ul className="mt-4 border-t border-ink-900/15">
                    {toKeep.map((p) => (
                      <PieceLine key={p.slug} p={p} />
                    ))}
                  </ul>
                </>
              ) : (
                <ul className="mt-10 border-t border-ink-900/15">
                  {b.items.map((p) => (
                    <PieceLine key={p.slug} p={p} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Changes ------------------------------------------------- */}
      {(extendable || cancelColumn) && (
        <section className="relative bg-stage pt-24 pb-20 md:pt-28 md:pb-24">
          <SectionEdge seed={52} paper="var(--color-porcelain-50)" reveal="var(--color-stage)" />

          <div className="shell-wide relative">
            {/* The ledger's two tracks, so a lone column sits under the dates. */}
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-24 lg:pl-[11rem]">
              {extendable && (
                <div className="border-t border-ink-900/15 pt-8">
                  <p className="eyebrow">Keep it longer</p>
                  {ext?.status === "pending" ? (
                    <>
                      <p className="mt-4 max-w-[28ch] font-display text-h3 text-ink-900">
                        You asked to keep {toRent.length === 1 ? "it" : "them"} until {formatDay(ext.requested_return)}.
                      </p>
                      <p className="mt-3 max-w-[52ch] text-ink-600">
                        We will reply to it.{" "}
                        {Number(ext.charge) > 0
                          ? `The extra days come to ₹${formatINR(Number(ext.charge))}, paid at the shop.`
                          : "We will tell you any charge."}
                      </p>
                    </>
                  ) : (
                    <>
                      {ext?.status === "approved" && ext.requested_return === b.ret && (
                        <p className="mt-4 max-w-[52ch] text-ink-600">
                          Your last request was agreed: the return date is now {formatDay(b.ret)}.
                        </p>
                      )}
                      {ext?.status === "rejected" && (
                        <p className="mt-4 max-w-[52ch] text-ink-600">
                          We could not extend to {formatDay(ext.requested_return)}. Call the shop if you would like to talk it through.
                        </p>
                      )}
                      {maxExtra > 0 ? (
                        <ExtendBooking code={b.code} ret={b.ret} maxExtra={maxExtra} firstDay={addDays(b.ret, 1)} />
                      ) : (
                        <p className="mt-4 max-w-[52ch] text-ink-600">
                          This booking already runs as long as we take bookings online. Call the shop to ask about more days.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {cancelColumn && (
                <div className="border-t border-ink-900/15 pt-8">
                  <p className="eyebrow">Cancel</p>
                  {b.canCancel ? (
                    <>
                      <p className="mt-4 max-w-[28ch] font-display text-h3 text-ink-900">
                        {b.cancelDeadline
                          ? `You can cancel here until ${istMoment(b.cancelDeadline)}.`
                          : "You can cancel here."}
                      </p>
                      <p className="mt-3 max-w-[52ch] text-ink-600">After that, call the shop.</p>
                      <CancelBooking code={b.code} collectOnly={collectOnly} />
                    </>
                  ) : (
                    <>
                      <p className="mt-4 max-w-[28ch] font-display text-h3 text-ink-900">
                        {collectOnly
                          ? "It is too close to the time you are due in to cancel online."
                          : "It is too close to pickup to cancel online."}
                      </p>
                      <p className="mt-3 max-w-[52ch] text-ink-600">
                        Please call the shop on{" "}
                        <a href={telHref} className="tabular whitespace-nowrap text-gold-700 underline underline-offset-4">
                          {SHOP.phone}
                        </a>
                        .
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---------- The shop ------------------------------------------------ */}
      <section className="grain on-dark bg-violet-950 pt-24 pb-20 md:pt-28 md:pb-24">
        <SectionEdge
          seed={53}
          paper={extendable || cancelColumn ? "var(--color-stage)" : "var(--color-porcelain-50)"}
          reveal="var(--color-violet-950)"
        />

        <div className="shell-wide relative">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr_1fr] lg:gap-20">
            <p className="max-w-[16ch] font-display text-h2 text-porcelain-50">
              {collectOnly ? "Collection is at the shop." : "Pickup and return are at the shop."}
            </p>

            <dl className="border-t border-porcelain-50/20 pt-8">
              <dt className="eyebrow">Hours</dt>
              <dd className="tabular mt-3 font-display text-h3 text-porcelain-50">{SHOP.hours}</dd>
              {hasRealAddress() && (
                <>
                  <dt className="eyebrow mt-8">Address</dt>
                  <dd className="mt-3 max-w-[26ch] font-display text-h3 text-porcelain-50">{SHOP.address}</dd>
                  <dd className="mt-3">
                    <a
                      href={SHOP.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-caption text-gold-500 underline-offset-4 hover:underline"
                    >
                      Directions in Maps
                    </a>
                  </dd>
                </>
              )}
              {!hasRealAddress() && (
                <dd className="mt-3">
                  <Link href="/visit" className="text-caption text-gold-500 underline-offset-4 hover:underline">
                    How to find us
                  </Link>
                </dd>
              )}
            </dl>

            <div className="border-t border-porcelain-50/20 pt-8">
              <p className="eyebrow">Questions</p>
              <p className="mt-3 font-display text-h3 text-porcelain-50">
                <a href={telHref} className="tabular underline-offset-[6px] hover:underline">
                  {SHOP.phone}
                </a>
              </p>
              {hasRealPhone() && (
                <div className="mt-8">
                  <Button href={waHref} variant="ghost-dark" target="_blank" rel="noreferrer">
                    Ask on WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** One line of the ledger: the plate, the name, what it is, and its price. */
function PieceLine({ p }: { p: Piece }) {
  const img = pieceImage(p);
  const retail = p.type === "retail";
  const href =
    p.type === "jewellery" ? `/jewellery/${p.slug}` : retail ? `/retail/${p.slug}` : `/rentals/${p.slug}`;
  const kind =
    p.type === "jewellery"
      ? "Jewellery"
      : retail
        ? RETAIL_CATEGORIES.find((c) => c.slug === p.category)?.name ?? "To keep"
        : RENTAL_CATEGORIES.find((c) => c.slug === p.category)?.name ?? "To rent";
  // The colour and size she reserved, which is the whole of what tells one
  // kurti on the rail from the next. Never how many are left (RETAIL_SPEC R3).
  const variant = [p.colour, p.size && `size ${p.size}`].filter(Boolean).join(" · ");
  return (
    <li className="border-b border-ink-900/15 py-6">
      <Link href={href} className="press-card group grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-6 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <div className="keyline arch relative aspect-[4/5] overflow-hidden bg-stage">
          {img ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.sample ? "" : p.name}
                aria-hidden={img.sample ? true : undefined}
                className="absolute inset-0 h-full w-full object-cover"
              />
              {img.sample && (
                <span className="absolute inset-x-0 bottom-0 bg-porcelain-50/90 py-0.5 text-center text-[0.625rem] font-medium tracking-wide text-ink-900">
                  Sample photo
                </span>
              )}
            </>
          ) : (
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-porcelain-100 text-2xl text-gold-600/50">
              &#10022;
            </span>
          )}
        </div>
        <div>
          <h3 className="text-[1.35rem] leading-tight transition-colors duration-[180ms] ease-out-strong group-hover:text-violet-700">
            {p.name}
          </h3>
          <p className="mt-1 text-caption text-ink-600">{kind}</p>
          {variant && <p className="mt-1 text-caption text-ink-600">{variant}</p>}
          <p className="mt-4 text-ink-900">
            {p.price > 0 ? (
              <>
                <span className="tabular font-semibold">₹{formatINR(p.price)}</span>
                <span className="text-ink-600">{retail ? " to keep, paid at the shop" : " / day, paid at the shop"}</span>
              </>
            ) : (
              <span className="text-ink-600">Priced at the shop</span>
            )}
          </p>
        </div>
      </Link>
    </li>
  );
}

/**
 * Where she is along the booking, as a seam: the thread is sewn up to the
 * current station and tacked (dashed) beyond it. Four words, no numerals.
 */
function Seam({ at, stations }: { at: number; stations: readonly string[] }) {
  return (
    <ol className={`mt-12 grid max-w-[44rem] ${stations.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
      {stations.map((s, i) => {
        const reached = i <= at;
        const last = i === stations.length - 1;
        return (
          <li key={s} aria-current={i === at ? "step" : undefined} className="relative pt-6">
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute top-[0.5rem] left-3 right-0 border-t ${
                  i < at ? "border-gold-500" : "border-dashed border-violet-300/40"
                }`}
              />
            )}
            <span
              aria-hidden="true"
              className={`absolute top-0 left-0 text-[1rem] leading-none ${reached ? "text-gold-500" : "text-violet-300/50"}`}
            >
              {reached ? "✦" : "✧"}
            </span>
            <span
              className={`block text-caption ${
                i === at ? "font-medium text-porcelain-50" : reached ? "text-violet-300" : "text-violet-300/70"
              }`}
            >
              {s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Lookup({ code }: { code: string }) {
  return (
    <section data-dark-hero className="grain on-dark -mt-16 flex min-h-[100svh] items-center bg-violet-950 pt-28 pb-24 md:pt-32">
      <div className="shell-wide relative w-full">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,7rem)_minmax(0,1fr)_minmax(0,28rem)] lg:items-start lg:gap-16">
          <div>
            <p className="eyebrow">Your booking</p>
            <div className="mt-4 hidden h-px bg-gold-500/40 lg:block" />
          </div>

          <div>
            <h1 className="max-w-[14ch] text-h1 text-porcelain-50">Open your booking.</h1>
            <p className="mt-6 max-w-[44ch] text-violet-300">
              Enter the booking code and the phone number you booked with. The link you were given when you booked opens it
              directly.
            </p>
          </div>

          <LookupForm code={code.slice(0, 12)} />
        </div>
      </div>
    </section>
  );
}
