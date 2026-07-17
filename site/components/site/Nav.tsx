"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "@/lib/site";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/site/Brand";

const NAV_H = 64;

export function Nav() {
  const [open, setOpen] = useState(false);
  // tone: "dark" (violet-950) | "light" (stage/porcelain) | null (not transparent)
  const [navTone, setNavTone] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    const update = () => {
      const darkHero = document.querySelector<HTMLElement>("[data-dark-hero]");
      const stageHero = document.querySelector<HTMLElement>("[data-stage-hero]");
      
      const scrollY = window.scrollY;
      
      if (darkHero && scrollY < darkHero.offsetHeight - NAV_H) {
        setNavTone("dark");
      } else if (stageHero && scrollY < stageHero.offsetHeight - NAV_H) {
        setNavTone("light");
      } else {
        setNavTone(null);
      }
    };
    
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const isTransparent = navTone !== null;
  const overDark = navTone === "dark";
  
  const shellBar = isTransparent
    ? `bg-transparent border-transparent ${overDark ? "on-dark" : ""}`
    : "bg-porcelain-50/85 backdrop-blur border-porcelain-200";
    
  const linkColor = overDark ? "text-violet-300" : "text-ink-600";
  const linkHover = overDark ? "hover:text-porcelain-50" : "hover:text-ink-900";
  const bar = (overDark || !isTransparent) ? (overDark ? "bg-porcelain-50" : "bg-ink-900") : "bg-ink-900";

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-500 ${shellBar}`}
    >
      <nav className="shell flex h-16 items-center justify-between gap-6">
        <Brand tone={overDark ? "light-on-dark" : "dark-on-light"} />

        <ul className={`hidden md:flex items-center gap-8 text-[0.9375rem] ${linkColor}`}>
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={`${linkHover} transition-colors duration-[180ms]`}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-4">
          <LangToggle overDark={overDark} />
          <Button href="/visit" variant={overDark ? "ghost-dark" : "ghost"}>
            Book a trial
          </Button>
        </div>

        <button
          className="md:hidden inline-flex flex-col gap-[5px] p-2 -mr-2"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`h-px w-6 ${bar} transition-transform ${open ? "translate-y-[6px] rotate-45" : ""}`} />
          <span className={`h-px w-6 ${bar} transition-opacity ${open ? "opacity-0" : ""}`} />
          <span className={`h-px w-6 ${bar} transition-transform ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-porcelain-50 border-b border-porcelain-200">
          <ul className="shell flex flex-col py-4">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block py-3 text-ink-900" onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="pt-3 flex items-center justify-between">
              <LangToggle overDark={false} />
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

function LangToggle({ overDark }: { overDark: boolean }) {
  const border = overDark ? "border-porcelain-50/30" : "border-porcelain-200";
  const inactive = overDark ? "text-violet-300 hover:text-porcelain-50" : "text-ink-600 hover:text-ink-900";
  return (
    <div
      className={`inline-flex items-center rounded-full border ${border} text-[0.8125rem] overflow-hidden`}
      role="group"
      aria-label="Language"
    >
      <button className="px-2.5 py-1 bg-ink-900 text-porcelain-50" aria-pressed="true">
        EN
      </button>
      <button className={`px-2.5 py-1 ${inactive}`} aria-pressed="false">
        हिं
      </button>
    </div>
  );
}
