import type { Metadata } from "next";
import ReactDOM from "react-dom";
import { headers } from "next/headers";
import { Bodoni_Moda, Instrument_Sans, Noto_Serif_Devanagari, Mukta } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { SiteChrome } from "@/components/site/SiteChrome";
import { SHOP, SITE_URL } from "@/lib/site";
import { PRELOADED_FONTS } from "@/lib/fontPreload";

// Display Didone — Bodoni Moda (DESIGN_SPEC_V3 §1). Variable instance: no pinned
// weight (wght 400–900 stays live, floor 400) and the full opsz 6–96 axis, which
// is what makes font-optical-sizing: auto real work. Italic ships for the
// one-editorial-accent-per-section convention (§1.3).
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-bodoni",
  display: "swap",
});

// Body / UI sans — Instrument Sans (replaces Inter; less template-flavoured).
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

// Hindi display + body (activate under :lang(hi); toggle ships later).
const notoDeva = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-noto-deva",
  display: "swap",
});
const mukta = Mukta({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mukta",
  display: "swap",
});

const DESCRIPTION =
  "Vivaah Dresses and Suits. Rent bridal lehengas and festive wear, shop dresses and suits, and rent matching jewellery. Reserve online, collect at our shop.";

export const metadata: Metadata = {
  // Absolute URLs are resolved against this. Without it `openGraph.images`
  // below would emit a relative path, which every scraper ignores.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SHOP.name} · Rent & Buy Bridal & Festive Wear`,
    template: `%s · ${SHOP.name}`,
  },
  description: DESCRIPTION,
  // Not one og: tag rendered on any route before this (audit, 14 Sep), so every
  // share of this shop showed a bare URL — and WhatsApp is how these customers
  // actually send each other links, which makes it the single most-seen surface
  // the site had and the only one that was blank.
  //
  // The card image is a JPEG rather than the hero's own WebP: scrapers are far
  // less consistent about WebP than browsers are, and a preview that silently
  // fails to render is the exact failure this is fixing.
  openGraph: {
    type: "website",
    siteName: SHOP.name,
    locale: "en_IN",
    url: SITE_URL,
    title: `${SHOP.name} · Rent & Buy Bridal & Festive Wear`,
    description: DESCRIPTION,
    images: [
      {
        url: "/og/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "A bride in a red lehenga, photographed in a garden",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SHOP.name} · Rent & Buy Bridal & Festive Wear`,
    description: DESCRIPTION,
    images: ["/og/og-default.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The per-request nonce proxy.ts minted. Next stamps its own scripts by
  // reading the CSP header itself; this is for the one inline script the site
  // writes, in the preloader. Reading headers() is also what opts every route
  // into dynamic rendering, which a nonce requires and which the route table
  // said costs three static pages (SECURITY_HARDENING_SPEC S3).
  // Read, not used here: the only inline script the site writes is the
  // preloader's, and that is rendered by app/page.tsx, which takes the nonce
  // itself. The read still has to happen in the ROOT layout, because that is
  // what opts every route into the dynamic rendering a nonce requires; doing it
  // only on the page would leave /policies and /visit prerendered with unnonced
  // Next scripts that the policy would then block.
  void (await headers()).get("x-nonce");
  // Asked for by hand because `next/font` cannot ask for them here: the
  // --webpack build leaves next-font-manifest empty, so nothing is ever
  // preloaded automatically. See lib/fontPreload.ts for the whole story.
  //
  // ReactDOM.preload rather than a <link> in the tree: React hoists a rendered
  // link into <head> and then also records its own float for the same href, so
  // the markup carried each font twice. Browsers dedupe by URL and it fetched
  // nothing extra, but this is the API that means it once. `crossOrigin` is
  // required even though the files are same-origin, because a font is always
  // fetched in CORS mode and a preload that disagrees is discarded and fetched
  // again.
  for (const href of PRELOADED_FONTS) {
    ReactDOM.preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }

  return (
    // Preloader's inline script sets data-preloader on <html> before hydration,
    // on purpose, so React must not treat that attribute as a mismatch.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bodoni.variable} ${instrument.variable} ${notoDeva.variable} ${mukta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-porcelain-50 text-ink-900">
        {/* SiteChrome hides Nav/Footer on /admin (admin has its own chrome). */}
        <SiteChrome nav={<Nav />} footer={<Footer />}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
