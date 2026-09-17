import Link from "next/link";
import {
  enquiryHref,
  ENQUIRY_NOTICE,
  hasRealPhone,
  REQUEST_NOTICE,
  reserveHref,
} from "@/lib/enquiry";

/**
 * The one action a page about a piece ends in.
 *
 * Built 14 Sep 2026 against specs/ACTION_ROADMAP.md. The audit that prompted it
 * found that not a single `wa.me` link rendered anywhere on the site and that
 * all five pages terminated in the same "Plan a visit" / "Open in Maps" pair,
 * whatever the visitor had just been looking at — so the site's only terminal
 * verb was *travel to a shop*, which is the highest-friction action in the
 * funnel and was being asked of everyone equally.
 *
 * Labelled "reserve" on the owner's decision (15 Sep 2026: "reserve online,
 * and collect at shop everywhere"). Any named piece (`slug` plus a `kind`) goes
 * to `/reserve`, same tab, where the request holds what it can while the shop
 * confirms (BOOKING_ENGINE_SPEC_V2 D5, D6) — rentals and jewellery since Phase
 * 2, retail since Phase 3, where /reserve asks for the colour and size if the
 * page has not already. That needs no phone number, so it never degrades.
 * Page-level uses, which name no piece, still compose the WhatsApp message she
 * answers by hand, and say so in their notice, which travels with the button by
 * default rather than being left to each caller to remember.
 *
 * The WhatsApp form degrades with `enquiryHref`: while `SHOP.phone` is a
 * placeholder the href is `/visit` and the label drops the promise, because a
 * button that says "reserve" and opens WhatsApp to nobody is worse than one
 * that offers directions.
 *
 * `ask` adds the quieter "Ask on WhatsApp" under a booking button, for
 * questions rather than requests, and only when there is a number to ask.
 *
 * Not a client component: it renders anchors and reads constants.
 */
export function RequestButton({
  piece,
  slug,
  kind,
  night,
  tone = "light",
  size = "md",
  notice = true,
  ask = false,
  className = "",
}: {
  /** The garment being asked about. Omitted on a page that is not about one. */
  piece?: string;
  /** The piece's slug, which is what /reserve takes. */
  slug?: string;
  /** Which trade the piece belongs to. All three are booked online. */
  kind?: "rental" | "jewellery" | "retail";
  /** The occasion, when the page knows it — "Navratri", "Sangeet". */
  night?: string;
  /** `light` sits on paper, `dark` on the violet ground. */
  tone?: "light" | "dark";
  size?: "sm" | "md";
  /** Set false only where the notice is already stated within a line or two. */
  notice?: boolean;
  /** Offer "Ask on WhatsApp" under a booking button. */
  ask?: boolean;
  className?: string;
}) {
  const real = hasRealPhone();
  const bookable = !!slug && !!kind;

  // Name the action, not the mechanism — except while the mechanism is the
  // reason the label is different, in which case say where it actually goes.
  const label = bookable
    ? `Reserve ${piece ?? "this piece"}`
    : !real
      ? piece
        ? "Come and see it"
        : "Plan a visit"
      : piece
        ? `Reserve ${piece}`
        : "Reserve online";

  const href = bookable ? reserveHref([slug]) : enquiryHref({ piece, night });
  const external = !bookable && real;
  const showNotice = notice && (bookable || real);

  const pad = size === "sm" ? "px-5 py-2.5 text-caption" : "px-6 py-3";
  const skin =
    tone === "dark"
      ? "bg-porcelain-50 text-violet-950 hover:bg-gold-100"
      : "bg-violet-950 text-porcelain-50 hover:bg-violet-900";
  const quiet = tone === "dark" ? "text-porcelain-50/70" : "text-ink-600";

  return (
    <div className={className}>
      <Link
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className={`press inline-flex items-center gap-3 rounded-control font-medium transition-colors duration-[180ms] ${pad} ${skin}`}
      >
        {label}
        <span aria-hidden="true" className="translate-y-[0.5px]">
          &#8594;
        </span>
      </Link>

      {ask && bookable && real && (
        <a
          href={enquiryHref({ piece, ask: true })}
          target="_blank"
          rel="noreferrer"
          className={`mt-3 flex min-h-[44px] w-fit items-center text-caption underline underline-offset-4 ${
            tone === "dark"
              ? "text-porcelain-50 decoration-porcelain-50/40 hover:decoration-porcelain-50"
              : "text-ink-900 decoration-ink-900/30 hover:decoration-ink-900"
          }`}
        >
          Ask on WhatsApp
        </a>
      )}

      {showNotice && (
        <p className={`mt-3 max-w-[42ch] text-caption ${quiet}`}>
          {bookable ? REQUEST_NOTICE : ENQUIRY_NOTICE}
        </p>
      )}
    </div>
  );
}
