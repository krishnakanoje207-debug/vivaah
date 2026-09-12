"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

/**
 * The persistent room index (DESIGN_SPEC_V3 §2.3).
 *
 * Names the rooms, never counts them: no numerals, no `N / N` readout. It jumps
 * rather than scroll-guiding, because three trades share this roof and a visitor
 * who came for jewellery must not be made to scroll through retail.
 *
 * Active room comes from an IntersectionObserver on each room root. The label
 * colours follow a different test: whether a dark section overlaps the rail's
 * own box, which is not the same as which room is active (see `pick`). A scrim
 * fades in behind the rail only, since the rail is fixed over rooms of both
 * grounds and cannot inherit one.
 *
 * One page at a time (the page passes its own room list); desktop only. Below 1024px the site nav already carries the
 * cross-trade jumps and a fixed rail has nowhere to stand.
 *
 * It sits on the RIGHT edge: the owner's call, 9 Sep 2026, having seen it on the
 * left ("it does not fit there"). Recorded in DESIGN_SPEC_V3 §7.3.
 *
 * Reduced motion: the jump is an instant snap, per the sitewide rule.
 */

export type Room = { id: string; label: string };

export function RoomIndex({ rooms }: { rooms: readonly Room[] }) {
  const [active, setActive] = useState<string>(rooms[0]?.id ?? "");
  const [onDark, setOnDark] = useState(true);
  // At rest the index is six rules and nothing else. Labels and the plate are
  // summoned — by hover, by keyboard focus, and for a moment after any scroll,
  // which is when a reader is actually asking "where am I". See the nav below.
  const [revealed, setRevealed] = useState(false);
  const [reduce, setReduce] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sections = rooms
      .map((r) => document.getElementById(r.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;

    // Two separate questions, and conflating them was a bug worth spelling out.
    //
    // WHICH ROOM AM I IN is the room crossing the reading line. Rooms are
    // viewport-tall or taller, so exactly one qualifies.
    //
    // WHAT IS BEHIND THE RAIL is not the same question. The threshold's film is
    // `sticky`, so it stays painted for about 20px of scroll after the reading
    // line has already moved into the next room. Driving the labels off the
    // active room put ink-600 on a still-visible dark frame for that window,
    // measured at 1.11:1. So the ground is read from whatever dark section
    // actually overlaps the rail's own box. The plate is near-opaque, so
    // whenever it is on it supplies the dark ground itself, and every label can
    // use its on-dark colour even while the rail straddles a boundary.
    const pick = () => {
      const mid = window.innerHeight * 0.42;
      let best: HTMLElement | null = null;
      for (const el of sections) {
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) best = el;
      }
      if (best) setActive(best.id);

      const rail = navRef.current?.getBoundingClientRect();
      if (!rail) return;
      setOnDark(
        sections.some((el) => {
          if (!el.hasAttribute("data-dark")) return false;
          const r = el.getBoundingClientRect();
          return r.top < rail.bottom && r.bottom > rail.top;
        })
      );
    };

    // IntersectionObserver on each room root drives the state (§2.3); it fires
    // too coarsely for a mid-line test on its own, so scroll keeps it honest.
    const observer = new IntersectionObserver(pick, {
      threshold: [0, 0.01, 0.25, 0.5, 0.75, 1],
    });

    sections.forEach((el) => observer.observe(el));
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    pick();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, [rooms]);

  // Reduced motion keeps the labels up permanently rather than fading them in
  // and out: a reader who has asked for less movement should not have to
  // provoke the navigation into appearing, and the fade is the only thing being
  // removed here, not the information.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Scroll summons the labels, then they retire. 1.4s: long enough to read six
  // of them after a flick, short enough that the photograph is clear again by
  // the time the reader has settled.
  useEffect(() => {
    const onScroll = () => {
      setRevealed(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setRevealed(false), 1400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const jump = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return; // let the browser follow the hash
    e.preventDefault();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.scrollIntoView({ behavior: "auto", block: "start" });
    } else {
      gsap.to(window, {
        scrollTo: { y: el, autoKill: false },
        duration: 0.7,
        ease: "power2.inOut",
      });
    }
    // The hash is the durable address of a room; keep it without a second jump.
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav
      ref={navRef}
      aria-label="Rooms"
      onPointerEnter={() => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setRevealed(true);
      }}
      onPointerLeave={() => setRevealed(false)}
      // Focus bubbles in React, so tabbing into any room link summons the
      // labels. Without this the index would be navigable but unreadable by
      // keyboard, which is the one way of using it that cannot hover.
      onFocus={() => setRevealed(true)}
      onBlur={() => setRevealed(false)}
      className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 py-4 pr-3 pl-6 lg:flex"
      style={{ isolation: "isolate" }}
    >
      {/* Scrim behind the rail only, and only over a dark ground. */}
      <div
        aria-hidden="true"
        /* Wide enough on the left to carry the longest label ("The arithmetic")
           clear of the film underneath it. */
        /* -inset-y-8, not -3: the vertical fade below happens inside this
           margin, so the margin has to be deep enough for the fade to be a fade.
           At -3 the mask had ~16px to get from transparent to opaque and the
           plate's top and bottom read as cut lines. */
        className="pointer-events-none absolute -inset-y-8 -right-8 -left-16 -z-10 transition-opacity duration-300 ease-out-strong"
        style={{
          // The plate only exists to carry the LABELS over the film, so it is
          // gated on the labels being up. At rest there is no plate at all,
          // which is what removes the hard-edged box from the hero photograph
          // (owner, 12 Sep 2026). Its falloff was never the whole problem, but
          // it was never soft enough to read as a wash either.
          opacity: onDark && (revealed || reduce) ? 1 : 0,
          // Near solid, not a soft wash. Measured against the film's brightest
          // frames (a sunlit wall), violet-300 needs about 88% violet-950
          // coverage to hold 4.5:1 at caption size; a gentle radial left the
          // labels at 2.8:1. Only the inner (left) edge fades, so the plate
          // reads as a plate rather than as a box.
          background:
            "linear-gradient(to left, color-mix(in srgb, var(--color-violet-950) 90%, transparent) 0%, color-mix(in srgb, var(--color-violet-950) 90%, transparent) 68%, transparent 100%)",
          // Softens the plate's top and bottom edges only in the margin above
          // and below the labels, so it reads as a plate and not as a box. The
          // labels sit inside the opaque 8-92% band and lose nothing.
          // Three stops a side rather than one, so the ramp is perceptually
          // smooth instead of a straight alpha line. The labels still sit
          // wholly inside the opaque 14–86% band; only the deepened margin
          // above and below them is being faded.
          maskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 7%, black 14%, black 86%, rgba(0,0,0,0.45) 93%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 7%, black 14%, black 86%, rgba(0,0,0,0.45) 93%, transparent 100%)",
        }}
      />
      {rooms.map((r) => {
        const on = active === r.id;
        return (
          <a
            key={r.id}
            href={`#${r.id}`}
            onClick={(e) => jump(e, r.id)}
            aria-current={on ? "true" : undefined}
            className="group flex flex-row-reverse items-center gap-[9px] text-right text-[10.5px] uppercase tracking-[0.17em] transition-colors duration-250"
            style={{
              // Fades, never unmounts. The label stays in the accessibility tree
              // and stays the link's accessible name at all times; only its
              // paint is gated, so a screen reader and the tab order see an
              // index that is always fully labelled.
              // The anchor keeps its full width at rest too, which leaves the
              // hit target the size it always was — the marks are 26px and
              // would be a cruel click target on their own.
              // §5.2, verbatim: label text is ink-900 active / ink-600 at rest
              // (porcelain-50 / violet-300 over a dark room), and gold belongs
              // to the active mark alone. No opacity dimming: at caption size it
              // drags ink-600 and violet-300 straight through the AA floor, and
              // measured, it was the single largest cause of failure here.
              color: on
                ? onDark
                  ? "var(--color-porcelain-50)"
                  : "var(--color-ink-900)"
                : onDark
                  ? "var(--color-violet-300)"
                  : "var(--color-ink-600)",
            }}
          >
            {/* Grows by scaleX, never by width: §3's global rule.
                This is the whole index at rest, so it carries a drop-shadow now:
                with the plate gone the marks sit directly on the film, and a 1px
                rule at 0.5 opacity disappears entirely over its sunlit frames.
                A shadow rather than a scrim because it costs one filter on six
                1px elements and needs no box. */}
            <span
              aria-hidden="true"
              className="h-px w-[26px] origin-right transition-[transform,opacity] duration-250"
              style={{
                transform: `scaleX(${on ? 1 : 0.54})`,
                opacity: on ? 1 : 0.5,
                background: on
                  ? onDark
                    ? "var(--color-gold-500)"
                    : "var(--color-gold-600)"
                  : "currentColor",
                filter: onDark
                  ? "drop-shadow(0 1px 2px rgba(25,17,41,0.65))"
                  : "none",
              }}
            />
            <span
              className="transition-opacity duration-250 ease-out-strong"
              style={{ opacity: revealed || reduce ? 1 : 0 }}
            >
              {r.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
