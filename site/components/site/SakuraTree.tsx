"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/**
 * Cherry branches drawn across the whole retail head, rather than shipped as a
 * picture: they frame the heading and the arcade, they do not sit on them.
 *
 * Why (owner, 14 Sep 2026): the retail head "looks a little plain", and she
 * asked for the sakura. 15 Sep: it first hung around the arches only, which
 * "looks odd", so it now fills the head. The page puts it in a clipped layer
 * at `-z-10` inside the isolated section, under the type and the arcade.
 *
 * Two compositions, one shown per breakpoint, each measured against the head's
 * real layout (text column, arcade, fact rail) at 360-2560px wide:
 *
 *   md up   One 1600x900 box, `xMaxYMin slice`: it always covers the section,
 *           anchored to the right edge where the branch enters, so narrower
 *           screens lose the sparse left. Across the widths the text column
 *           falls inside x 199-1157, y 189-543 of the box and the arcade inside
 *           x 805-1541, y 58-716, so the main branch runs along the top above
 *           y 170 (twigs there only grow upward), a second bough comes in low
 *           from the right edge behind the arches, and a small twig sits in
 *           the lower left, left of the buttons.
 *   phone   The text sits on top, so nothing dense can go there. Two slim
 *           pieces scaled by the section's height (which is ~1030-1135px at
 *           every phone width): a corner sprig and a bough that enters under
 *           the buttons behind the dome on the right, a twig into the gap at
 *           the arcade's top left on the left.
 *
 * Twigs and blossom are placed by a seeded generator, so the server and the
 * client draw the same branches. Each composition has its own gradient ids:
 * the hidden one is `display:none`, and a gradient referenced from inside a
 * display:none SVG paints nothing.
 *
 * Motion: each branch sways a fraction of a degree from where it enters, and a
 * few petals come loose and drift down-left, faint where they cross the type.
 * Only the composition on screen runs, and it pauses off screen. Reduced
 * motion, and the server render: still branches, no petals.
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

// Catmull-Rom through the control points, sampled evenly per segment.
function sample(pts: P[], perSeg = 10): P[] {
  const out: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, cc: number, d: number) =>
        0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// A tapered limb as one filled outline.
function limbPath(pts: P[], w0: number, w1: number) {
  const n = pts.length;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(i - 1, 0)];
    const b = pts[Math.min(i + 1, n - 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const t = i / (n - 1);
    const w = (w0 + (w1 - w0) * Math.pow(t, 0.8)) / 2;
    const nx = (-dy / len) * w;
    const ny = (dx / len) * w;
    left.push(`${f(pts[i][0] + nx)} ${f(pts[i][1] + ny)}`);
    right.push(`${f(pts[i][0] - nx)} ${f(pts[i][1] - ny)}`);
  }
  return `M${left.join("L")}L${right.reverse().join("L")}Z`;
}

type Limb = {
  pts: P[];
  w0: number;
  w1: number;
  /** Chance a twig grows at each step along the limb. */
  bloom: number;
  /** Twigs grow upward only: the limb runs just above the type. */
  up?: boolean;
  /** Longest twig. */
  reach?: number;
  /** Blossoms at the limb's tip. */
  tip?: number;
};

type Flower = { x: number; y: number; r: number; s: number; v: number; o: number };
type Bud = { x: number; y: number; r: number; s: number };
type Grown = { limbs: string[]; twigs: string[]; flowers: Flower[]; buds: Bud[] };

function grow(limbs: Limb[], seed: number): Grown {
  const rand = mulberry32(seed);
  const out: Grown = { limbs: [], twigs: [], flowers: [], buds: [] };

  const cluster = (x: number, y: number, count: number, spread: number) => {
    for (let k = 0; k < count; k++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * spread;
      out.flowers.push({
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d * 0.8,
        r: rand() * 360,
        s: 0.75 + rand() * 0.55,
        v: Math.floor(rand() * 3),
        o: rand() < 0.22 ? 0.55 : 1,
      });
    }
    if (rand() < 0.7) {
      const a = rand() * Math.PI * 2;
      out.buds.push({ x: x + Math.cos(a) * (spread + 8), y: y + Math.sin(a) * (spread + 8), r: rand() * 360, s: 0.8 + rand() * 0.4 });
    }
  };

  for (const limb of limbs) {
    const pts = sample(limb.pts, 12);
    out.limbs.push(limbPath(pts, limb.w0, limb.w1));
    const reach = limb.reach ?? 46;

    for (let i = 6; i < pts.length; i += 5) {
      if (rand() > limb.bloom) continue;
      const t = i / (pts.length - 1);
      const [x, y] = pts[i];
      const a = pts[Math.max(i - 1, 0)];
      const b = pts[Math.min(i + 1, pts.length - 1)];
      const dir = Math.atan2(b[1] - a[1], b[0] - a[0]);
      // A short twig off the limb, left or right of it, bloom at its end.
      let side = rand() < 0.5 ? -1 : 1;
      const spread = 0.5 + rand() * 0.7;
      if (limb.up && Math.sin(dir + side * spread) > 0) side = -side;
      const ang = dir + side * spread;
      const len = 22 + rand() * reach * (1 - t * 0.5);
      const sag = limb.up ? 0 : 1;
      const mid: P = [x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5 + 4 * sag];
      const end: P = [x + Math.cos(ang) * len, y + Math.sin(ang) * len + 8 * sag];
      out.twigs.push(limbPath(sample([[x, y], mid, end], 6), 3.2, 1));
      cluster(end[0], end[1], 2 + Math.floor(rand() * 3), 14);
    }
    const tip = limb.pts[limb.pts.length - 1];
    cluster(tip[0], tip[1], limb.tip ?? 3 + Math.floor(rand() * 2), 16);
  }

  return out;
}

type Group = { origin: string; turn: number; limbs: Limb[]; seed: number };
type Composition = {
  id: string;
  viewBox: string;
  preserve: string;
  className: string;
  groups: Group[];
  /** Petal travel: down, and left. */
  fall: [number, number];
  petals: number;
  /** Peak opacity of a drifting petal. */
  petalOpacity: number;
};

// ---- md up: the whole head, 1600x900 ---------------------------------------
const WIDE: Composition = {
  id: "sakura-w",
  viewBox: "0 0 1600 900",
  preserve: "xMaxYMin slice",
  className: "absolute inset-0 hidden h-full w-full md:block",
  fall: [420, 300],
  petals: 10,
  petalOpacity: 0.6,
  groups: [
    {
      // The main branch, in from the top right and along the top edge.
      origin: "1640 0",
      turn: 0.45,
      seed: 2614,
      limbs: [
        {
          pts: [[1660, -14], [1540, 38], [1420, 68], [1300, 90], [1180, 104], [1060, 116], [940, 126], [820, 138], [700, 146], [590, 146], [490, 138], [390, 122]],
          w0: 26, w1: 2.5, bloom: 0.5, up: true, tip: 3,
        },
        { pts: [[1440, 64], [1400, 20], [1340, -16]], w0: 10, w1: 2, bloom: 0.8 },
        { pts: [[1300, 90], [1288, 170], [1300, 250], [1286, 322]], w0: 11, w1: 2, bloom: 0.75, reach: 40 },
        { pts: [[1010, 120], [960, 70], [890, 40], [820, 30]], w0: 8, w1: 1.6, bloom: 0.7, up: true },
        { pts: [[1560, 32], [1590, 110], [1580, 200]], w0: 8, w1: 1.8, bloom: 0.6, reach: 32 },
      ],
    },
    {
      // The second bough, low from the right edge and in behind the arches.
      origin: "1640 560",
      turn: 0.7,
      seed: 911,
      limbs: [
        {
          pts: [[1660, 580], [1580, 530], [1500, 480], [1420, 440], [1340, 410], [1250, 396]],
          w0: 18, w1: 2, bloom: 0.55,
        },
        { pts: [[1500, 480], [1522, 560], [1530, 630], [1514, 690]], w0: 8, w1: 1.6, bloom: 0.45, reach: 30 },
        { pts: [[1580, 530], [1560, 450], [1574, 370], [1556, 300]], w0: 8, w1: 1.6, bloom: 0.4, reach: 30 },
      ],
    },
    {
      // A small twig in the lower left, left of the buttons.
      origin: "-40 660",
      turn: 1,
      seed: 3301,
      limbs: [
        { pts: [[-40, 664], [30, 636], [90, 598], [138, 552]], w0: 13, w1: 2, bloom: 0.8, up: true, reach: 26, tip: 3 },
      ],
    },
  ],
};

// ---- phone: two slim pieces on the edges, scaled by the section's height ---
const PHONE_RIGHT: Composition = {
  id: "sakura-pr",
  viewBox: "0 0 260 1100",
  preserve: "xMaxYMin meet",
  className: "absolute right-0 top-0 h-full w-auto aspect-[260/1100] md:hidden",
  fall: [300, 120],
  petals: 5,
  petalOpacity: 0.6,
  groups: [
    {
      // A sprig in the top right corner, above the heading.
      origin: "280 0",
      turn: 0.8,
      seed: 4410,
      limbs: [
        { pts: [[290, -18], [236, 16], [180, 34], [128, 42]], w0: 12, w1: 2, bloom: 0.8, up: true, reach: 28, tip: 3 },
      ],
    },
    {
      // A bough in under the buttons, behind the doorway's dome, then down
      // the gutter beside the arches.
      origin: "280 400",
      turn: 0.9,
      seed: 5120,
      limbs: [
        { pts: [[290, 392], [226, 402], [168, 424], [120, 458], [86, 500]], w0: 15, w1: 2, bloom: 0.75, reach: 34 },
        { pts: [[240, 400], [250, 490], [244, 580], [252, 670]], w0: 7, w1: 1.6, bloom: 0.7, reach: 26 },
      ],
    },
  ],
};

const PHONE_LEFT: Composition = {
  id: "sakura-pl",
  viewBox: "0 0 160 1100",
  preserve: "xMinYMin meet",
  className: "absolute left-0 top-0 h-full w-auto aspect-[160/1100] md:hidden",
  fall: [260, -60],
  petals: 3,
  petalOpacity: 0.6,
  groups: [
    {
      // A twig into the gap at the arcade's top left.
      origin: "-30 450",
      turn: 1,
      seed: 6021,
      limbs: [
        { pts: [[-30, 460], [18, 440], [62, 422], [100, 400]], w0: 10, w1: 2, bloom: 0.8, up: true, reach: 22, tip: 3 },
      ],
    },
  ],
};

const PETAL =
  "M0 0C-6 -3 -9 -11 -6.5 -16Q-4.5 -18.5 -2 -17.2L0 -15.2L2 -17.2Q4.5 -18.5 6.5 -16C9 -11 6 -3 0 0Z";

const GRADS = [
  ["#e7a2b4", "#fcebf0"],
  ["#d9859c", "#f5d2dc"],
  ["#efbccb", "#fff5f7"],
];

// Grown once per composition, not per render.
const DRAWN = new Map<string, { grown: Grown[]; drifters: Flower[] }>();
function drawn(c: Composition) {
  let d = DRAWN.get(c.id);
  if (!d) {
    const grown = c.groups.map((g) => grow(g.limbs, g.seed));
    // Where petals come loose: a spread of the blossom, not all of it.
    const drifters = grown.flatMap((g) => g.flowers).filter((_, k) => k % 7 === 3).slice(0, c.petals);
    d = { grown, drifters };
    DRAWN.set(c.id, d);
  }
  return d;
}

function Branches({ c, active }: { c: Composition; active: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { grown, drifters } = drawn(c);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !active) return;

    const anims: gsap.core.Animation[] = [];
    const ctx = gsap.context(() => {
      c.groups.forEach((g, k) => {
        anims.push(
          gsap.to(`[data-sway="${k}"]`, {
            rotation: k % 2 ? -g.turn : g.turn,
            svgOrigin: g.origin,
            duration: 5.5 + k * 0.9,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          })
        );
      });

      gsap.utils.toArray<SVGGElement>("[data-petal]").forEach((el, k) => {
        const dur = 11 + (k % 3) * 2;
        const tl = gsap.timeline({ repeat: -1, delay: k * 1.7, repeatDelay: 1.5 + (k % 3) });
        tl.set(el, { x: 0, y: 0, rotation: 0, opacity: 0 })
          .to(el, { opacity: c.petalOpacity, duration: 1.2, ease: "power1.out" })
          .to(el, { y: c.fall[0] + (k % 4) * 50, duration: dur, ease: "none" }, 0)
          .to(el, { x: -c.fall[1] - (k % 5) * 30, duration: dur, ease: "sine.inOut" }, 0)
          .to(el, { rotation: (k % 2 ? 1 : -1) * 320, duration: dur, ease: "none" }, 0)
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
  }, [active, c]);

  return (
    <svg ref={svgRef} viewBox={c.viewBox} preserveAspectRatio={c.preserve} className={c.className}>
      <defs>
        {GRADS.map(([a, e], k) => (
          <radialGradient key={k} id={`${c.id}-g${k}`} cx="0" cy="0" r="18" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={a} />
            <stop offset="0.35" stopColor={a} />
            <stop offset="1" stopColor={e} />
          </radialGradient>
        ))}
        {GRADS.map((_, k) => (
          <g key={k} id={`${c.id}-f${k}`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <path
                key={a}
                d={PETAL}
                transform={`rotate(${a})`}
                fill={`url(#${c.id}-g${k})`}
                stroke="#dc93a8"
                strokeOpacity="0.55"
                strokeWidth="0.6"
              />
            ))}
            <circle r="3.4" fill="#c9667f" opacity="0.8" />
            {[0, 51, 103, 154, 206, 257, 309].map((a) => (
              <circle
                key={a}
                cx={f(Math.cos((a * Math.PI) / 180) * 6)}
                cy={f(Math.sin((a * Math.PI) / 180) * 6)}
                r="0.95"
                fill="#b89046"
              />
            ))}
          </g>
        ))}
      </defs>

      {grown.map((g, k) => (
        <g key={k} data-sway={k}>
          <g fill="#3a2a38">
            {g.limbs.map((d, j) => (
              <path key={j} d={d} />
            ))}
            {g.twigs.map((d, j) => (
              <path key={`t${j}`} d={d} />
            ))}
          </g>

          {g.buds.map((b, j) => (
            <g key={`b${j}`} transform={`translate(${f(b.x)} ${f(b.y)}) rotate(${f(b.r)}) scale(${f(b.s)})`}>
              <ellipse cy="-4" rx="4" ry="6" fill="#d77a93" />
              <path d="M-3.5 0Q0 -3 3.5 0Q0 3 -3.5 0Z" fill="#5e3f4c" />
            </g>
          ))}

          {g.flowers.map((fl, j) => (
            <use
              key={`f${j}`}
              href={`#${c.id}-f${fl.v}`}
              opacity={fl.o}
              transform={`translate(${f(fl.x)} ${f(fl.y)}) rotate(${f(fl.r)}) scale(${f(fl.s)})`}
            />
          ))}
        </g>
      ))}

      {active &&
        drifters.map((d, k) => (
          <g key={`p${k}`} transform={`translate(${f(d.x)} ${f(d.y)})`}>
            <g data-petal="" opacity="0">
              <path d={PETAL} transform="scale(0.8)" fill={`url(#${c.id}-g2)`} stroke="#dc93a8" strokeOpacity="0.5" strokeWidth="0.6" />
            </g>
          </g>
        ))}
    </svg>
  );
}

export function SakuraTree() {
  // null on the server and until the client has checked motion and width, so
  // the first render is the still drawing everywhere.
  const [wide, setWide] = useState<boolean | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <>
      <Branches c={WIDE} active={wide === true} />
      <Branches c={PHONE_RIGHT} active={wide === false} />
      <Branches c={PHONE_LEFT} active={wide === false} />
    </>
  );
}
