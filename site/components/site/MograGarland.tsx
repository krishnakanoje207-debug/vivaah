"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/**
 * A garland of mogra buds and small roses across the whole /rentals head, hung
 * like a toran over a doorway: the flowers of a wedding day, drawn rather than
 * shipped as a picture.
 *
 * Why (owner, 15 Sep 2026): the rentals head was remade in the retail and
 * jewellery layout with this garland behind its arcade, then "extend the
 * background to full hero section, it looks odd as it is now". So it frames the
 * section, not the arches. The parent gives it a layer: an `absolute inset-0
 * -z-10 overflow-hidden` box inside an isolated section, under the type column
 * (`relative z-10`) and the arcade.
 *
 * It frames the content and never sits on it. Two compositions:
 *
 *   md up (landscape, 1600-wide box scaled to the section's width, top
 *   anchored). A toran of five swags edge to edge along the top, rose knots
 *   where they meet, every dip above the heading. Pendants: a short one at the
 *   far left edge, one beside the arches, one down the right edge, kept clear
 *   of the room index rail that sits in the last ~60px. The heading and buttons
 *   sit in vb x 140-720, y 250-650 at every width from 1280 to 2560; nothing
 *   is drawn there.
 *
 *   Below md (portrait). On a phone the text sits at the top and the arcade
 *   below it, and the heading wraps differently at every width, so the drawing
 *   is anchored to what it frames rather than to one box: a strip of three
 *   shallow swags along the section's top edge above the eyebrow (shallow
 *   enough to clear it even at 767px, where the strip is drawn 1.9x), and a garland
 *   anchored to the section's BOTTOM crosses above the arcade's domes with a
 *   pendant down each gutter. Its box is drawn against the arcade (arcade
 *   x 16-384, y 83-503 of 400x560, the knot kept ~50px under the buttons, i.e. 92% of the width, bottom 56px up), so
 *   it tracks the arches however the text above them wraps.
 *
 * The buds are ivory on the light stage ground, so each carries a warm edge and
 * a soft offset shadow; otherwise white on #ecebe7 would simply vanish.
 *
 * Motion: the garland breathes a fraction of a degree, the pendants swing
 * about where they hang on different phases, and a few petals come loose and
 * drift down, never from above the text. Only the composition on screen
 * animates, and it pauses off screen. Reduced motion, and the server render:
 * the still garland, no petals.
 */

type P = [number, number];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

// A hanging swag between two points: a catenary-shaped dip (cosh profile,
// zero at both ends, `sag` below the chord at the middle; negative arches up).
function swag(a: P, b: P, sag: number, n = 240): P[] {
  const k = 1.3;
  const c = Math.cosh(k);
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const dip = (sag * (Math.cosh(k * (2 * t - 1)) - c)) / (1 - c);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + dip]);
  }
  return out;
}

// A pendant strand: straight down with a slight lean, as a quadratic.
function pendant(top: P, length: number, lean: number, n = 120): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([top[0] + lean * t * t, top[1] + length * t]);
  }
  return out;
}

// The point of a polyline nearest a given x.
const atX = (pts: P[], x: number): P =>
  pts.reduce((best, p) => (Math.abs(p[0] - x) < Math.abs(best[0] - x) ? p : best));

function pathOf(pts: P[]) {
  return `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join("L")}`;
}

type Item = { kind: "bud" | "open" | "rose"; x: number; y: number; r: number; s: number; v: number };

// Walks a polyline at even arc-length steps and strings flowers along it.
function string(
  pts: P[],
  rand: () => number,
  items: Item[],
  opts: { step: number; roseEvery: number; phase: number; scale?: number }
) {
  const sc = opts.scale ?? 1;
  const step = opts.step * sc;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = cum[cum.length - 1];
  let j = 0;
  let side = 1;
  let sinceRose = opts.phase * sc;
  for (let d = step * 0.5; d < total; d += step) {
    while (j < cum.length - 2 && cum[j + 1] < d) j++;
    const t = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
    const x = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t;
    const y = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t;
    const tan = (Math.atan2(pts[j + 1][1] - pts[j][1], pts[j + 1][0] - pts[j][0]) * 180) / Math.PI;

    sinceRose += step;
    if (sinceRose >= opts.roseEvery * sc) {
      sinceRose = 0;
      items.push({ kind: "rose", x, y, r: rand() * 360, s: (0.85 + rand() * 0.3) * sc, v: Math.floor(rand() * 3) });
      continue;
    }
    if (rand() < 0.17) {
      items.push({ kind: "open", x: x + (rand() - 0.5) * 6 * sc, y: y + (rand() - 0.5) * 6 * sc, r: rand() * 60, s: (0.8 + rand() * 0.35) * sc, v: 0 });
      continue;
    }
    // Buds lie close along the thread, as they are strung in a gajra: each
    // points forward or back and a little out to one side, alternating, and
    // they overlap. Splayed square to the thread they read as a fern.
    side = -side;
    const back = rand() < 0.45 ? 180 : 0;
    const out = side * (18 + rand() * 30) * (back ? -1 : 1);
    const r = tan + back + out;
    const nx = -Math.sin((tan * Math.PI) / 180) * side * 2.2 * sc;
    const ny = Math.cos((tan * Math.PI) / 180) * side * 2.2 * sc;
    items.push({ kind: "bud", x: x + nx, y: y + ny, r, s: (0.8 + rand() * 0.35) * sc, v: rand() < 0.28 ? 1 : 0 });
  }
}

// Buds first, roses last, so a rose always sits on top of the buds around it.
const byKind = (a: Item, b: Item) => (a.kind === "rose" ? 1 : 0) - (b.kind === "rose" ? 1 : 0);

type Pendant = { pts: P[]; items: Item[]; origin: P };
type Comp = {
  threads: P[][];
  swagItems: Item[];
  pendants: Pendant[];
  knots: { at: P; s: number }[];
  drifters: Item[];
};

function hang(top: P, length: number, lean: number, rand: () => number, scale = 1, phase = 40): Pendant {
  const pts = pendant(top, length, lean);
  const items: Item[] = [];
  string(pts, rand, items, { step: 5.8, roseEvery: 108, phase, scale });
  return { pts, items: items.sort(byKind), origin: top };
}

// ---- md up: the toran across the top of a 1600-wide box ---------------------
function growLandscape(): Comp {
  const rand = mulberry32(2609);
  const K: P[] = [[-40, 14], [330, 22], [760, 10], [1150, 20], [1500, 8], [1680, 22]];
  const sags = [104, 118, 112, 104, 60];
  const threads = K.slice(0, -1).map((k, i) => swag(k, K[i + 1], sags[i]));
  const swagItems: Item[] = [];
  threads.forEach((t, i) => string(t, rand, swagItems, { step: 5.6, roseEvery: 104, phase: 20 + i * 17 }));

  const pendants = [
    hang(atX(threads[0], 44), 220, 5, rand, 0.95, 30),
    hang(K[2], 160, -4, rand, 0.9, 70),
    hang(K[4], 430, -6, rand, 1, 50),
  ];

  return {
    threads,
    swagItems: swagItems.sort(byKind),
    pendants,
    knots: K.slice(1, -1).map((at, i) => ({ at, s: i === 1 || i === 3 ? 1 : 0.85 })),
    // Petals come loose only where they fall clear of the type: over and right
    // of the arches, or down the far left gutter.
    drifters: swagItems.filter((it, k) => it.kind !== "open" && (it.x > 820 || it.x < 100) && k % 17 === 5).slice(0, 8),
  };
}

// ---- below md: the garland over the arcade, anchored to the section bottom --
function growPortrait(): Comp {
  const rand = mulberry32(1507);
  const C: P = [258, 94];
  const left = swag([-24, 140], C, 38);
  const right = swag(C, [424, 124], 28);
  const swagItems: Item[] = [];
  string(left, rand, swagItems, { step: 5.6, roseEvery: 92, phase: 40, scale: 0.8 });
  string(right, rand, swagItems, { step: 5.6, roseEvery: 88, phase: 30, scale: 0.8 });
  return {
    threads: [left, right],
    swagItems: swagItems.sort(byKind),
    pendants: [hang(atX(left, 7), 300, 2, rand, 0.7, 60), hang(atX(right, 393), 350, -2, rand, 0.7, 30)],
    knots: [{ at: C, s: 0.85 }],
    drifters: swagItems.filter((it, k) => it.kind !== "open" && k % 13 === 4).slice(0, 6),
  };
}

// ---- below md: the strip of shallow swags along the top edge ---------------
function growStrip() {
  const rand = mulberry32(88);
  const K: P[] = [[-14, 2], [133, 6], [267, 4], [414, 2]];
  const threads = K.slice(0, -1).map((k, i) => swag(k, K[i + 1], 12));
  const items: Item[] = [];
  threads.forEach((t, i) => string(t, rand, items, { step: 5.6, roseEvery: 70, phase: 10 + i * 20, scale: 0.62 }));
  return { threads, items: items.sort(byKind), knots: K.slice(1, -1) };
}

const LAND = growLandscape();
const PORT = growPortrait();
const STRIP = growStrip();

// Narrow at the stem, full towards the tip: a bud, not a leaf.
const BUD = "M0 0C3 -1.4 8.5 -4.6 14.5 -4.7C19.6 -4.8 22.4 -2.4 22.4 0C22.4 2.4 19.6 4.8 14.5 4.7C8.5 4.6 3 1.4 0 0Z";
const OPEN_PETAL = "M0 0C2.8 -3 3.8 -8.6 0 -12.6C-3.8 -8.6 -2.8 -3 0 0Z";
const JASMINE_PETAL = "M0 0C3 -2.4 4 -8 0 -11C-4 -8 -3 -2.4 0 0Z";
const ROSE_PETAL = "M0 0C-5 -2 -6.5 -8.5 -2.5 -10.5Q0 -11.5 2.5 -10.5C6.5 -8.5 5 -2 0 0Z";

const ROSES = [
  { outer: "#ecb9c5", mid: "#e19aad", inner: "#cf7892", line: "#a9546f" },
  { outer: "#e2a1b3", mid: "#d4839b", inner: "#bf6282", line: "#95405f" },
  { outer: "#d98ea4", mid: "#c7708d", inner: "#ab4f72", line: "#833453" },
];

const THREAD = "#b39561";

function Items({ items }: { items: Item[] }) {
  return (
    <>
      {items.map((it, k) => (
        <use
          key={k}
          href={it.kind === "rose" ? `#mogra-rose${it.v}` : it.kind === "open" ? "#mogra-open" : `#mogra-bud${it.v}`}
          transform={`translate(${f(it.x)} ${f(it.y)}) rotate(${f(it.r)}) scale(${it.s.toFixed(2)})`}
        />
      ))}
    </>
  );
}

function Tassel({ at, s = 1 }: { at: P; s?: number }) {
  return (
    <g transform={`translate(${f(at[0])} ${f(at[1])}) scale(${s})`}>
      <path d="M-3.5 6L-6 30M-1.8 6L-3 32M0 6L0 33M1.8 6L3 32M3.5 6L6 30" stroke="#b08a3e" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M-4 5.5H4L3 9H-3Z" fill="#a9853a" />
      <circle r="5.4" fill="url(#mogra-gold)" stroke="#8f6f2f" strokeWidth="0.5" />
    </g>
  );
}

// Three roses and a gold bead where two swags meet.
function Knot({ at, s }: { at: P; s: number }) {
  return (
    <g transform={`translate(${f(at[0])} ${f(at[1])}) scale(${s})`}>
      <use href="#mogra-rose2" transform="translate(-13 4) rotate(20) scale(1.15)" />
      <use href="#mogra-rose0" transform="translate(13 3) rotate(-40) scale(1.1)" />
      <use href="#mogra-rose1" transform="translate(0 -8) rotate(80) scale(1.25)" />
      <circle cy="13" r="4.6" fill="url(#mogra-gold)" stroke="#8f6f2f" strokeWidth="0.5" />
    </g>
  );
}

function Garland({ comp, tassel, moving }: { comp: Comp; tassel: number; moving: boolean }) {
  return (
    <>
      <g data-garland="">
        <g fill="none" stroke={THREAD} strokeWidth="1.3" strokeLinecap="round">
          {comp.threads.map((t, k) => (
            <path key={k} d={pathOf(t)} />
          ))}
        </g>

        {comp.pendants.map((p, k) => (
          <g key={k} data-pendant="" data-origin={`${f(p.origin[0])} ${f(p.origin[1])}`}>
            <path d={pathOf(p.pts)} fill="none" stroke={THREAD} strokeWidth="1.2" />
            <Items items={p.items} />
            <Tassel at={p.pts[p.pts.length - 1]} s={tassel} />
          </g>
        ))}

        <Items items={comp.swagItems} />
        {comp.knots.map((k, i) => (
          <Knot key={i} at={k.at} s={k.s} />
        ))}
      </g>

      {moving &&
        comp.drifters.map((d, k) => (
          <g key={`p${k}`} transform={`translate(${f(d.x)} ${f(d.y)})`}>
            <g data-petal="" data-dir={d.x < 400 ? "-1" : "1"} opacity="0">
              {d.kind === "rose" ? (
                <path d={ROSE_PETAL} transform="scale(0.9)" fill={ROSES[d.v].outer} stroke={ROSES[d.v].line} strokeOpacity="0.4" strokeWidth="0.6" />
              ) : (
                <path d={JASMINE_PETAL} fill="#fffdf6" stroke="#cdb893" strokeWidth="0.7" />
              )}
            </g>
          </g>
        ))}
    </>
  );
}

function Strip({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 32" className={className}>
      <g fill="none" stroke={THREAD} strokeWidth="1">
        {STRIP.threads.map((t, k) => (
          <path key={k} d={pathOf(t)} />
        ))}
      </g>
      <Items items={STRIP.items} />
      {STRIP.knots.map((at, k) => (
        <Knot key={k} at={at} s={0.5} />
      ))}
    </svg>
  );
}

export function MograGarland() {
  const landRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<HTMLDivElement>(null);
  const [moving, setMoving] = useState(false);
  const [wide, setWide] = useState<boolean | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setMoving(true);
    const mq = window.matchMedia("(min-width: 768px)");
    const read = () => setWide(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  useEffect(() => {
    const root = wide ? landRef.current : portRef.current;
    if (!root || !moving || wide === null) return;

    const anims: gsap.core.Animation[] = [];
    const ctx = gsap.context(() => {
      root.querySelectorAll<SVGGElement>("[data-garland]").forEach((el) => {
        const box = el.ownerSVGElement?.viewBox.baseVal;
        anims.push(
          gsap.to(el, {
            rotation: wide ? 0.16 : 0.3,
            svgOrigin: box ? `${box.width / 2} 0` : "0 0",
            duration: 6.5,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          })
        );
      });
      gsap.utils.toArray<SVGGElement>("[data-pendant]").forEach((el, k) => {
        const a = (k % 2 ? 1 : -1) * (0.9 + (k % 3) * 0.15);
        gsap.set(el, { rotation: a, svgOrigin: el.dataset.origin });
        anims.push(
          gsap.to(el, {
            rotation: -a,
            svgOrigin: el.dataset.origin,
            duration: 4.2 + k * 0.7,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          })
        );
      });
      gsap.utils.toArray<SVGGElement>("[data-petal]").forEach((el, k) => {
        const dur = 11 + (k % 3) * 2;
        const tl = gsap.timeline({ repeat: -1, delay: 1.2 + k * 1.9, repeatDelay: 2 + (k % 3) });
        tl.set(el, { x: 0, y: 0, rotation: 0, opacity: 0 })
          .to(el, { opacity: 0.95, duration: 1.2, ease: "power1.out" })
          .to(el, { y: 380 + (k % 4) * 60, duration: dur, ease: "none" }, 0)
          // Left of the arches a petal only ever drifts outward, away from the type.
          .to(el, { x: (el.dataset.dir === "-1" ? -1 : k % 2 ? 1 : -1) * (60 + (k % 5) * 24), duration: dur, ease: "sine.inOut" }, 0)
          .to(el, { rotation: (k % 2 ? -1 : 1) * 300, duration: dur, ease: "none" }, 0)
          .to(el, { opacity: 0, duration: 2.5, ease: "power1.in" }, dur - 3);
        anims.push(tl);
      });
    }, root);

    const io = new IntersectionObserver(([e]) => {
      anims.forEach((a) => (e.isIntersecting ? a.resume() : a.pause()));
    });
    io.observe(root);

    return () => {
      io.disconnect();
      ctx.revert();
    };
  }, [moving, wide]);

  return (
    <>
      {/* Shared symbols, in an svg that is never display:none: a gradient
          referenced from inside a hidden svg does not paint in Chrome. */}
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="mogra-budfill" x1="0" y1="-5" x2="0" y2="5" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fffef9" />
            <stop offset="0.55" stopColor="#fbf6ea" />
            <stop offset="1" stopColor="#eadcc2" />
          </linearGradient>
          <radialGradient id="mogra-openfill" cx="0" cy="0" r="13" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f3ead0" />
            <stop offset="0.4" stopColor="#fffdf6" />
            <stop offset="1" stopColor="#f7efdf" />
          </radialGradient>
          <radialGradient id="mogra-gold" cx="-1.5" cy="-2" r="7" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ecd9a2" />
            <stop offset="0.5" stopColor="#c2a155" />
            <stop offset="1" stopColor="#8f6f2f" />
          </radialGradient>

          {/* Bud, pointing along +x from the thread. v1 has the faint pink tip
              a mogra bud carries before it opens. */}
          {[0, 1].map((v) => (
            <g key={v} id={`mogra-bud${v}`}>
              <path d={BUD} transform="translate(1.3 1.9)" fill="#7a654a" opacity="0.2" />
              <path d={BUD} fill="url(#mogra-budfill)" stroke="#d6c3a0" strokeWidth="0.7" />
              {v === 1 && <ellipse cx="19" cy="0" rx="3.4" ry="3" fill="#eec9cc" opacity="0.75" />}
              <path d="M-1.2 0L5.2 -2.8L3.6 0L5.2 2.8Z" fill="#8ea37a" />
            </g>
          ))}

          <g id="mogra-open">
            <g transform="translate(1.2 1.8)" opacity="0.16">
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <path key={a} d={OPEN_PETAL} transform={`rotate(${a})`} fill="#6f5b42" />
              ))}
            </g>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <path key={a} d={OPEN_PETAL} transform={`rotate(${a})`} fill="url(#mogra-openfill)" stroke="#d3bf9c" strokeWidth="0.6" />
            ))}
            {[30, 90, 150, 210, 270, 330].map((a) => (
              <path key={a} d={OPEN_PETAL} transform={`rotate(${a}) scale(0.58)`} fill="#fffdf7" stroke="#dccaa9" strokeWidth="0.5" />
            ))}
            <circle r="1.9" fill="#d9c47e" />
          </g>

          {ROSES.map((c, v) => (
            <g key={v} id={`mogra-rose${v}`}>
              <path d="M4 5C10 4 15 7 17 12C11 13 6 10 4 5Z" fill="#8fa77f" opacity="0.85" />
              <circle cx="1.2" cy="2" r="11.5" fill="#6b4a4c" opacity="0.16" />
              {[0, 72, 144, 216, 288].map((a) => (
                <path key={a} d={ROSE_PETAL} transform={`rotate(${a}) scale(1.05)`} fill={c.outer} stroke={c.line} strokeOpacity="0.35" strokeWidth="0.6" />
              ))}
              {[36, 126, 216, 306].map((a) => (
                <path key={a} d={ROSE_PETAL} transform={`rotate(${a}) scale(0.7)`} fill={c.mid} stroke={c.line} strokeOpacity="0.4" strokeWidth="0.6" />
              ))}
              <circle r="4.6" fill={c.inner} />
              <path d="M0.4 -3C3.4 -2.6 3.2 2.4 -0.2 2.4C-2.6 2.3 -2.6 -1.2 -0.2 -1.1C1 -1 1.1 0.6 0 0.7" fill="none" stroke={c.line} strokeWidth="0.9" strokeLinecap="round" />
            </g>
          ))}
        </defs>
      </svg>

      {/* md up: the toran across the top, scaled to the section's width. */}
      <div ref={landRef} className="absolute inset-0 hidden md:block">
        <svg aria-hidden="true" viewBox="0 0 1600 900" className="absolute inset-x-0 top-0 h-auto w-full">
          <Garland comp={LAND} tassel={1} moving={moving && wide === true} />
        </svg>
      </div>

      {/* Below md: corner swags at the top edge, the garland over the arcade. */}
      <div ref={portRef} className="absolute inset-0 md:hidden">
        <Strip className="absolute inset-x-0 top-0 h-auto w-full" />
        <svg
          aria-hidden="true"
          viewBox="0 0 400 560"
          className="absolute bottom-0 left-1/2 h-auto w-full max-w-[30rem] -translate-x-1/2"
        >
          <Garland comp={PORT} tassel={0.75} moving={moving && wide === false} />
        </svg>
      </div>
    </>
  );
}
