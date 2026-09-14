"use client";

/**
 * The piece going into its cover, and travelling to the tray.
 *
 * The owner asked for the garment to be packed and fly to the header, with the
 * journey itself animated rather than a straight slide. The packing is a
 * GARMENT COVER, not a box: this shop posts nothing, and a box would picture a
 * service that does not exist — while a cover is the thing actually pulled over
 * a rented outfit before it leaves the rail, so the flourish stays true.
 *
 * How it is built, and why:
 *
 *   - The traversal is a real arc, via CSS Motion Path (`offsetPath`), not a
 *     translate tween between two points. A quadratic bezier whose control
 *     point is lifted above both ends gives the lob a thrown garment bag has.
 *     Keyframing translate would fake the same curve in three or four steps and
 *     read as a corner turned rather than a curve followed.
 *   - `offsetRotate: "0deg"` pins the rotation, because the default makes the
 *     element bank into the tangent of the path, which on a lob means it
 *     arrives upside down. The sway is applied separately and deliberately.
 *   - It is rendered into `document.body`, fixed, and `pointer-events-none`, so
 *     nothing it passes over can be clicked by accident and no ancestor's
 *     `overflow: hidden` can clip it mid-flight. Several of the surfaces this
 *     launches from — the rail, the stage — do clip.
 *   - Everything is torn down on `finish`, including when the tab is hidden
 *     mid-flight and the animation never resolves normally.
 *
 * Reduced motion skips the whole thing. The selection is still updated and the
 * tray still counts: the animation is the confirmation made pleasant, never the
 * confirmation itself.
 */

const DURATION = 820;
const COVER_MS = 240; // the cover coming down before the lob begins

/** Where the flight lands. Registered by the tray in the header. */
let target: HTMLElement | null = null;

export function registerFlightTarget(el: HTMLElement | null) {
  target = el;
}

/** A short bump on the tray, so the arrival is felt at the destination too. */
function bump(el: HTMLElement) {
  el.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.22)" },
      { transform: "scale(1)" },
    ],
    { duration: 340, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
  );
}

export function flyGarment(from: HTMLElement, image: string | null) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (target) bump(target);
    return;
  }
  if (!target) return; // tray not on screen (admin, or a very narrow header)

  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (!a.width || !b.width) return;

  // Start small enough to read as a garment bag rather than as the page's own
  // photograph detaching, but large enough to see the cover come down.
  const w = Math.min(a.width, 132);
  const h = w * 1.34; // a cover is taller than it is wide
  const x0 = a.left + a.width / 2 - w / 2;
  const y0 = a.top + a.height / 2 - h / 2;
  const dx = b.left + b.width / 2 - (x0 + w / 2);
  const dy = b.top + b.height / 2 - (y0 + h / 2);

  // The lob. The control point is lifted well above the higher of the two ends
  // so the arc clears the page rather than cutting across it; the lift scales
  // with the distance travelled, and is clamped so a short hop still arcs and a
  // full-page journey does not leave the viewport.
  const lift = Math.max(90, Math.min(Math.abs(dx) * 0.55 + 120, 380));
  const path = `path("M 0 0 Q ${dx / 2} ${Math.min(dy, 0) - lift} ${dx} ${dy}")`;

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:fixed;left:${x0}px;top:${y0}px;width:${w}px;height:${h}px;z-index:70;pointer-events:none;will-change:transform;`;

  // The cover: a porcelain panel with a gold keyline and a drawn hook, sliding
  // down over the garment. `overflow:hidden` on the inner box is what makes the
  // panel arrive as a cover rather than as a rectangle floating over the photo.
  host.innerHTML = `
    <div class="gf-inner" style="position:relative;width:100%;height:100%;overflow:hidden;border-radius:2px;box-shadow:0 18px 40px -12px rgba(25,17,41,0.55);">
      ${
        image
          ? `<img src="${image}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">`
          : `<div style="position:absolute;inset:0;background:#2a1f42;"></div>`
      }
      <div class="gf-cover" style="position:absolute;inset:0;transform:translateY(-101%);background:rgba(250,248,245,0.74);backdrop-filter:blur(2.5px);-webkit-backdrop-filter:blur(2.5px);border:1px solid rgba(198,160,74,0.55);display:flex;align-items:flex-start;justify-content:center;padding-top:9px;">
        <svg width="26" height="20" viewBox="0 0 26 20" fill="none" aria-hidden="true">
          <path d="M13 6.5c0-2 1.4-3 2.8-3 1.5 0 2.7 1.1 2.7 2.6" stroke="#c6a04a" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M13 6.5 3 13.4c-.8.6-.4 1.9.6 1.9h18.8c1 0 1.4-1.3.6-1.9L13 6.5Z" stroke="#c6a04a" stroke-width="1.4" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>`;

  document.body.appendChild(host);
  const inner = host.firstElementChild as HTMLElement;
  const cover = host.querySelector(".gf-cover") as HTMLElement;

  // 1. The cover comes down over the piece.
  cover.animate(
    [{ transform: "translateY(-101%)" }, { transform: "translateY(0)" }],
    { duration: COVER_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
  );

  // 2. The lob, beginning as the cover lands.
  const flight = host.animate(
    [
      { offsetDistance: "0%", opacity: 1 },
      { offsetDistance: "100%", opacity: 1, offset: 0.82 },
      { offsetDistance: "100%", opacity: 0 },
    ],
    {
      duration: DURATION,
      delay: COVER_MS * 0.7,
      easing: "cubic-bezier(0.32, 0, 0.2, 1)",
      fill: "forwards",
    }
  );
  host.style.offsetPath = path;
  host.style.offsetRotate = "0deg";

  // 3. It shrinks into the tray, and sways on the way like something hanging.
  inner.animate(
    [
      { transform: "scale(1) rotate(0deg)" },
      { transform: "scale(0.62) rotate(-7deg)", offset: 0.45 },
      { transform: "scale(0.16) rotate(3deg)" },
    ],
    {
      duration: DURATION,
      delay: COVER_MS * 0.7,
      easing: "cubic-bezier(0.32, 0, 0.2, 1)",
      fill: "forwards",
    }
  );

  const done = () => {
    host.remove();
    if (target) bump(target);
  };
  flight.addEventListener("finish", done, { once: true });
  // A tab hidden mid-flight never fires `finish`, so the node would outlive the
  // gesture and sit over the page on return.
  flight.addEventListener("cancel", () => host.remove(), { once: true });
  window.setTimeout(() => {
    if (host.isConnected) done();
  }, DURATION + COVER_MS + 400);
}
