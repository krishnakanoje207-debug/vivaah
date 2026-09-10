import Link from "next/link";
import { SHOP } from "@/lib/site";

/**
 * Brand lockup (R1.2). Renders the owner's logo when SHOP.logo is set, else a
 * typographic wordmark: "Vivaah" (display) + "Dresses & Suits" (eyebrow).
 * `tone` picks text colour for light vs dark surfaces.
 */
export function Brand({
  tone = "dark-on-light",
  className = "",
}: {
  tone?: "dark-on-light" | "light-on-dark";
  className?: string;
}) {
  const text = tone === "light-on-dark" ? "text-porcelain-50" : "text-ink-900";
  // 8px on light: needs the small-text gold (see --color-gold-700 in globals).
  const sub = tone === "light-on-dark" ? "text-violet-300" : "text-gold-700";

  // The lockup draws about 90x30, which is under the 44px a tap needs. The
  // padding reaches for the extra height and the negative margin hands the
  // space straight back, so the mark sits exactly where it did — centred in
  // the nav's 64px bar, flush with the top of the footer column. Same trick as
  // the nav's hamburger.
  return (
    <Link
      href="/"
      aria-label={`${SHOP.name} home`}
      className={`inline-block -my-2 py-2 leading-none ${className}`}
    >
      {SHOP.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img data-brand-slot src={SHOP.logo} alt={SHOP.name} className="h-7 w-auto" />
      ) : (
        <span className="flex flex-col">
          {/* data-brand-slot: the preloader resolves into this exact box (V3 §4.1). */}
          <span data-brand-slot className={`font-display text-[1.4rem] tracking-tight ${text}`}>
            {SHOP.short}
          </span>
          <span
            className={`text-[0.5rem] font-medium uppercase tracking-[0.22em] ${sub}`}
          >
            {SHOP.lockup}
          </span>
        </span>
      )}
    </Link>
  );
}
