"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SpinConfig = {
  basePath: string; // e.g. "/rentals/lahenga1/360"
  count: number;
  ext: string; // "webp"
  pad: number; // filename zero-pad width
  width: number;
  height: number;
  arcDegrees: number;
  loop: boolean; // true = wrap 360, false = clamped pendulum
};

const frameUrl = (c: SpinConfig, i: number) =>
  `${c.basePath}/${String(i).padStart(c.pad, "0")}.${c.ext}`;

/**
 * Turntable viewer (DESIGN_SPEC §6). Drag or wheel to rotate. A partial arc
 * (loop:false) clamps at both ends like a pendulum; loop:true wraps. All frames
 * are preloaded (the set is tiny). The gold arc shows position honestly — a 90°
 * arc for a 90° capture, not a fake full circle.
 */
export function SpinViewer({ config, alt }: { config: SpinConfig; alt: string }) {
  const { count, loop, arcDegrees } = config;
  const [frame, setFrame] = useState(0);
  const [ready, setReady] = useState(false);
  const [hinted, setHinted] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startFrame: number; active: boolean } | null>(null);

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
      if (loop) {
        next = ((next % count) + count) % count;
      } else {
        next = Math.max(0, Math.min(count - 1, next));
      }
      return next;
    },
    [count, loop]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { startX: e.clientX, startFrame: frame, active: true };
    setHinted(false);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d?.active || !stageRef.current) return;
    const w = stageRef.current.clientWidth || 1;
    const pxPerFrame = w / count; // a full drag across the stage spans the arc
    // Drag left advances toward the profile end (index up).
    const deltaFrames = -Math.round((e.clientX - d.startX) / pxPerFrame);
    setFrame(step(d.startFrame, deltaFrames));
  };
  const endDrag = () => {
    if (drag.current) drag.current.active = false;
  };

  // Wheel scrubs; at a clamp boundary in the scroll direction, release to the page.
  const onWheel = (e: React.WheelEvent) => {
    const dir = e.deltaY > 0 ? 1 : -1;
    const atEnd = !loop && ((dir > 0 && frame >= count - 1) || (dir < 0 && frame <= 0));
    if (atEnd) return; // let the page scroll
    e.preventDefault();
    setFrame((f) => step(f, dir));
    setHinted(false);
  };

  const t = count > 1 ? frame / (count - 1) : 0;

  return (
    <div className="select-none">
      <div
        ref={stageRef}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-card bg-silk-100 touch-none cursor-grab active:cursor-grabbing"
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
          if (e.key === "ArrowRight") setFrame((f) => step(f, 1));
          if (e.key === "ArrowLeft") setFrame((f) => step(f, -1));
        }}
      >
        {/* Frames — plain <img> swap (preloaded = instant). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[frame]}
          alt={alt}
          draggable={false}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Drag hint — fades after first interaction */}
        <div
          className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-dusk-950/55 px-3 py-1 text-[0.75rem] text-silk-50 transition-opacity duration-500 ${
            hinted ? "opacity-100" : "opacity-0"
          }`}
        >
          ⟵ drag to rotate ⟶
        </div>
      </div>

      {/* Gold arc position indicator (honest to the captured arc) */}
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
    <div className="mt-3 flex items-center justify-center gap-3 text-caption text-ink-400">
      <svg viewBox="0 0 100 24" className="h-5 w-24" aria-hidden="true">
        <path
          d={`M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`}
          fill="none"
          stroke="var(--color-gold-400)"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx={dx} cy={dy} r="2.4" fill="var(--color-gold-400)" />
      </svg>
      <span>{loop ? "360° view" : `${Math.round(arcDegrees)}° view`}</span>
    </div>
  );
}
