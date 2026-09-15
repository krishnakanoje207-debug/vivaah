"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/**
 * A garland of mogra buds and small roses, strung above the rentals arcade like
 * a toran over a doorway: the flowers of a wedding day, drawn rather than
 * shipped as a picture.
 *
 * Why (owner, 15 Sep 2026): the rentals head was remade in the retail and
 * jewellery layout, and it asked for "a nice background as you did with retail
 * section". The owner chose the mogra and rose garland.
 *
 * Same contract as SakuraTree: it sits behind everything (the parent must be an
 * isolated stacking context; this layer is `-z-10`), in a 1100x1000 box laid
 * out against the arcade, which occupies x 300-800, y 110-681 of it. Placed
 * with `left-[-60%] top-[-19.26%] w-[220%]`.
 *
 * Composition: one swag enters from the right edge and dips beside the
 * doorway, rises to a knot of roses above the dome, and a second swag dips over
 * the photograph plate and ends in a tassel left of it. Two pendant strands
 * hang from the swags, one each side, each finished with a rose and a gold
 * bead. The swags stay above the domes so the planes never hide the flowers.
 *
 * The buds are ivory on the light stage ground, so each carries a warm edge and
 * a soft offset shadow; otherwise white on #ecebe7 would simply vanish.
 *
 * Motion: the garland breathes a fraction of a degree about its knot and the
 * pendants swing about where they hang, on different phases; a few petals come
 * loose and drift down. Both pause off screen. Reduced motion, and the server
 * render: the still garland, no petals.
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
// zero at both ends, `sag` below the chord at the middle).
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
    const x = top[0] + lean * t * t;
    out.push([x, top[1] + length * t]);
  }
  return out;
}

function pathOf(pts: P[]) {
  return `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join("L")}`;
}

type Item = { kind: "bud" | "open" | "rose"; x: number; y: number; r: number; s: number; v: number };

// Walks a polyline at even arc-length steps and strings flowers along it.
function string(pts: P[], rand: () => number, items: Item[], opts: { step: number; roseEvery: number; phase: number }) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = cum[cum.length - 1];
  let j = 0;
  let side = 1;
  let sinceRose = opts.phase;
  for (let d = opts.step * 0.5; d < total; d += opts.step) {
    while (j < cum.length - 2 && cum[j + 1] < d) j++;
    const t = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
    const x = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t;
    const y = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t;
    const tan = (Math.atan2(pts[j + 1][1] - pts[j][1], pts[j + 1][0] - pts[j][0]) * 180) / Math.PI;

    sinceRose += opts.step;
    if (sinceRose >= opts.roseEvery) {
      sinceRose = 0;
      items.push({ kind: "rose", x, y, r: rand() * 360, s: 0.85 + rand() * 0.3, v: Math.floor(rand() * 3) });
      continue;
    }
    if (rand() < 0.17) {
      items.push({ kind: "open", x: x + (rand() - 0.5) * 6, y: y + (rand() - 0.5) * 6, r: rand() * 60, s: 0.8 + rand() * 0.35, v: 0 });
      continue;
    }
    // Buds lie close along the thread, as they are strung in a gajra: each
    // points forward or back and a little out to one side, alternating, and
    // they overlap. Splayed square to the thread they read as a fern.
    side = -side;
    const back = rand() < 0.45 ? 180 : 0;
    const out = side * (18 + rand() * 30) * (back ? -1 : 1);
    const r = tan + back + out;
    const nx = -Math.sin((tan * Math.PI) / 180) * side * 2.2;
    const ny = Math.cos((tan * Math.PI) / 180) * side * 2.2;
    items.push({ kind: "bud", x: x + nx, y: y + ny, r, s: 0.8 + rand() * 0.35, v: rand() < 0.28 ? 1 : 0 });
  }
}

// Authored in the arcade's frame (see the header).
const KNOT: P = [640, 58];
const SWAG_RIGHT = swag([1170, 18], KNOT, 150);
const SWAG_LEFT = swag(KNOT, [226, 76], 92);
const PENDANT_RIGHT_TOP = SWAG_RIGHT[70]; // hangs from the right swag's dip
const PENDANT_RIGHT = pendant(PENDANT_RIGHT_TOP, 250, -8);
const PENDANT_LEFT_TOP: P = [226, 76];
const PENDANT_LEFT = pendant(PENDANT_LEFT_TOP, 205, 6);

function grow() {
  const rand = mulberry32(1507);
  const swagItems: Item[] = [];
  string(SWAG_RIGHT, rand, swagItems, { step: 5.4, roseEvery: 96, phase: 30 });
  string(SWAG_LEFT, rand, swagItems, { step: 5.4, roseEvery: 88, phase: 44 });
  const right: Item[] = [];
  string(PENDANT_RIGHT, rand, right, { step: 5.8, roseEvery: 110, phase: 20 });
  const left: Item[] = [];
  string(PENDANT_LEFT, rand, left, { step: 5.8, roseEvery: 104, phase: 60 });
  // Buds first, roses last, so a rose always sits on top of the buds around it.
  const order = (a: Item, b: Item) => (a.kind === "rose" ? 1 : 0) - (b.kind === "rose" ? 1 : 0);
  return { swagItems: swagItems.sort(order), right: right.sort(order), left: left.sort(order) };
}

const G = grow();

// Where petals come loose: a spread along both swags, not all of it.
const DRIFTERS = G.swagItems.filter((it, k) => it.kind !== "open" && k % 23 === 7).slice(0, 8);

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

function Tassel({ at }: { at: P }) {
  return (
    <g transform={`translate(${f(at[0])} ${f(at[1])})`}>
      <path d="M-3.5 6L-6 30M-1.8 6L-3 32M0 6L0 33M1.8 6L3 32M3.5 6L6 30" stroke="#b08a3e" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M-4 5.5H4L3 9H-3Z" fill="#a9853a" />
      <circle r="5.4" fill="url(#mogra-gold)" stroke="#8f6f2f" strokeWidth="0.5" />
    </g>
  );
}

export function MograGarland({ className = "" }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setMoving(true);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !moving) return;

    const anims: gsap.core.Animation[] = [];
    const ctx = gsap.context(() => {
      // The whole garland breathes about its knot above the dome.
      anims.push(
        gsap.to("[data-garland]", {
          rotation: 0.35,
          svgOrigin: `${KNOT[0]} ${KNOT[1]}`,
          duration: 6.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        })
      );
      // Each pendant swings about where it hangs, out of phase with the other.
      gsap.utils.toArray<SVGGElement>("[data-pendant]").forEach((el, k) => {
        gsap.set(el, { rotation: k ? 1.1 : -1.1, svgOrigin: el.dataset.origin });
        anims.push(
          gsap.to(el, {
            rotation: k ? -1.1 : 1.1,
            svgOrigin: el.dataset.origin,
            duration: 4.2 + k * 0.9,
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
          .to(el, { y: 360 + (k % 4) * 55, duration: dur, ease: "none" }, 0)
          .to(el, { x: (k % 2 ? 1 : -1) * (90 + (k % 5) * 30), duration: dur, ease: "sine.inOut" }, 0)
          .to(el, { rotation: (k % 2 ? -1 : 1) * 300, duration: dur, ease: "none" }, 0)
          .to(el, { opacity: 0, duration: 2.5, ease: "power1.in" }, dur - 3);
        anims.push(tl);
      });
    }, svg);

    const io = new IntersectionObserver(([e]) => {
      anims.forEach((a) => (e.isIntersecting ? a.resume() : a.pause()));
    });
    io.observe(svg);

    return () => {
      io.disconnect();
      ctx.revert();
    };
  }, [moving]);

  const rightEnd = PENDANT_RIGHT[PENDANT_RIGHT.length - 1];
  const leftEnd = PENDANT_LEFT[PENDANT_LEFT.length - 1];

  return (
    <svg ref={svgRef} aria-hidden="true" viewBox="0 0 1100 1000" className={`pointer-events-none ${className}`}>
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

      <g data-garland="">
        {/* The thread, mostly hidden under the flowers. */}
        <g fill="none" stroke="#b39561" strokeWidth="1.3" strokeLinecap="round">
          <path d={pathOf(SWAG_RIGHT)} />
          <path d={pathOf(SWAG_LEFT)} />
        </g>

        <g data-pendant="" data-origin={`${f(PENDANT_RIGHT_TOP[0])} ${f(PENDANT_RIGHT_TOP[1])}`}>
          <path d={pathOf(PENDANT_RIGHT)} fill="none" stroke="#b39561" strokeWidth="1.2" />
          <Items items={G.right} />
          <Tassel at={rightEnd} />
        </g>
        <g data-pendant="" data-origin={`${f(PENDANT_LEFT_TOP[0])} ${f(PENDANT_LEFT_TOP[1])}`}>
          <path d={pathOf(PENDANT_LEFT)} fill="none" stroke="#b39561" strokeWidth="1.2" />
          <Items items={G.left} />
          <Tassel at={leftEnd} />
        </g>

        <Items items={G.swagItems} />

        {/* The knot above the dome: three roses and a gold bead. */}
        <g transform={`translate(${KNOT[0]} ${KNOT[1]})`}>
          <use href="#mogra-rose2" transform="translate(-13 4) rotate(20) scale(1.15)" />
          <use href="#mogra-rose0" transform="translate(13 3) rotate(-40) scale(1.1)" />
          <use href="#mogra-rose1" transform="translate(0 -8) rotate(80) scale(1.25)" />
          <circle cy="13" r="4.6" fill="url(#mogra-gold)" stroke="#8f6f2f" strokeWidth="0.5" />
        </g>
      </g>

      {moving &&
        DRIFTERS.map((d, k) => (
          <g key={`p${k}`} transform={`translate(${f(d.x)} ${f(d.y)})`}>
            <g data-petal="" opacity="0">
              {d.kind === "rose" ? (
                <path d={ROSE_PETAL} transform="scale(0.9)" fill={ROSES[d.v].outer} stroke={ROSES[d.v].line} strokeOpacity="0.4" strokeWidth="0.6" />
              ) : (
                <path d={JASMINE_PETAL} fill="#fffdf6" stroke="#cdb893" strokeWidth="0.7" />
              )}
            </g>
          </g>
        ))}
    </svg>
  );
}
