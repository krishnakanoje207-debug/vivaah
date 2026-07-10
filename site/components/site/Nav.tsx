"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NAV_LINKS, SHOP } from "@/lib/site";
import { Button } from "@/components/ui/Button";

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-silk-50/85 backdrop-blur border-b border-silk-200"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav className="shell flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="font-display text-[1.4rem] tracking-tight text-ink-900"
          aria-label={`${SHOP.name} home`}
        >
          {SHOP.name}
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8 text-[0.9375rem] text-ink-600">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="hover:text-ink-900 transition-colors duration-[180ms]"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-4">
          <LangToggle />
          <Button href="/visit" variant="ghost">
            Book a trial
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden inline-flex flex-col gap-[5px] p-2 -mr-2"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span
            className={`h-px w-6 bg-ink-900 transition-transform ${
              open ? "translate-y-[6px] rotate-45" : ""
            }`}
          />
          <span className={`h-px w-6 bg-ink-900 transition-opacity ${open ? "opacity-0" : ""}`} />
          <span
            className={`h-px w-6 bg-ink-900 transition-transform ${
              open ? "-translate-y-[6px] -rotate-45" : ""
            }`}
          />
        </button>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div className="md:hidden bg-silk-50 border-b border-silk-200">
          <ul className="shell flex flex-col py-4">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block py-3 text-ink-900"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="pt-3 flex items-center justify-between">
              <LangToggle />
              <Button href="/visit" variant="ghost">
                Book a trial
              </Button>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

// Non-functional in Preview 0 — the content dimension ships with the DB (Phase 1+).
function LangToggle() {
  return (
    <div
      className="inline-flex items-center rounded-full border border-silk-200 text-[0.8125rem] overflow-hidden"
      role="group"
      aria-label="Language"
    >
      <button className="px-2.5 py-1 bg-ink-900 text-silk-50" aria-pressed="true">
        EN
      </button>
      <button className="px-2.5 py-1 text-ink-600 hover:text-ink-900" aria-pressed="false">
        हिं
      </button>
    </div>
  );
}
