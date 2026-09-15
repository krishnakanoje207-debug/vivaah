"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "@/lib/site";
import { SelectionTray } from "@/components/site/SelectionTray";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/site/Brand";

const NAV_H = 64;

export function Nav() {
  const [open, setOpen] = useState(false);
  // tone: "dark" (violet-950) | "light" (stage/porcelain) | null (not transparent)
  const [navTone, setNavTone] = useState<"dark" | "light" | null>(null);
  const [scrim, setScrim] = useState(false);

  useEffect(() => {
    const update = () => {
      const darkHero = document.querySelector<HTMLElement>("[data-dark-hero]");
      const stageHero = document.querySelector<HTMLElement>("[data-stage-hero]");
      
      const scrollY = window.scrollY;
      
      if (darkHero && scrollY < darkHero.offsetHeight - NAV_H) {
        setNavTone("dark");
        // `data-dark-hero="scrim"`: a head whose parallax plates rise into the
        // bar as it scrolls (/jewellery) gets a violet ground behind the links
        // as soon as it moves, so the plates pass under the bar, not the words.
        setScrim(darkHero.dataset.darkHero === "scrim" && scrollY > 4);
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
    ? `${overDark && scrim ? "bg-violet-950/90 backdrop-blur border-porcelain-50/10" : "bg-transparent border-transparent"} ${overDark ? "on-dark" : ""}`
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

        {/* The tray sits with the trailing controls at every width rather than
            being duplicated per breakpoint: it registers itself as the landing
            point for the garment flight, and two instances would mean the
            hidden one could win that registration and send every piece to a
            display:none target. One element, always mounted. */}
        <div className={`flex items-center gap-1 md:gap-4 ${linkColor}`}>
          <div className="hidden md:flex items-center gap-4">
            <LangToggle overDark={overDark} />
            <Button href="/visit" variant={overDark ? "ghost-dark" : "ghost"}>
              Book a trial
            </Button>
          </div>

          <SelectionTray />

          {/* 44x44, not the 40x28 the padding gave it: the bars are 24x12 and a
             tap target has to be reachable, not just visible. The negative margin
             keeps the bars flush with the shell's own edge as before. */}
          <button
            className="md:hidden -mr-2.5 inline-flex h-11 w-11 flex-col items-center justify-center gap-[5px]"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={`h-px w-6 ${bar} transition-transform ${open ? "translate-y-[6px] rotate-45" : ""}`} />
            <span className={`h-px w-6 ${bar} transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`h-px w-6 ${bar} transition-transform ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
          </button>
        </div>
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
      {/* In the phone menu the two halves grow to a real tap target; the
         desktop bar keeps the small pill it was drawn with. */}
      <button
        className="inline-flex min-h-11 items-center justify-center px-4 py-1 bg-ink-900 text-porcelain-50 md:min-h-0 md:px-2.5"
        aria-pressed="true"
      >
        EN
      </button>
      <button
        className={`inline-flex min-h-11 items-center justify-center px-4 py-1 md:min-h-0 md:px-2.5 ${inactive}`}
        aria-pressed="false"
      >
        हिं
      </button>
    </div>
  );
}
