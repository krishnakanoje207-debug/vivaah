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

// One-way traversal time per 90° of arc (ms). With 87 frames, ~1.6s/90° gives
// ~22 frame-changes/sec at a calm ~4s sweep across lahenga1's ~225°.
const MS_PER_90 = 1600;
const RESUME_IDLE_MS = 3000;

/**
 * Turntable viewer (DESIGN_SPEC §6). Renders to a <canvas> from pre-decoded
 * frames (no per-frame <img> re-decode → smooth). Drag / wheel / arrows rotate;
 * a partial arc (loop:false) clamps like a pendulum. With `autoplay` the garment
 * swings through its arc autonomously, pausing on touch. Reduced-motion: static
 * first frame, drag still works.
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
  const { count, loop, arcDegrees, width, height } = config;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgsRef = useRef<(HTMLImageElement | null)[]>([]);
  const frameRef = useRef(0);
  const [frame, setFrameState] = useState(0); // mirror for the arc indicator
  const [ready, setReady] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startFrame: number; active: boolean } | null>(null);
  const pausedUntil = useRef(0);

  const urls = useMemo(
    () => Array.from({ length: count }, (_, i) => frameUrl(config, i)),
    [config, count]
  );

  const draw = useCallback(
    (i: number) => {
      const canvas = canvasRef.current;
      const img = imgsRef.current[i];
      if (!canvas || !img) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    },
    []
  );

  const setIdx = useCallback(
    (i: number) => {
      frameRef.current = i;
      draw(i);
      setFrameState(i);
    },
    [draw]
  );

  // Preload + decode all frames.
  useEffect(() => {
    let cancelled = false;
    imgsRef.current = new Array(count).fill(null);
    urls.forEach((u, i) => {
      const img = new Image();
      img.src = u;
      const done = () => {
        if (cancelled) return;
        imgsRef.current[i] = img;
        if (i === frameRef.current) {
          draw(i);
          setReady(true);
        }
      };
      if (img.decode) img.decode().then(done).catch(done);
      else img.onload = done;
    });
    return () => {
      cancelled = true;
    };
  }, [urls, count, draw]);

  const step = useCallback(
    (start: number, deltaFrames: number) => {
      let next = start + deltaFrames;
      if (loop) next = ((next % count) + count) % count;
      else next = Math.max(0, Math.min(count - 1, next));
      return next;
    },
    [count, loop]
  );

  // Auto-swing (pendulum). Draws directly each rAF for smoothness.
  useEffect(() => {
    if (!autoplay) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const period = 2 * (arcDegrees / 90) * MS_PER_90;
    let theta = 0;
    let last: number | null = null;
    let raf = 0;

    const tick = (t: number) => {
      if (last == null) last = t;
      const dt = t - last;
      last = t;
      if (t >= pausedUntil.current) {
        theta = (theta + (2 * Math.PI * dt) / period) % (2 * Math.PI);
        const pos = (1 - Math.cos(theta)) / 2;
        const i = Math.round(pos * (count - 1));
        if (i !== frameRef.current) setIdx(i);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoplay, arcDegrees, count, setIdx]);

  const pauseAuto = () => {
    pausedUntil.current = performance.now() + RESUME_IDLE_MS;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { startX: e.clientX, startFrame: frameRef.current, active: true };
    setInteracted(true);
    pauseAuto();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d?.active || !stageRef.current) return;
    const w = stageRef.current.clientWidth || 1;
    const pxPerFrame = w / count;
    const deltaFrames = -Math.round((e.clientX - d.startX) / pxPerFrame);
    setIdx(step(d.startFrame, deltaFrames));
    pauseAuto();
  };
  const endDrag = () => {
    if (drag.current) drag.current.active = false;
    pauseAuto();
  };

  const onWheel = (e: React.WheelEvent) => {
    const dir = e.deltaY > 0 ? 1 : -1;
    const atEnd = !loop && ((dir > 0 && frameRef.current >= count - 1) || (dir < 0 && frameRef.current <= 0));
    if (atEnd) return;
    e.preventDefault();
    setIdx(step(frameRef.current, dir));
    setInteracted(true);
    pauseAuto();
  };

  const t = count > 1 ? frame / (count - 1) : 0;

  return (
    <div className="select-none">
      <div
        ref={stageRef}
        className="relative w-full touch-none cursor-grab overflow-hidden bg-stage active:cursor-grabbing"
        style={{ aspectRatio: `${width} / ${height}` }}
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
            setIdx(step(frameRef.current, 1));
            setInteracted(true);
            pauseAuto();
          }
          if (e.key === "ArrowLeft") {
            setIdx(step(frameRef.current, -1));
            setInteracted(true);
            pauseAuto();
          }
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`h-full w-full transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
          aria-label={alt}
        />

        {/* Circular drag glyph — floats until first interaction (§5b) */}
        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ${
            interacted ? "opacity-0" : "opacity-90"
          }`}
          aria-hidden="true"
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="10" stroke="var(--color-gold-600)" strokeWidth="1" opacity="0.8" />
            <path d="M9 14h10M9 14l2-2M9 14l2 2M19 14l-2-2M19 14l-2 2" stroke="var(--color-gold-600)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Arc position indicator — overlaid at the bottom of the frame */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
          <ArcIndicator arcDegrees={arcDegrees} t={t} loop={loop} />
        </div>
      </div>
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
    <div className="flex items-center justify-center gap-3 rounded-full bg-porcelain-50/70 px-4 py-1.5 text-caption text-ink-600 backdrop-blur">
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
