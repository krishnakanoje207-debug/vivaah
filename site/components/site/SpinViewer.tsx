"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

// A decoded frame costs width×height×4 bytes of bitmap for as long as we hold a
// reference to it — 3.7 MB apiece at 1280×720, so lahenga1's 87 frames are
// ~320 MB. No device should pay a third of a gigabyte to look at one garment, so
// every tier gets a ceiling and we hold a subsampled set, each held frame
// standing in for its neighbours. The tiers differ only in how much they can
// afford: 192 MB on a desktop, which still leaves the live set turning every
// ~5°; 128 MB where the viewport or the reported memory says phone; 64 MB where
// the device admits to 2 GB or less and the tab is the first thing the OS will
// reclaim. MAX_STRIDE is the floor on smoothness — past every fourth frame the
// turn reads as a flipbook, and we would rather spend the bytes.
const HELD_BUDGET_BYTES_DESKTOP = 192 * 1024 * 1024;
const HELD_BUDGET_BYTES = 128 * 1024 * 1024;
const HELD_BUDGET_BYTES_LOW = 64 * 1024 * 1024;
const MAX_STRIDE = 4;

// Frames fetched+decoded at once. The transfer is trivial (2.5 MB for the whole
// set); what we are rationing is the decode burst and the request queue, so that
// the first frame is not stuck behind 86 siblings of equal priority.
const IN_FLIGHT = 6;
const IN_FLIGHT_CAPPED = 3;

// A 3× phone does not need a 3840px backing store behind a 390px element.
const MAX_DPR = 2;

// How far a touch must travel before we decide it is a turn and not a scroll.
const AXIS_LOCK_PX = 8;

type FramePlan = {
  slots: number[]; // real frame indices we actually hold, in order
  nearest: Uint16Array; // every real frame index → the slot that stands in for it
  stride: number;
  capped: boolean; // on a phone budget — the stride alone no longer tells us, since desktop strides too
};

/**
 * Decide how much of the frame set this device can afford to keep decoded.
 * `deviceMemory` is Chromium-only (absent on iOS, spoofable, coarse) and the
 * viewport width only tells us about the window, so both are treated as hints:
 * either one pointing at "phone" is enough to switch the budget on. Read once at
 * mount — re-planning on a resize would mean re-fetching the whole set.
 */
function planFrames(c: SpinConfig): FramePlan {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const budget =
    memory !== undefined && memory <= 2
      ? HELD_BUDGET_BYTES_LOW
      : window.innerWidth < 900 || (memory !== undefined && memory <= 4)
        ? HELD_BUDGET_BYTES
        : HELD_BUDGET_BYTES_DESKTOP;

  const total = c.count * c.width * c.height * 4;
  const stride = Math.min(MAX_STRIDE, Math.max(1, Math.ceil(total / budget)));

  // The last frame is always held even when the stride would step past it, so a
  // capped set still traverses the full arc — it just gets there in bigger steps.
  const slots: number[] = [];
  for (let i = 0; i < c.count; i += stride) slots.push(i);
  if (slots[slots.length - 1] !== c.count - 1) slots.push(c.count - 1);

  // Precomputed nearest-slot lookup, so drawing never searches. Both arrays walk
  // forward together, which is why this is a single pass.
  const nearest = new Uint16Array(c.count);
  let s = 0;
  for (let i = 0; i < c.count; i++) {
    while (s + 1 < slots.length && Math.abs(slots[s + 1] - i) <= Math.abs(slots[s] - i)) s++;
    nearest[i] = s;
  }
  return { slots, nearest, stride, capped: budget < HELD_BUDGET_BYTES_DESKTOP };
}

/**
 * Slot order to fetch in: the first frame, then a coarse spread over the whole
 * arc, then the gaps between — halving the step each pass. A drag therefore has
 * something to show across the entire range long before the set is complete.
 */
function loadOrder(n: number): number[] {
  const order: number[] = [];
  const seen = new Uint8Array(n);
  for (let stride = 1 << Math.max(0, Math.ceil(Math.log2(n))); stride >= 1; stride >>= 1) {
    for (let i = 0; i < n; i += stride) {
      if (!seen[i]) {
        seen[i] = 1;
        order.push(i);
      }
    }
  }
  return order;
}

/** The wanted slot if it has landed, else the closest one that has. */
function pickLoaded(imgs: (HTMLImageElement | null)[], slot: number): HTMLImageElement | null {
  if (imgs[slot]) return imgs[slot];
  for (let d = 1; d < imgs.length; d++) {
    const before = imgs[slot - d];
    if (before) return before;
    const after = imgs[slot + d];
    if (after) return after;
  }
  return null;
}

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
  const planRef = useRef<FramePlan | null>(null);
  const lastDrawnRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef(0);
  const readyRef = useRef(false);
  const [frame, setFrameState] = useState(0); // mirror for the arc indicator
  const [ready, setReady] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; startFrame: number; axis: "?" | "x" | "y" } | null>(null);
  const pausedUntil = useRef(0);

  // Frame indices stay the real 0..count-1 everywhere (drag maths, autoplay, the
  // arc indicator, aria-valuenow); only the pixels are quantised, here.
  const draw = useCallback((i: number) => {
    const canvas = canvasRef.current;
    const plan = planRef.current;
    if (!canvas || !plan) return;
    const img = pickLoaded(imgsRef.current, plan.nearest[i]);
    if (!img || img === lastDrawnRef.current) return; // a capped set repeats frames
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    lastDrawnRef.current = img;
  }, []);

  const setIdx = useCallback(
    (i: number) => {
      frameRef.current = i;
      draw(i);
      setFrameState(i);
    },
    [draw]
  );

  // Back the canvas with what is actually on screen rather than the source's
  // 1280×720 — at a capped DPR, and never larger than the source itself, since
  // upscaling past it only costs memory. Setting .width clears the canvas, so
  // anything drawn has to be drawn again.
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const size = () => {
      const cssW = stage.clientWidth;
      if (!cssW) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.min(Math.round(cssW * dpr), width);
      const h = Math.round((w * height) / width);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      lastDrawnRef.current = null;
      draw(frameRef.current);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [width, height, draw]);

  // Progressive load: a bounded number of decodes in flight, refilled as each
  // lands, in the coarse-to-fine order above. The first frame to arrive paints
  // immediately; later ones repaint only if they are what the current frame
  // wants. Unmount aborts whatever is still in flight and drops every reference,
  // so navigating away actually returns the bitmaps.
  useEffect(() => {
    const plan = planFrames(config);
    planRef.current = plan;
    const imgs: (HTMLImageElement | null)[] = new Array(plan.slots.length).fill(null);
    imgsRef.current = imgs;
    lastDrawnRef.current = null;

    let cancelled = false;
    const order = loadOrder(plan.slots.length);
    const inFlight = new Set<HTMLImageElement>();
    const limit = plan.capped ? IN_FLIGHT_CAPPED : IN_FLIGHT;
    let next = 0;

    const pump = () => {
      while (!cancelled && inFlight.size < limit && next < order.length) {
        const slot = order[next++];
        const img = new Image();
        inFlight.add(img);
        // A frame that fails to arrive is left null — drawing falls through to
        // its neighbour, and the queue has to keep moving either way.
        const settle = (ok: boolean) => {
          inFlight.delete(img);
          if (cancelled) return;
          if (ok) {
            imgs[slot] = img;
            if (!readyRef.current || plan.nearest[frameRef.current] === slot) draw(frameRef.current);
            if (!readyRef.current) {
              readyRef.current = true;
              setReady(true);
            }
          }
          pump();
        };
        img.src = frameUrl(config, plan.slots[slot]);
        if (img.decode) img.decode().then(() => settle(true), () => settle(false));
        else {
          img.onload = () => settle(true);
          img.onerror = () => settle(false);
        }
      }
    };
    pump();

    return () => {
      cancelled = true;
      inFlight.forEach((img) => {
        img.src = ""; // aborts the pending fetch
      });
      inFlight.clear();
      imgsRef.current = [];
      planRef.current = null;
      lastDrawnRef.current = null;
      readyRef.current = false;
    };
  }, [config, draw]);

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

  // A finger that starts on the garment might mean "turn this" or might mean
  // "scroll the page" — the stage fills the hero, so swallowing the second one
  // strands the reader. touch-pan-y leaves vertical panning to the browser, and
  // until the gesture has committed to an axis we neither rotate nor capture the
  // pointer; a vertical commit hands the whole gesture back. A mouse or pen has
  // no such ambiguity and turns from the first move.
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      startFrame: frameRef.current,
      axis: e.pointerType === "touch" ? "?" : "x",
    };
    if (e.pointerType !== "touch") {
      e.currentTarget.setPointerCapture(e.pointerId);
      setInteracted(true);
    }
    pauseAuto();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.axis === "y" || !stageRef.current) return;
    if (d.axis === "?") {
      const dx = Math.abs(e.clientX - d.startX);
      const dy = Math.abs(e.clientY - d.startY);
      if (dx < AXIS_LOCK_PX && dy < AXIS_LOCK_PX) return;
      if (dy > dx) {
        d.axis = "y";
        return;
      }
      d.axis = "x";
      d.startX = e.clientX; // re-base so the turn starts where the lock did
      e.currentTarget.setPointerCapture(e.pointerId);
      setInteracted(true);
    }
    const w = stageRef.current.clientWidth || 1;
    const pxPerFrame = w / count;
    const deltaFrames = -Math.round((e.clientX - d.startX) / pxPerFrame);
    setIdx(step(d.startFrame, deltaFrames));
    pauseAuto();
  };
  const endDrag = () => {
    drag.current = null;
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
        className="relative w-full touch-pan-y cursor-grab overflow-hidden bg-stage active:cursor-grabbing"
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
