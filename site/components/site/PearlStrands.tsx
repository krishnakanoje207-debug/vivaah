"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/**
 * Strings of pearls hanging behind the jewellery head, the way a jhoomar hangs
 * from a ceiling: drawn here rather than shipped as a picture, like the retail
 * page's SakuraTree.
 *
 * Why (owner, 15 Sep 2026): the retail head got its sakura and the jewellery
 * head was left plain; of the three motifs offered she chose pearl strands.
 * It sits behind everything (the Arcade's isolated layer, `-z-10`), and the
 * type column is lifted above that layer, so it never lies over the heading or
 * the buttons.
 *
 * Geometry. A 1000x800 box at 200% of the arcade's width, so one unit is
 * W/500. The arcade occupies x 250-750, y 300-871 of it (its height is 8W/7,
 * i.e. 571 units), which is why the parent positions it at left -50% and top
 * -300/571 = -52.5% of the arcade's height. The strands start above the
 * arcade's top and stay invisible for the first 210 units, fading in by 336
 * (just inside the arcade's top): at 1920, 1440 and 1280 wide that keeps every
 * bead clear of the nav bar, and no strand shows where it starts. Below md the
 * parent sets top -40% instead, because the arcade sits under the buttons
 * there and the curtain must not rise behind the type. Every one ends
 * inside the arcade's height, clear of the torn edge below the head. Strands
 * behind the doorway (x 410-750) end above its foot (y 780) so none pokes out
 * between the planes.
 *
 * Pearls and small gold beads are placed by a seeded generator, so the server
 * and the client draw the same strands. Every other strand is set back: a
 * little smaller and dimmer, which is what gives the curtain depth.
 *
 * Motion: each strand swings a fraction of a degree from its hanging point, out
 * of phase with its neighbours, and a few drops catch the light now and then.
 * Both pause off screen. Reduced motion, and the server render: still, no glint.
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

// Hanging points and depths, authored against the arcade (see the header):
// a short run in the gap left of it, a run over it, a run off its right side.
// Ten, not more: it is a background, and a denser curtain read as a bead shop.
const ANCHORS: [number, number][] = [
  [104, 520], [168, 430], [230, 590],
  [300, 560], [470, 630], [640, 610], [724, 520],
  [800, 600], [872, 460], [946, 560],
];

type Pearl = { y: number; r: number };
type Bead = { y: number };
type Strand = {
  x: number;
  end: number;
  far: boolean;
  pearls: Pearl[];
  beads: Bead[];
  drop: "tear" | "pearl";
  glint: boolean;
};

function string(): Strand[] {
  const rand = mulberry32(9024);
  return ANCHORS.map(([ax, ay], k) => {
    const far = k % 2 === 1;
    const x = ax + (rand() - 0.5) * 18;
    const end = ay + (rand() - 0.5) * 40;
    const scale = far ? 0.78 : 1;
    const pearls: Pearl[] = [];
    const beads: Bead[] = [];
    // Grouped strands: runs of three to five pearls with a gold bead on bare
    // thread between them. Continuous strands: smaller pearls end to end, a
    // bead every seven.
    const grouped = k % 3 !== 2;
    let y = 40 + rand() * 60;
    let run = 0;
    let runLen = 3 + Math.floor(rand() * 3);
    while (y < end - 18) {
      const r = (grouped ? 4.6 : 3.4) * scale * (0.92 + rand() * 0.16);
      if (grouped && run === runLen) {
        const gap = 18 * scale;
        beads.push({ y: y + gap / 2 });
        y += gap;
        run = 0;
        runLen = 3 + Math.floor(rand() * 3);
        continue;
      }
      if (!grouped && run === 7) {
        beads.push({ y: y + 3 * scale });
        y += 6 * scale;
        run = 0;
        continue;
      }
      pearls.push({ y: y + r, r });
      y += r * 2 + 0.9;
      run++;
    }
    const outside = x < 250 || x > 750;
    return {
      x,
      end: y,
      far,
      pearls,
      beads,
      drop: k % 4 === 0 || k % 4 === 3 ? "tear" : "pearl",
      // Glints only where they can be seen: strands off either side of the arcade.
      glint: outside && !far,
    };
  });
}

const STRANDS = string();

// A teardrop hanging from its top point, 26 units long.
const TEAR = "M0 0C5.5 6 9.5 13 9.5 18.5A9.5 9.5 0 0 1 -9.5 18.5C-9.5 13 -5.5 6 0 0Z";
const GLINT = "M0 -7L1.3 -1.3L7 0L1.3 1.3L0 7L-1.3 1.3L-7 0L-1.3 -1.3Z";

export function PearlStrands({ className = "" }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- media query is client-only
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setMoving(true);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !moving) return;

    const anims: gsap.core.Animation[] = [];
    const ctx = gsap.context(() => {
      gsap.utils.toArray<SVGGElement>("[data-strand]").forEach((el, k) => {
        const s = STRANDS[k];
        const amp = (s.far ? 0.45 : 0.75) + (k % 3) * 0.12;
        const duration = 4.8 + (k % 5) * 0.7;
        gsap.set(el, { rotation: -amp, svgOrigin: `${f(s.x)} 0` });
        const swing = gsap.to(el, {
          rotation: amp,
          svgOrigin: `${f(s.x)} 0`,
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
  }, [moving]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      viewBox="0 0 1000 800"
      className={`pointer-events-none overflow-visible ${className}`}
    >
      <defs>
        <radialGradient id="pearl-sheen" cx="0.36" cy="0.32" r="0.78">
          <stop offset="0" stopColor="#fffdf6" />
          <stop offset="0.42" stopColor="#ece5d4" />
          <stop offset="1" stopColor="#a89c86" />
        </radialGradient>
        <linearGradient id="pearl-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6cd8a" />
          <stop offset="0.5" stopColor="#c2a155" />
          <stop offset="1" stopColor="#7f6127" />
        </linearGradient>
        <linearGradient id="pearl-fade-g" x1="0" y1="0" x2="0" y2="800" gradientUnits="userSpaceOnUse">
          <stop offset="0.26" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.42" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="pearl-fade" maskUnits="userSpaceOnUse" x="-100" y="-100" width="1200" height="1000">
          <rect x="-100" y="-100" width="1200" height="1000" fill="url(#pearl-fade-g)" />
        </mask>
      </defs>

      <g mask="url(#pearl-fade)">
        {STRANDS.map((s, k) => (
          <g key={k} data-strand="" opacity={s.far ? 0.42 : 0.82}>
            <line
              x1={f(s.x)}
              y1="0"
              x2={f(s.x)}
              y2={f(s.end)}
              stroke="#c2a155"
              strokeOpacity="0.45"
              strokeWidth="0.8"
            />
            {s.beads.map((b, j) => (
              <circle key={`b${j}`} cx={f(s.x)} cy={f(b.y)} r={s.far ? 2 : 2.5} fill="url(#pearl-gold)" />
            ))}
            {s.pearls.map((p, j) => (
              <circle key={`p${j}`} cx={f(s.x)} cy={f(p.y)} r={f(p.r)} fill="url(#pearl-sheen)" />
            ))}
            <g transform={`translate(${f(s.x)} ${f(s.end)}) scale(${s.far ? 0.8 : 1})`}>
              {/* A small gold cap, then the drop. */}
              <ellipse cy="1.5" rx="3.6" ry="2.2" fill="url(#pearl-gold)" />
              {s.drop === "tear" ? (
                <path d={TEAR} transform="translate(0 3)" fill="url(#pearl-gold)" />
              ) : (
                <circle cy="12" r="8.5" fill="url(#pearl-sheen)" />
              )}
              {s.glint && moving && (
                <g transform={`translate(${s.drop === "tear" ? -3 : -3.5} ${s.drop === "tear" ? 17 : 9})`}>
                  <path data-glint="" d={GLINT} fill="#fffdf6" opacity="0" />
                </g>
              )}
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}
