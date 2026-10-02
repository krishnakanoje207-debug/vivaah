import Link from "next/link";
import { NAV_LINKS, SHOP } from "@/lib/site";
import { CookieChoicesButton } from "@/components/site/CookieChoicesButton";
import { ANALYTICS_ON } from "@/lib/analytics";

export function Footer() {
  return (
    <footer className="on-dark grain bg-violet-950 text-violet-300">
      <div className="shell py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1.2fr]">
          {/* Brand */}
          <div>
            {/* The owner's full logo (2 Oct 2026), lettering in porcelain for
                this ground. The nav keeps the text lockup: at 28px tall the
                logo's word would be about 5px. */}
            <Link href="/" className="inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-on-dark-1x.webp"
                srcSet="/brand/logo-on-dark-1x.webp 1x, /brand/logo-on-dark-2x.webp 2x"
                width={200}
                height={250}
                alt={`${SHOP.name}, home`}
                loading="lazy"
                decoding="async"
                className="block h-auto w-40 md:w-44"
              />
            </Link>
            <p className="mt-4 max-w-xs text-[0.9375rem] leading-relaxed">{SHOP.tagline}</p>
          </div>

          {/* Explore */}
          <nav aria-label="Footer">
            <p className="eyebrow on-dark mb-4">Explore</p>
            {/* On the phone the 15px rows sat on a 37px pitch, which is under
               a reliable tap. Padding takes each row to ~41px and the gap comes
               in to match, so the block is the same height it was. */}
            <ul className="flex flex-col gap-1 text-[0.9375rem] md:gap-3">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block py-2 transition-colors hover:text-porcelain-50 md:py-0"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/policies"
                  className="block py-2 transition-colors hover:text-porcelain-50 md:py-0"
                >
                  Rental terms
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="block py-2 transition-colors hover:text-porcelain-50 md:py-0"
                >
                  Privacy
                </Link>
              </li>
              {/* Only while there is a choice to change (lib/analytics.ts). */}
              {ANALYTICS_ON && (
                <li>
                  <CookieChoicesButton className="block py-2 text-left transition-colors hover:text-porcelain-50 md:py-0" />
                </li>
              )}
            </ul>
          </nav>

          {/* Visit — the shop is always one tap away (required every page) */}
          <div>
            <p className="eyebrow on-dark mb-4">Visit us</p>
            <a
              href={SHOP.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-start gap-2 text-[0.9375rem] text-porcelain-50"
            >
              <span aria-hidden="true" className="mt-0.5">
                📍
              </span>
              <span className="group-hover:underline underline-offset-4">
                {SHOP.address}
                <span className="block text-violet-300 group-hover:text-violet-100">
                  Get directions
                </span>
              </span>
            </a>
            <p className="mt-4 text-[0.9375rem]">{SHOP.hours}</p>
            <a
              href={`tel:${SHOP.phone.replace(/\s/g, "")}`}
              className="mt-1 block py-2 text-gold-500 hover:text-gold-100 md:py-0"
            >
              {SHOP.phone}
            </a>
          </div>
        </div>

        <div className="mt-14 border-t border-porcelain-50/12 pt-6 text-[0.8125rem] text-violet-300">
          <p>© {SHOP.name}</p>
        </div>
      </div>
    </footer>
  );
}
