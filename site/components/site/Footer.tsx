import Link from "next/link";
import { NAV_LINKS, SHOP } from "@/lib/site";

export function Footer() {
  return (
    <footer className="on-dark grain bg-dusk-900 text-dusk-300">
      <div className="shell py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1.2fr]">
          {/* Brand */}
          <div>
            <p className="font-display text-[1.6rem] text-silk-50">{SHOP.name}</p>
            <p className="mt-3 max-w-xs text-[0.9375rem] leading-relaxed">{SHOP.tagline}</p>
          </div>

          {/* Explore */}
          <nav aria-label="Footer">
            <p className="eyebrow on-dark mb-4">Explore</p>
            <ul className="flex flex-col gap-3 text-[0.9375rem]">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-silk-50 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/policies" className="hover:text-silk-50 transition-colors">
                  Rental terms
                </Link>
              </li>
            </ul>
          </nav>

          {/* Visit — the shop is always one tap away (required every page) */}
          <div>
            <p className="eyebrow on-dark mb-4">Visit us</p>
            <a
              href={SHOP.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-start gap-2 text-[0.9375rem] text-silk-50"
            >
              <span aria-hidden="true" className="mt-0.5">
                📍
              </span>
              <span className="group-hover:underline underline-offset-4">
                {SHOP.address}
                <span className="block text-dusk-300 group-hover:text-dusk-100">
                  Get directions
                </span>
              </span>
            </a>
            <p className="mt-4 text-[0.9375rem]">{SHOP.hours}</p>
            <a href={`tel:${SHOP.phone.replace(/\s/g, "")}`} className="mt-1 block hover:text-silk-50">
              {SHOP.phone}
            </a>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-dusk-700 pt-6 text-[0.8125rem] text-dusk-500 md:flex-row md:items-center md:justify-between">
          <p>
            © {SHOP.name}. Reserve online, collect at our shop.
          </p>
          <p>Made for weddings, in India.</p>
        </div>
      </div>
    </footer>
  );
}
