import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, Noto_Serif_Devanagari, Mukta } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { SiteChrome } from "@/components/site/SiteChrome";
import { SHOP } from "@/lib/site";

// Display serif — variable, optical sizing on. Weights kept light (340–420) in CSS.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
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

export const metadata: Metadata = {
  title: {
    default: `${SHOP.name} — Rent & Buy Bridal & Festive Wear`,
    template: `%s · ${SHOP.name}`,
  },
  description:
    "Vivaah Dresses and Suits — rent bridal lehengas and festive wear, shop dresses and suits, and rent matching jewellery. Reserve online, collect at our shop.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrument.variable} ${notoDeva.variable} ${mukta.variable} h-full antialiased`}
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
