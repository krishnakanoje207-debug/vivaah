"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SpinConfig = {
  basePath: string;
  count: number;
  ext: string;
  pad: number;
  width: number;
  height: number;
  arcDegrees: number;
  loop: boolean; // true = wrap 360, false = clamped pendulum
};

const frameUrl = (c: SpinConfig, i: number) =>
  `${c.basePath}/${String(i).padStart(c.pad, "0")}.${c.ext}`;

// One-way traversal time per 90° of arc (ms). Tunable; ~5s reads as unhurried
// without feeling static. lahenga1's ~225° → ~12.5s each way.
const MS_PER_90 = 5000;
const RESUME_IDLE_MS = 3000;

/**
 * Turntable viewer (DESIGN_SPEC §6). Drag / wheel / arrows to rotate; a partial
 * arc (loop:false) clamps like a pendulum. With `autoplay`, the garment swings
 * through its arc autonomously (sinusoidal ease at the ends), pausing on touch
 * and resuming after idle. Reduced-motion disables the swing (drag still works).
 */
export function SpinViewer({
  config,
  alt,
  autoplay = false,
}: {
  config: SpinConfig;
  alt: string;
  autoplay?: boolean;
}) {
  const { count, loop, arcDegrees } = config;
  const [frame, setFrame] = useState(0);
  const [ready, setReady] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startFrame: number; active: boolean } | null>(null);
  const pausedUntil = useRef(0); // performance.now() timestamp

  const urls = useMemo(
    () => Array.from({ length: count }, (_, i) => frameUrl(config, i)),
    [config, count]
  );

  // Preload every frame; reveal once the first (front) frame is decoded.
  useEffect(() => {
    let done = 0;
    const imgs = urls.map((u) => {
      const img = new Image();
      img.src = u;
      img.onload = img.onerror = () => {
        done += 1;
        if (done === 1) setReady(true);
      };
      return img;
    });
    return () => imgs.forEach((i) => (i.onload = i.onerror = null));
  }, [urls]);

  const step = useCallback(
    (start: number, deltaFrames: number) => {
      let next = start + deltaFrames;
      if (loop) next = ((next % count) + count) % count;
      else next = Math.max(0, Math.min(count - 1, next));
      return next;
    },
    [count, loop]
  );

  // Auto-swing (pendulum). Constant angular velocity via cosine easing so the
  // garment slows at both ends. Skips while the user is interacting.
  useEffect(() => {
    if (!autoplay) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const period = 2 * (arcDegrees / 90) * MS_PER_90; // full there-and-back
    let theta = 0;
    let last: number | null = null;
    let raf = 0;

    const tick = (t: number) => {
      if (last == null) last = t;
      const dt = t - last;
      last = t;
      if (t >= pausedUntil.current) {
        theta = (theta + (2 * Math.PI * dt) / period) % (2 * Math.PI);
        const pos = (1 - Math.cos(theta)) / 2; // 0→1→0, eased ends
        setFrame(Math.round(pos * (count - 1)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoplay, arcDegrees, count]);

  const pauseAuto = () => {
    pausedUntil.current = performance.now() + RESUME_IDLE_MS;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { startX: e.clientX, startFrame: frame, active: true };
    setInteracted(true);
    pauseAuto();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d?.active || !stageRef.current) return;
    const w = stageRef.current.clientWidth || 1;
    const pxPerFrame = w / count;
    const deltaFrames = -Math.round((e.clientX - d.startX) / pxPerFrame);
    setFrame(step(d.startFrame, deltaFrames));
    pauseAuto();
  };
  const endDrag = () => {
    if (drag.current) drag.current.active = false;
    pauseAuto();
  };

  const onWheel = (e: React.WheelEvent) => {
    const dir = e.deltaY > 0 ? 1 : -1;
    const atEnd = !loop && ((dir > 0 && frame >= count - 1) || (dir < 0 && frame <= 0));
    if (atEnd) return;
    e.preventDefault();
    setFrame((f) => step(f, dir));
    setInteracted(true);
    pauseAuto();
  };

  const t = count > 1 ? frame / (count - 1) : 0;

  return (
    <div className="select-none">
      <div
        ref={stageRef}
        className="relative aspect-[4/5] w-full overflow-hidden bg-stage touch-none cursor-grab active:cursor-grabbing"
        style={{ aspectRatio: `${config.width} / ${config.height}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onWheel={onWheel}
        role="slider"
        aria-label={`${alt} — rotate view`}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={frame}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            setFrame((f) => step(f, 1));
            setInteracted(true);
            pauseAuto();
          }
          if (e.key === "ArrowLeft") {
            setFrame((f) => step(f, -1));
            setInteracted(true);
            pauseAuto();
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[frame]}
          alt={alt}
          draggable={false}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Circular drag glyph — floats until first interaction */}
        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ${
            interacted ? "opacity-0" : "opacity-90"
          }`}
          aria-hidden="true"
        >
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="20" stroke="var(--color-gold-600)" strokeWidth="1.5" opacity="0.85" />
            <path d="M18 28h20M18 28l4-4M18 28l4 4M38 28l-4-4M38 28l-4 4" stroke="var(--color-gold-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <ArcIndicator arcDegrees={arcDegrees} t={t} loop={loop} />
    </div>
  );
}

function ArcIndicator({ arcDegrees, t, loop }: { arcDegrees: number; t: number; loop: boolean }) {
  const cx = 50;
  const cy = 44;
  const r = 34;
  const span = loop ? 340 : arcDegrees;
  const a0 = 270 - span / 2;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const pt = (deg: number) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
  const [sx, sy] = pt(a0);
  const [ex, ey] = pt(a0 + span);
  const [dx, dy] = pt(a0 + span * t);
  const large = span > 180 ? 1 : 0;

  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-caption text-ink-400">
      <svg viewBox="0 0 100 26" className="h-6 w-24" aria-hidden="true">
        <path
          d={`M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`}
          fill="none"
          stroke="var(--color-gold-500)"
          strokeOpacity="0.55"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx={dx} cy={dy} r="2.6" fill="var(--color-gold-600)" />
      </svg>
      <span>{loop ? "360° view" : `${Math.round(arcDegrees)}° view`}</span>
    </div>
  );
}
