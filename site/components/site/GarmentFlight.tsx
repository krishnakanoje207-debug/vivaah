"use client";

import { useSyncExternalStore } from "react";

/**
 * The piece being set aside: its photograph gathers into a small arch and is
 * lifted onto the hanger in the header.
 *
 * Rebuilt 14 Sep 2026. The first version pulled a frosted "garment cover" over
 * a thumbnail and lobbed it in a high arc; the owner judged both the animation
 * and its path wrong. Read frame by frame it was a thrown object: it left the
 * page upwards, banked, swayed, and arrived at the tray from above at 16% of its
 * size, which is the fly-to-cart gesture every shop uses. What is actually done
 * with a garment someone is considering is quieter: it is taken off the display
 * and hung on the rail behind the counter. So:
 *
 *   - IT IS THE PHOTOGRAPH, not a token. The ghost starts exactly on the card's
 *     own clipped image, same box and same border-radius (so the arch comes
 *     along without this file knowing about `.arch`), and gathers down to a
 *     40px swatch. Nothing is drawn that the card did not already show.
 *   - THE PATH IS ACROSS, THEN UP. x and y run on nested layers with different
 *     curves: x front-loaded, y eased at both ends. The swatch crosses to the
 *     tray's column first and then rises into the hook, decelerating from
 *     below, which is how a hanger is put on a rail. No lift above the page, no
 *     banking, no rotation in flight. A single element tweened between two
 *     points cannot do this; two layers with two easings trace the curve for
 *     free and stay on the compositor.
 *   - THE ARRIVAL IS FELT AT THE DESTINATION. The hanger swings once about its
 *     hook like something with weight has been hung on it, damped over ~0.7s,
 *     and the count rolls up. The count does not change when the button is
 *     pressed: the tray reads `useAirborne()` and holds the number back until
 *     the piece lands, so cause, travel and result are one sentence.
 *
 * Rendered into `document.body`, fixed and `pointer-events: none`: several of
 * the surfaces this launches from clip (`overflow: hidden`), and nothing it
 * crosses can be clicked by accident. Every path ends in `land`, including a
 * tab hidden mid-flight, so the count can never be left held back.
 *
 * Reduced motion: nothing travels and nothing swings. The number still arrives
 * with a short opacity fade, because that is the confirmation, not decoration.
 */

const SWATCH_W = 40; // px, the gathered piece; 4:5 like the cards
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"; // --ease-out-strong
const EASE_GATHER = "cubic-bezier(0.33, 1, 0.68, 1)"; // gentler: the gather is seen
const LEAD = 0.14; // share of the flight the gather has to itself before travel
const EASE_X = "cubic-bezier(0.3, 0.6, 0.35, 1)"; // across early
const EASE_Y = "cubic-bezier(0.65, 0, 0.35, 1)"; // rises late, settles

/** Where the flight lands. Registered by the tray in the header. */
let target: HTMLElement | null = null;

export function registerFlightTarget(el: HTMLElement | null) {
  target = el;
}

// Pieces in the air. A module-level store in the same shape as lib/selection:
// the tray subtracts it from the real count so the number waits for the piece.
let airborne = 0;
const listeners = new Set<() => void>();
function setAirborne(n: number) {
  airborne = Math.max(0, n);
  listeners.forEach((fn) => fn());
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function useAirborne(): number {
  return useSyncExternalStore(subscribe, () => airborne, () => 0);
}

/** The count, once React has painted the new number. */
function tick(reduced: boolean, hadPill: boolean) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const num = target?.querySelector<HTMLElement>("[data-count]");
      const pill = target?.querySelector<HTMLElement>("[data-count-pill]");
      if (!num) return;
      if (reduced) {
        num.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
        return;
      }
      // The first piece brings the pill itself; later ones roll the figure
      // inside it, so a changing number never looks like a new badge.
      if (!hadPill && pill) {
        pill.animate(
          [
            { transform: "scale(0.4)", opacity: 0 },
            { transform: "scale(1)", opacity: 1 },
          ],
          { duration: 320, easing: EASE_OUT },
        );
      } else {
        num.animate(
          [
            { transform: "translateY(70%)", opacity: 0 },
            { transform: "translateY(0)", opacity: 1 },
          ],
          { duration: 300, easing: EASE_OUT },
        );
      }
    }),
  );
}

/**
 * One swing about the hook, as if weight had just been hung on it. `dir` is
 * the side the piece came from: its momentum carries the hanger's foot onward.
 */
function sway(dir: number) {
  const svg = target?.querySelector("svg");
  if (!svg) return;
  const a = 9 * dir;
  // The hook is at the top of the drawing, so that is the pivot.
  svg.style.transformOrigin = "50% 22%";
  // Each half-swing eases in and out on its own (a pendulum is slowest at the
  // ends of its travel), and each is shorter and smaller than the last.
  const swing = [0, a, -a * 0.55, a * 0.25, -a * 0.08, 0];
  const at = [0, 0.2, 0.46, 0.7, 0.88, 1];
  svg.animate(
    swing.map((deg, i) => ({
      transform: `rotate(${deg}deg)`,
      offset: at[i],
      easing: "cubic-bezier(0.37, 0, 0.63, 1)",
    })),
    { duration: 760 },
  );
}

/** The nearest box that actually clips `el`, so the ghost matches what shows. */
function clipBox(el: HTMLElement): HTMLElement {
  const parent = el.parentElement;
  if (el.tagName === "IMG" && parent && getComputedStyle(parent).overflow !== "visible") {
    return parent;
  }
  return el;
}

export function flyGarment(from: HTMLElement, image: string | null) {
  if (typeof window === "undefined" || !target) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hadPill = !!target.querySelector("[data-count-pill]");
  if (reduced) {
    tick(true, hadPill);
    return;
  }

  const hook = (target.querySelector("svg") ?? target).getBoundingClientRect();
  const isPhoto = from.tagName === "IMG";
  const box = isPhoto ? clipBox(from) : from;
  const a = box.getBoundingClientRect();
  if (!a.width || !hook.width) return;

  // A photograph starts as itself and gathers. Anything else (the product
  // page's button, a card still waiting for its photograph) starts as the
  // swatch at the centre of what was pressed, since blowing a button up to a
  // picture would be a shape the page never had.
  const w = isPhoto ? a.width : SWATCH_W;
  const h = isPhoto ? a.height : SWATCH_W * 1.25;
  const cx = a.left + a.width / 2;
  const cy = a.top + a.height / 2;
  const dx = hook.left + hook.width / 2 - cx;
  const dy = hook.top + hook.height / 2 - cy;
  const gathered = SWATCH_W / w;

  // Longer journeys take a little longer, never so long it feels like waiting.
  const T = Math.round(Math.min(900, Math.max(620, 560 + Math.hypot(dx, dy) * 0.18)));

  const layer = (css: string) => {
    const d = document.createElement("div");
    d.style.cssText = css;
    return d;
  };
  const fill = "position:absolute;inset:0;";
  const host = layer(
    `position:fixed;left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;z-index:70;pointer-events:none;`,
  );
  host.setAttribute("aria-hidden", "true");
  const xl = layer(fill + "will-change:transform;");
  const yl = layer(fill + "will-change:transform;");
  const body = layer(fill + "will-change:transform,opacity;");
  const radius = isPhoto ? getComputedStyle(box).borderRadius : "50% 50% 3px 3px / 22% 22% 3px 3px";
  // The lift shadow is its own layer so it can come up as the piece leaves the
  // card, instead of a 40px shadow appearing around the card's photograph.
  const shade = layer(
    fill + `border-radius:${radius};box-shadow:0 14px 30px -10px rgba(25,17,41,0.5);opacity:0;`,
  );
  const clip = layer(fill + `border-radius:${radius};overflow:hidden;background:#f2f1ec;`);

  // DOM calls, never an HTML string: `image` is an admin-entered path, and a
  // quote in it must not be able to break out of an attribute.
  if (image) {
    const img = document.createElement("img");
    img.src = isPhoto ? (from as HTMLImageElement).currentSrc || image : image;
    img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    clip.appendChild(img);
  } else {
    // The card's own "photograph coming" ornament, so a piece with no picture
    // travels as what the card shows rather than as a blank.
    clip.style.cssText += "display:flex;align-items:center;justify-content:center;border:1px solid rgba(169,133,58,0.45);color:#a9853a;font-size:12px;";
    clip.textContent = "✦";
  }

  // appendChild, not append: the Workers type definitions in
  // worker-configuration.d.ts put a FormData-shaped `append` in scope and tsc
  // resolves the Element one to it.
  body.appendChild(shade);
  body.appendChild(clip);
  yl.appendChild(body);
  xl.appendChild(yl);
  host.appendChild(xl);
  document.body.appendChild(host);
  setAirborne(airborne + 1);

  // The piece starts gathering before it starts moving, so the first thing
  // seen is the photograph lifting off its card, not a thumbnail shooting away.
  const opts = (easing: string): KeyframeAnimationOptions => ({
    duration: T * (1 - LEAD),
    delay: T * LEAD,
    easing,
    fill: "forwards",
  });
  xl.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dx}px)` }], opts(EASE_X));
  const flight = yl.animate([{ transform: "translateY(0)" }, { transform: `translateY(${dy}px)` }], opts(EASE_Y));

  // Gather over the first ~40%, hold as a swatch, then go into the hook: the
  // last stretch shrinks it under the hanger's own drawing and lets it go.
  const s0 = isPhoto ? 1 : 0.5;
  const s1 = isPhoto ? gathered : 1;
  body.animate(
    [
      { transform: `scale(${s0})`, opacity: isPhoto ? 1 : 0, easing: EASE_GATHER },
      { transform: `scale(${s1})`, opacity: 1, offset: 0.42 },
      { transform: `scale(${s1})`, opacity: 1, offset: 0.82, easing: EASE_OUT },
      { transform: `scale(${s1 * 0.4})`, opacity: 0 },
    ],
    { duration: T, fill: "forwards" },
  );
  shade.animate([{ opacity: 0 }, { opacity: 1, offset: 0.42 }, { opacity: 1 }], {
    duration: T,
    fill: "forwards",
  });

  let landed = false;
  const land = () => {
    if (landed) return;
    landed = true;
    host.remove();
    setAirborne(airborne - 1);
    sway(dx > 0 ? -1 : 1);
    tick(false, hadPill);
  };
  flight.addEventListener("finish", land, { once: true });
  flight.addEventListener("cancel", land, { once: true });
  // A hidden tab may never deliver `finish`; the count must not stay held.
  window.setTimeout(land, T + 400);
}
