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
  const sub = tone === "light-on-dark" ? "text-violet-300" : "text-gold-600";

  return (
    <Link href="/" aria-label={`${SHOP.name} home`} className={`inline-block leading-none ${className}`}>
      {SHOP.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={SHOP.logo} alt={SHOP.name} className="h-7 w-auto" />
      ) : (
        <span className="flex flex-col">
          <span className={`font-display text-[1.4rem] tracking-tight ${text}`}>{SHOP.short}</span>
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
