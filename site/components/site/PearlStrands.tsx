"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { gsap } from "gsap";

/**
 * Strings of pearls hung across the jewellery head, the way a jhoomar hangs
 * from a ceiling: drawn here rather than shipped as a picture, like the retail
 * page's SakuraTree.
 *
 * Why (owner, 15 Sep 2026): of the three motifs offered for the jewellery head
 * she chose pearl strands; the same day she asked for the drawing to fill the
 * whole head rather than sit around the arches ("it looks odd as it is now").
 * So it is the head's own layer now, `absolute inset-0 -z-10` inside the
 * isolated section, under the type column and the arcade.
 *
 * Two compositions, one shown per breakpoint:
 *
 * Landscape (md up), 1600x900, `xMidYMin slice`. A pearl rope swags across the
 * top between gold rosettes, and every strand hangs from it, so the curtain
 * visibly hangs from something. Measured against the head at 1280x720 through
 * 2560x1440 and at 768/1024 portrait tablets, the type column falls inside
 * x 149-789, y 320-640 of this box and the arcade inside x 758-1451,
 * y 174-779. So the strands over the type are a short fringe ending by y 262,
 * leaving the heading and buttons in a clearing; the long strands hang at the
 * left edge, around and behind the arches, and off the right edge. The
 * rosettes sit at y 112, which is 90px or more below the section top at every
 * scale (the nav bar is 64px), so nothing runs behind the nav. The box is no
 * taller than 90vw: on a portrait tablet the section's height would otherwise
 * set the scale and blow the pearls up to twice their size. Ends behind the
 * arches were checked against each plate at every size above, so a strand
 * behind a plate ends above that plate's foot.
 *
 * Portrait (below md), 400x900, `xMidYMax slice`, capped at 30rem wide and
 * centred. On a phone the type is at the top and the arcade at the bottom, so
 * the composition is anchored to the bottom: the rope swags along the arcade's
 * top edge (below the buttons at every measured width from 360 to 767) and the
 * strands hang down the two side gutters beside the arches. The cap keeps the
 * box's scale close to a phone's between 500 and 767 wide, where an uncapped
 * box would push the rope up behind the eyebrow.
 *
 * Pearls and beads are placed by a seeded generator, so the server and the
 * client draw the same strands. Every other strand is set back: smaller and
 * dimmer, which is what gives the curtain depth.
 *
 * Motion: each strand swings a fraction of a degree from where it hangs, out
 * of phase with its neighbours, and a few drops outside the arches catch the
 * light now and then. Only the composition on screen moves, and it pauses off
 * screen. Reduced motion, and the server render: still, no glint.
 */

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

type Spec = {
  w: number;
  h: number;
  hookY: number;
  /** Rosettes the rope hangs between, left to right (may sit off the box). */
  hooks: number[];
  dip: number;
  /** [x, end y, set back, glints]. An end of 0 is the fringe: its length
      follows the rope, longest at the bottom of each swag. */
  strands: [number, number, boolean, boolean?][];
  seed: number;
};

const LANDSCAPE: Spec = {
  w: 1600,
  h: 900,
  hookY: 112,
  hooks: [-40, 250, 540, 830, 1120, 1410, 1680],
  dip: 44,
  seed: 9024,
  strands: [
    // Left edge, beside the type.
    [22, 560, false, true], [64, 700, true], [106, 640, false, true],
    // Over the type: a short fringe, so the heading sits in a clearing.
    [186, 0, true], [244, 0, false], [312, 0, true], [372, 0, false],
    [446, 0, true], [506, 0, false], [568, 0, true], [640, 0, false],
    [698, 0, true], [762, 0, false],
    // Around and behind the arches. Every end was checked against the plates at
    // 1280, 1440, 1920 and 2560 (and the 768/1024 tablets): a strand behind a
    // plate ends above that plate's foot, so none pokes out between them.
    [822, 430, true], [882, 560, false, true], [944, 330, true], [1004, 640, false],
    [1064, 470, true], [1124, 620, false], [1184, 400, true], [1244, 620, false],
    [1304, 720, true], [1364, 520, false, true], [1424, 660, true],
    // Off the right edge.
    [1484, 690, false, true], [1532, 820, true], [1576, 600, false, true],
  ],
};

const PORTRAIT: Spec = {
  w: 400,
  h: 900,
  hookY: 470,
  // Past both edges: where the box is narrower than the head (500-767 wide,
  // see the cap) the rope runs on to the section's edges instead of stopping.
  hooks: [-190, -30, 130, 290, 430, 590],
  dip: 26,
  seed: 4417,
  strands: [
    // Left gutter.
    [10, 790, false, true], [24, 650, true],
    // A short drop at the rosette above the plate, where the arch leaves room.
    [130, 500, false],
    // Right gutter.
    [376, 700, true], [390, 810, false, true],
  ],
};

type Pearl = { y: number; r: number };
type Strand = {
  x: number;
  top: number;
  end: number;
  far: boolean;
  pearls: Pearl[];
  beads: number[];
  drop: "tear" | "pearl";
  glint: boolean;
};
type Built = {
  rope: { x: number; y: number; r: number }[];
  ropeBeads: { x: number; y: number }[];
  ropePath: string;
  hooks: { x: number; y: number }[];
  strands: Strand[];
};

function build(spec: Spec): Built {
  const rand = mulberry32(spec.seed);
  const K = 1.3;
  const C = Math.cosh(K);
  const ropeY = (x: number) => {
    const hs = spec.hooks;
    let i = 0;
    while (i < hs.length - 2 && x > hs[i + 1]) i++;
    const t = Math.min(1, Math.max(0, (x - hs[i]) / (hs[i + 1] - hs[i])));
    return spec.hookY + (spec.dip * (Math.cosh(K * (2 * t - 1)) - C)) / (1 - C);
  };

  // The rope: small pearls at even arc-length steps, a gold bead every tenth.
  const rope: Built["rope"] = [];
  const ropeBeads: Built["ropeBeads"] = [];
  const pts: string[] = [];
  const x0 = spec.hooks[0];
  const x1 = spec.hooks[spec.hooks.length - 1];
  let px = x0;
  let py = ropeY(x0);
  let acc = 0;
  let n = 0;
  const STEP = 5.4;
  for (let x = x0; x <= x1; x += 1) {
    const y = ropeY(x);
    acc += Math.hypot(x - px, y - py);
    px = x;
    py = y;
    if (x % 8 === 0) pts.push(`${f(x)} ${f(y)}`);
    if (acc >= STEP) {
      acc = 0;
      n++;
      if (n % 10 === 0) ropeBeads.push({ x, y });
      else rope.push({ x, y, r: 2.2 + rand() * 0.25 });
    }
  }

  const profile = (x: number) => (ropeY(x) - spec.hookY) / spec.dip;
  const strands = spec.strands.map(([ax, given, far, glint], k) => {
    const scale = far ? 0.78 : 1;
    const top = ropeY(ax) + 2;
    const end = given || ropeY(ax) + 68 + 38 * profile(ax);
    const pearls: Pearl[] = [];
    const beads: number[] = [];
    // Grouped strands: runs of three to five pearls with a gold bead on bare
    // thread between. Continuous strands: smaller pearls end to end, a bead
    // every seven.
    const grouped = k % 3 !== 2;
    let y = top + 4;
    let run = 0;
    let runLen = 3 + Math.floor(rand() * 3);
    while (y < end - 18) {
      const r = (grouped ? 4.6 : 3.4) * scale * (0.92 + rand() * 0.16);
      if (grouped && run === runLen) {
        const gap = 18 * scale;
        beads.push(y + gap / 2);
        y += gap;
        run = 0;
        runLen = 3 + Math.floor(rand() * 3);
        continue;
      }
      if (!grouped && run === 7) {
        beads.push(y + 3 * scale);
        y += 6 * scale;
        run = 0;
        continue;
      }
      pearls.push({ y: y + r, r });
      y += r * 2 + 0.9;
      run++;
    }
    return {
      x: ax,
      top,
      end: Math.max(y, top + 6),
      far,
      pearls,
      beads,
      drop: (k % 4 === 0 || k % 4 === 3 ? "tear" : "pearl") as Strand["drop"],
      glint: !!glint && !far,
    };
  });

  return {
    rope,
    ropeBeads,
    ropePath: `M${pts.join("L")}`,
    hooks: spec.hooks.map((x) => ({ x, y: spec.hookY })),
    strands,
  };
}

const WIDE = build(LANDSCAPE);
const TALL = build(PORTRAIT);

// A teardrop hanging from its top point, 26 units long.
const TEAR = "M0 0C5.5 6 9.5 13 9.5 18.5A9.5 9.5 0 0 1 -9.5 18.5C-9.5 13 -5.5 6 0 0Z";
const GLINT = "M0 -7L1.3 -1.3L7 0L1.3 1.3L0 7L-1.3 1.3L-7 0L-1.3 -1.3Z";

function useMotion(ref: RefObject<SVGSVGElement | null>, data: Built, on: boolean) {
  useEffect(() => {
    const svg = ref.current;
    if (!svg || !on) return;

    const anims: gsap.core.Animation[] = [];
    const ctx = gsap.context(() => {
      gsap.utils.toArray<SVGGElement>("[data-strand]").forEach((el, k) => {
        const s = data.strands[k];
        const amp = (s.far ? 0.45 : 0.75) + (k % 3) * 0.12;
        const duration = 4.8 + (k % 5) * 0.7;
        const origin = `${f(s.x)} ${f(s.top)}`;
        gsap.set(el, { rotation: -amp, svgOrigin: origin });
        const swing = gsap.to(el, {
          rotation: amp,
          svgOrigin: origin,
          duration,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
        // Out of phase with its neighbours from the first frame.
        swing.totalTime((k * 1.37) % (duration * 2));
        anims.push(swing);
      });

      gsap.utils.toArray<SVGGElement>("[data-glint]").forEach((el, k) => {
        const tl = gsap.timeline({ repeat: -1, delay: 2 + k * 3.1, repeatDelay: 7 + (k % 3) * 2.5 });
        tl.set(el, { opacity: 0, scale: 0.2, transformOrigin: "50% 50%" })
          .to(el, { opacity: 0.95, scale: 1, rotation: 45, duration: 0.45, ease: "power2.out" })
          .to(el, { opacity: 0, scale: 0.4, rotation: 90, duration: 0.7, ease: "power2.in" });
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
  }, [ref, data, on]);
}

function Curtain({
  data,
  spec,
  id,
  moving,
  svgRef,
  className,
  preserve,
}: {
  data: Built;
  spec: Spec;
  id: string;
  moving: boolean;
  svgRef: RefObject<SVGSVGElement | null>;
  className: string;
  preserve: string;
}) {
  // Ids are per composition: the hidden one is display:none, and a gradient
  // referenced from inside a display:none svg does not paint.
  const sheen = `url(#${id}-sheen)`;
  const gold = `url(#${id}-gold)`;
  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      viewBox={`0 0 ${spec.w} ${spec.h}`}
      preserveAspectRatio={preserve}
      className={className}
    >
      <defs>
        <radialGradient id={`${id}-sheen`} cx="0.36" cy="0.32" r="0.78">
          <stop offset="0" stopColor="#fffdf6" />
          <stop offset="0.42" stopColor="#ece5d4" />
          <stop offset="1" stopColor="#a89c86" />
        </radialGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6cd8a" />
          <stop offset="0.5" stopColor="#c2a155" />
          <stop offset="1" stopColor="#7f6127" />
        </linearGradient>
      </defs>

      {STRANDS_OF(data, sheen, gold, moving)}

      {/* The rope in front of the strands' tops, so each strand hangs from it. */}
      <g opacity="0.72">
        <path d={data.ropePath} fill="none" stroke="#c2a155" strokeOpacity="0.4" strokeWidth="0.8" />
        {data.rope.map((p, k) => (
          <circle key={k} cx={f(p.x)} cy={f(p.y)} r={f(p.r)} fill={sheen} />
        ))}
        {data.ropeBeads.map((b, k) => (
          <circle key={`b${k}`} cx={f(b.x)} cy={f(b.y)} r="1.9" fill={gold} />
        ))}
        {data.hooks.map((h, k) => (
          <g key={`h${k}`} transform={`translate(${f(h.x)} ${f(h.y)})`}>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <circle
                key={a}
                cx={f(Math.cos((a * Math.PI) / 180) * 4.6)}
                cy={f(Math.sin((a * Math.PI) / 180) * 4.6)}
                r="2"
                fill={sheen}
              />
            ))}
            <circle r="3.2" fill={gold} />
          </g>
        ))}
      </g>
    </svg>
  );
}

function STRANDS_OF(data: Built, sheen: string, gold: string, moving: boolean) {
  return data.strands.map((s, k) => (
    <g key={k} data-strand="" opacity={s.far ? 0.36 : 0.72}>
      <line
        x1={f(s.x)}
        y1={f(s.top)}
        x2={f(s.x)}
        y2={f(s.end)}
        stroke="#c2a155"
        strokeOpacity="0.45"
        strokeWidth="0.8"
      />
      {s.beads.map((y, j) => (
        <circle key={`b${j}`} cx={f(s.x)} cy={f(y)} r={s.far ? 2 : 2.5} fill={gold} />
      ))}
      {s.pearls.map((p, j) => (
        <circle key={`p${j}`} cx={f(s.x)} cy={f(p.y)} r={f(p.r)} fill={sheen} />
      ))}
      <g transform={`translate(${f(s.x)} ${f(s.end)}) scale(${s.far ? 0.8 : 1})`}>
        {/* A small gold cap, then the drop. */}
        <ellipse cy="1.5" rx="3.6" ry="2.2" fill={gold} />
        {s.drop === "tear" ? (
          <path d={TEAR} transform="translate(0 3)" fill={gold} />
        ) : (
          <circle cy="12" r="8.5" fill={sheen} />
        )}
        {s.glint && moving && (
          <g transform={`translate(${s.drop === "tear" ? -3 : -3.5} ${s.drop === "tear" ? 17 : 9})`}>
            <path data-glint="" d={GLINT} fill="#fffdf6" opacity="0" />
          </g>
        )}
      </g>
    </g>
  ));
}

export function PearlStrands() {
  const wideRef = useRef<SVGSVGElement>(null);
  const tallRef = useRef<SVGSVGElement>(null);
  const [moving, setMoving] = useState(false);
  const [wide, setWide] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setWide(mq.matches);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- media queries are client-only
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setMoving(true);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useMotion(wideRef, WIDE, moving && wide === true);
  useMotion(tallRef, TALL, moving && wide === false);

  return (
    <>
      <Curtain
        data={WIDE}
        spec={LANDSCAPE}
        id="pearls-l"
        moving={moving && wide === true}
        svgRef={wideRef}
        preserve="xMidYMin slice"
        /* No taller than 90vw: on a portrait tablet the section's height
           would otherwise set the scale and blow the pearls up. */
        className="absolute inset-x-0 top-0 hidden h-[min(100%,90vw)] w-full md:block"
      />
      <Curtain
        data={TALL}
        spec={PORTRAIT}
        id="pearls-p"
        moving={moving && wide === false}
        svgRef={tallRef}
        preserve="xMidYMax slice"
        className="absolute inset-y-0 left-1/2 h-full w-full max-w-[30rem] -translate-x-1/2 overflow-visible md:hidden"
      />
    </>
  );
}
