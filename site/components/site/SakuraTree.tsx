"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/**
 * A cherry branch, drawn here rather than shipped as a picture: it reaches in
 * from the right, over the arcade's domes, and hangs its blossom into the paper
 * between the arches and the heading.
 *
 * Why (owner, 14 Sep 2026): the retail head "looks a little plain", and she
 * asked for the sakura. It sits behind everything (the parent must be an
 * isolated stacking context; this layer is `-z-10`), so it can never lie over
 * the heading or the buttons.
 *
 * The geometry is authored limbs in a 1100x1000 box, with twigs and blossom
 * placed by a seeded generator, so the server and the client draw the same
 * branch. The box is laid out against the arcade: the arcade occupies
 * x 300-800, y 110-681 of it, which is why the parent positions it at
 * -60% / -19.26% at 220% of the arcade's width.
 *
 * Motion: the branch sways a fraction of a degree from where it enters, and a
 * few petals come loose and drift down-left. Both pause off screen. Reduced
 * motion, and the server render: the still branch, no petals.
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

type Limb = { pts: P[]; w0: number; w1: number; bloom: number };

// Authored in the arcade's frame (see the header). The main limb crosses just
// above both domes; the others hang off it.
const LIMBS: Limb[] = [
  {
    pts: [[1180, 28], [1060, 62], [930, 92], [800, 118], [660, 146], [540, 160], [430, 184], [330, 212], [240, 246], [175, 282]],
    w0: 30, w1: 3, bloom: 0.55,
  },
  { pts: [[985, 80], [950, 150], [930, 235], [938, 320], [922, 400]], w0: 12, w1: 2, bloom: 0.7 },
  { pts: [[720, 134], [668, 96], [606, 70], [530, 58], [470, 62]], w0: 9, w1: 1.6, bloom: 0.8 },
  { pts: [[440, 182], [400, 228], [352, 262], [292, 292]], w0: 7, w1: 1.5, bloom: 0.8 },
  { pts: [[1090, 56], [1070, 12], [1030, -10]], w0: 8, w1: 2, bloom: 0.6 },
];

type Flower = { x: number; y: number; r: number; s: number; v: number; o: number };
type Bud = { x: number; y: number; r: number; s: number };

function grow() {
  const rand = mulberry32(2614);
  const limbs: string[] = [];
  const twigs: string[] = [];
  const flowers: Flower[] = [];
  const buds: Bud[] = [];

  const cluster = (x: number, y: number, count: number, spread: number) => {
    for (let k = 0; k < count; k++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * spread;
      flowers.push({
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
      buds.push({ x: x + Math.cos(a) * (spread + 8), y: y + Math.sin(a) * (spread + 8), r: rand() * 360, s: 0.8 + rand() * 0.4 });
    }
  };

  for (const limb of LIMBS) {
    const pts = sample(limb.pts, 12);
    limbs.push(limbPath(pts, limb.w0, limb.w1));

    for (let i = 6; i < pts.length; i += 5) {
      if (rand() > limb.bloom) continue;
      const t = i / (pts.length - 1);
      const [x, y] = pts[i];
      const a = pts[Math.max(i - 1, 0)];
      const b = pts[Math.min(i + 1, pts.length - 1)];
      const dir = Math.atan2(b[1] - a[1], b[0] - a[0]);
      // A short twig off the limb, left or right of it, bloom at its end.
      const side = rand() < 0.5 ? -1 : 1;
      const ang = dir + side * (0.5 + rand() * 0.7);
      const len = 22 + rand() * 46 * (1 - t * 0.5);
      const mid: P = [x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5 + 4];
      const end: P = [x + Math.cos(ang) * len, y + Math.sin(ang) * len + 8];
      twigs.push(limbPath(sample([[x, y], mid, end], 6), 3.2, 1));
      cluster(end[0], end[1], 2 + Math.floor(rand() * 3), 14);
    }
    const tip = limb.pts[limb.pts.length - 1];
    cluster(tip[0], tip[1], 3 + Math.floor(rand() * 2), 16);
  }

  return { limbs, twigs, flowers, buds };
}

const TREE = grow();

// Where petals come loose: a spread of the blossom, not all of it.
const DRIFTERS = TREE.flowers.filter((_, k) => k % 9 === 4).slice(0, 8);

const PETAL =
  "M0 0C-6 -3 -9 -11 -6.5 -16Q-4.5 -18.5 -2 -17.2L0 -15.2L2 -17.2Q4.5 -18.5 6.5 -16C9 -11 6 -3 0 0Z";

const GRADS = [
  ["#e7a2b4", "#fcebf0"],
  ["#d9859c", "#f5d2dc"],
  ["#efbccb", "#fff5f7"],
];

export function SakuraTree({ className = "" }: { className?: string }) {
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
      anims.push(gsap.to("[data-sway]", {
        rotation: 0.8,
        svgOrigin: "1100 40",
        duration: 5.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      }));

      gsap.utils.toArray<SVGGElement>("[data-petal]").forEach((el, k) => {
        const tl = gsap.timeline({ repeat: -1, delay: k * 1.7, repeatDelay: 1.5 + (k % 3) });
        tl.set(el, { x: 0, y: 0, rotation: 0, opacity: 0 })
          .to(el, { opacity: 0.9, duration: 1.2, ease: "power1.out" })
          .to(el, { y: 380 + (k % 4) * 60, duration: 11 + (k % 3) * 2, ease: "none" }, 0)
          .to(el, { x: -160 - (k % 5) * 40, duration: 11 + (k % 3) * 2, ease: "sine.inOut" }, 0)
          .to(el, { rotation: (k % 2 ? 1 : -1) * 320, duration: 11 + (k % 3) * 2, ease: "none" }, 0)
          .to(el, { opacity: 0, duration: 2.5, ease: "power1.in" }, 8 + (k % 3) * 2);
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

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      viewBox="0 0 1100 1000"
      className={`pointer-events-none ${className}`}
    >
      <defs>
        {GRADS.map(([c, e], k) => (
          <radialGradient key={k} id={`sakura-g${k}`} cx="0" cy="0" r="18" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={c} />
            <stop offset="0.35" stopColor={c} />
            <stop offset="1" stopColor={e} />
          </radialGradient>
        ))}
        {GRADS.map((_, k) => (
          <g key={k} id={`sakura-f${k}`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <path
                key={a}
                d={PETAL}
                transform={`rotate(${a})`}
                fill={`url(#sakura-g${k})`}
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

      <g data-sway="">
        <g fill="#3a2a38">
          {TREE.limbs.map((d, k) => (
            <path key={k} d={d} />
          ))}
          {TREE.twigs.map((d, k) => (
            <path key={`t${k}`} d={d} />
          ))}
        </g>

        {TREE.buds.map((b, k) => (
          <g key={`b${k}`} transform={`translate(${f(b.x)} ${f(b.y)}) rotate(${f(b.r)}) scale(${f(b.s)})`}>
            <ellipse cy="-4" rx="4" ry="6" fill="#d77a93" />
            <path d="M-3.5 0Q0 -3 3.5 0Q0 3 -3.5 0Z" fill="#5e3f4c" />
          </g>
        ))}

        {TREE.flowers.map((fl, k) => (
          <use
            key={`f${k}`}
            href={`#sakura-f${fl.v}`}
            opacity={fl.o}
            transform={`translate(${f(fl.x)} ${f(fl.y)}) rotate(${f(fl.r)}) scale(${f(fl.s)})`}
          />
        ))}
      </g>

      {moving &&
        DRIFTERS.map((d, k) => (
          <g key={`p${k}`} transform={`translate(${f(d.x)} ${f(d.y)})`}>
            <g data-petal="" opacity="0">
              <path d={PETAL} transform="scale(0.8)" fill="url(#sakura-g2)" stroke="#dc93a8" strokeOpacity="0.5" strokeWidth="0.6" />
            </g>
          </g>
        ))}
    </svg>
  );
}
