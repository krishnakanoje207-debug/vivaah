import Link from "next/link";
import { enquiryHref, hasRealPhone, REQUEST_NOTICE } from "@/lib/enquiry";

/**
 * The one action this shop can honour today.
 *
 * Built 14 Sep 2026 against specs/ACTION_ROADMAP.md. The audit that prompted it
 * found that not a single `wa.me` link rendered anywhere on the site and that
 * all five pages terminated in the same "Plan a visit" / "Open in Maps" pair,
 * whatever the visitor had just been looking at — so the site's only terminal
 * verb was *travel to a shop*, which is the highest-friction action in the
 * funnel and was being asked of everyone equally.
 *
 * Labelled "reserve" on the owner's decision (15 Sep 2026: "reserve online,
 * and collect at shop everywhere"). Until Phase 2's booking engine lands the
 * act is the one she already performs by hand — a WhatsApp message naming a
 * garment, which she confirms herself. `REQUEST_NOTICE` says a piece is held
 * once she has confirmed, and travels with the button by default rather than
 * being left to each caller to remember.
 *
 * Degrades with `enquiryHref`: while `SHOP.phone` is the placeholder the href is
 * `/visit` and the label drops the WhatsApp promise, because a button that says
 * "message us" and opens WhatsApp to nobody is worse than one that offers
 * directions. Everything here switches on by itself the moment the real number
 * lands in lib/site.
 *
 * Not a client component: it renders one anchor and reads one constant.
 */
export function RequestButton({
  piece,
  night,
  tone = "light",
  size = "md",
  notice = true,
  className = "",
}: {
  /** The garment being asked about. Omitted on a page that is not about one. */
  piece?: string;
  /** The occasion, when the page knows it — "Navratri", "Sangeet". */
  night?: string;
  /** `light` sits on paper, `dark` on the violet ground. */
  tone?: "light" | "dark";
  size?: "sm" | "md";
  /** Set false only where the notice is already stated within a line or two. */
  notice?: boolean;
  className?: string;
}) {
  const real = hasRealPhone();
  const href = enquiryHref({ piece, night });

  // Name the action, not the mechanism — except while the mechanism is the
  // reason the label is different, in which case say where it actually goes.
  const label = !real
    ? piece
      ? "Come and see it"
      : "Plan a visit"
    : piece
      ? `Reserve ${piece}`
      : "Reserve online";

  const pad = size === "sm" ? "px-5 py-2.5 text-caption" : "px-6 py-3";
  const skin =
    tone === "dark"
      ? "bg-porcelain-50 text-violet-950 hover:bg-gold-100"
      : "bg-violet-950 text-porcelain-50 hover:bg-violet-900";

  return (
    <div className={className}>
      <Link
        href={href}
        {...(real ? { target: "_blank", rel: "noreferrer" } : {})}
        className={`press inline-flex items-center gap-3 rounded-control font-medium transition-colors duration-[180ms] ${pad} ${skin}`}
      >
        {label}
        <span aria-hidden="true" className="translate-y-[0.5px]">
          &#8594;
        </span>
      </Link>

      {notice && real && (
        <p
          className={`mt-3 max-w-[42ch] text-caption ${
            tone === "dark" ? "text-porcelain-50/70" : "text-ink-600"
          }`}
        >
          {REQUEST_NOTICE}
        </p>
      )}
    </div>
  );
}
