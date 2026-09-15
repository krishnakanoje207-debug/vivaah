"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SHOP } from "@/lib/site";
import { hasRealPhone } from "@/lib/enquiry";
import { useCookiePanelOpen } from "@/components/site/CookieConsent";

/**
 * The phone's persistent way to reach the shop.
 *
 * Built 14 Sep 2026 (specs/ACTION_ROADMAP.md, Stage 2). Below `md` the nav
 * collapses to a hamburger and takes "Reserve online" in with it, so the only
 * contact affordance on the entire site was behind a tap that nothing invited.
 * A visitor scrolling the front door passed 8,211px of page — and /rentals
 * 12,262px — with no way to call, message or ask about anything at any point.
 *
 * Phone only. On a desktop the nav is always visible and carries its own
 * action, so a second fixed bar would be clutter rather than access.
 *
 * Three things make it stand down, and all three matter:
 *
 *   - It waits until the hero has gone by. Arriving over the first viewport
 *     would cover the one image the page opens on and say nothing the two hero
 *     buttons do not already say.
 *   - It leaves before the footer, which is where the address, the hours and
 *     the phone number already live. A floating bar over the contact details is
 *     a bar arguing with itself.
 *   - It yields to the cookie banner, which occupies `inset-x-0 bottom-0` at
 *     this width. Two things in the same place is the bug that usually ships
 *     with a component like this one.
 */
export function ActionBar() {
  const [shown, setShown] = useState(false);
  // Whether the consent panel is actually on screen — NOT whether consent has
  // been given. CookieConsent is not currently mounted anywhere, so nobody ever
  // answers it and `useConsent()` is null forever; gating on that hid this bar
  // at every scroll position on every page.
  const bannerUp = useCookiePanelOpen();

  useEffect(() => {
    const footer = document.querySelector("footer");
    let raf = 0;

    const read = () => {
      raf = 0;
      const past = window.scrollY > window.innerHeight * 0.6;
      // `top` is the footer's distance from the viewport's top edge; once it is
      // inside the viewport the page has already offered everything this bar is
      // for, so the bar goes away rather than covering it.
      const atFooter = footer
        ? footer.getBoundingClientRect().top < window.innerHeight
        : false;
      setShown(past && !atFooter);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const real = hasRealPhone();
  const open = shown && !bannerUp;

  return (
    <div
      /* Always rendered, moved rather than mounted, so it can be animated and
         so the hidden state costs no layout. `pointer-events-none` while down
         keeps it from swallowing taps through its own transparent box. */
      className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-4 transition-all duration-300 ease-out-strong md:hidden ${
        open
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
      aria-hidden={!open}
    >
      <div className="on-dark flex items-stretch gap-2 rounded-control bg-violet-950/95 p-2 shadow-lift backdrop-blur-sm">
        {real ? (
          <>
            <a
              href={`tel:${SHOP.phone.replace(/\s/g, "")}`}
              tabIndex={open ? undefined : -1}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-control border border-porcelain-50/30 px-4 text-caption font-medium text-porcelain-50"
            >
              Call the shop
            </a>
          </>
        ) : (
          // No number yet, so the second action is directions rather than a
          // dead call link.
          <Link
            href="/visit"
            tabIndex={open ? undefined : -1}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-control border border-porcelain-50/30 px-4 text-caption font-medium text-porcelain-50"
          >
            Plan a visit
          </Link>
        )}
        {/* Booking is online since Phase 2 (15 Sep 2026) and needs no phone
            number, so this goes where the desktop nav's "Reserve online" goes:
            the collection, where every piece has its own Reserve. */}
        <Link
          href="/rentals#collection"
          tabIndex={open ? undefined : -1}
          className="flex min-h-[44px] flex-[1.2] items-center justify-center rounded-control bg-porcelain-50 px-4 text-caption font-medium text-violet-950"
        >
          Reserve online
        </Link>
      </div>
    </div>
  );
}
