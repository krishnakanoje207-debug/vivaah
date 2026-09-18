"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ActionBar } from "@/components/site/ActionBar";
import { NewStockPopup } from "@/components/site/NewStockPopup";
import { Analytics } from "@/components/site/Analytics";
import CookieConsent, { AnalyticsGate } from "@/components/site/CookieConsent";

// The storefront Nav/Footer must NOT appear on /admin (it defines its own chrome).
// Nav/Footer are passed in as already-created elements so Footer stays a server
// component; this client wrapper only decides whether to render them.
export function SiteChrome({
  nav,
  footer,
  children,
}: {
  nav: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const path = usePathname() ?? "";
  const isAdmin = path.startsWith("/admin");
  // Mid-booking she already has the one action that matters on screen; a
  // floating bar would cover the form's foot and a popup would interrupt it.
  const isBooking = path.startsWith("/reserve") || path.startsWith("/booking");
  return (
    <>
      {!isAdmin && nav}
      <main className="flex-1">{children}</main>
      {!isAdmin && footer}
      {/* Phone-only, and it decides for itself when to appear. Mounted here so
          it follows the same /admin rule as the rest of the storefront chrome. */}
      {!isAdmin && !isBooking && <ActionBar />}
      {!isAdmin && !isBooking && <NewStockPopup />}
      {/* The consent panel and the thing it consents to, mounted as one pair so
          neither can ever ship without the other. Item 18 (analytics) is what
          unblocked item 17 (this banner): until 18 Sep there was nothing to
          consent to, and a banner advertising tracking that was not happening
          would have been worse than none.

          Not subject to the isBooking rule that stands ActionBar and
          NewStockPopup down. Those are optional chrome and a booking form is
          not the place for them; consent is neither optional nor deferrable,
          and a visitor who lands straight on /reserve has to be asked too or
          she is never asked at all. It stays off /admin, because that is the
          owner's own traffic and counting it would pollute her own numbers.

          AnalyticsGate renders nothing until she says yes, so the beacon
          physically cannot reach the DOM first. */}
      {!isAdmin && <CookieConsent />}
      {!isAdmin && (
        <AnalyticsGate>
          <Analytics />
        </AnalyticsGate>
      )}
    </>
  );
}
