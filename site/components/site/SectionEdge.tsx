/**
 * The edge a room tears against the one above it.
 *
 * A straight horizontal line between two grounds is what every template ships.
 * This tears the upper room's paper away and curls it back, so the room below
 * is revealed through the hole, with the curl's own underside catching light and
 * casting a shadow down onto what it reveals.
 *
 * It is still a hard cut (DESIGN_SPEC_V3 §3.2): the two grounds meet along one
 * edge with no gradient between them and no crossfade. The shading lives inside
 * the curl, which is an object sitting on top, not a blend between the grounds.
 * A soft or gradient boundary is the one thing §2.5 bans outright, and it is
 * also the move that makes a page look generic.
 *
 * Everything is drawn: no images, no runtime cost beyond one inline SVG, crisp
 * at any pixel density, and both colours come from the palette tokens, so the
 * same component serves a porcelain tear and a violet one.
 *
 * The silhouette is generated from a seeded PRNG at module load, so it is
 * identical on the server and the client (no hydration mismatch) and a different
 * `seed` gives a different tear without a new asset. Purely decorative.
 */

// The box maps 1:1 vertically (preserveAspectRatio="none"), so a unit here is a
// known fraction of the rendered height and the roll's proportions are designed,
// not left to a slice. Horizontal stretch on a rip is imperceptible.
const W = 1600;
const H = 160;
const TEAR_Y = 52; // where the paper gives way, 32% down the band

/** mulberry32 — small, deterministic, good enough for a torn edge. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Torn = { tear: string; tearShadow: string; curls: { d: string; shadow: string }[] };

/**
 * Builds the tear line and the strips of paper that curl back off it.
 *
 * The tear is a dense polyline with two scales of noise: a slow wander that
 * gives the rip its overall shape, and a fine jitter that reads as paper fibre.
 * The curls are spans of that same line pulled downward into a roll.
 */
function buildTorn(seed: number): Torn {
  const rnd = prng(seed);
  const step = 16;
  const n = Math.ceil(W / step);

  // Slow wander, so the rip is not uniformly ragged along its length.
  const wander: number[] = [];
  let w = 0;
  for (let i = 0; i <= n; i++) {
    w += (rnd() - 0.5) * 11;
    w = Math.max(-30, Math.min(30, w));
    wander.push(w);
  }

  // Fine jitter is the paper fibre; the occasional spike is where it gave way
  // along a longer thread.
  const ys = wander.map((v) => {
    const spike = rnd() < 0.08 ? (rnd() - 0.5) * 34 : 0;
    return TEAR_Y + v + (rnd() - 0.5) * 13 + spike;
  });

  // The sheet hangs DOWN over the room below and stops along the rip, so the rip
  // itself is the paper's ragged bottom edge. Anything below it is left
  // transparent and the incoming room shows through, which is what makes the
  // boundary a hole rather than a line. Drawing it the other way round hides the
  // rip behind the incoming section's own square background.
  let tear = `M0 0 L${W} 0 L${W} ${ys[n].toFixed(1)}`;
  for (let i = n - 1; i >= 0; i--) tear += ` L${(i * step).toFixed(0)} ${ys[i].toFixed(1)}`;
  tear += ` Z`;

  // Three to four rolls, spaced out, never touching.
  const curls: { d: string; shadow: string }[] = [];
  const count = 3 + Math.floor(rnd() * 2);
  const lanes = Array.from({ length: count }, (_, k) => (k + 0.5) / count);
  for (const lane of lanes) {
    const centre = lane * W + (rnd() - 0.5) * (W / count) * 0.4;
    // Narrow and deep: a roll, not a swell. Wide shallow curves read as waves.
    //
    // These numbers are in viewBox units and the box is drawn with
    // `preserveAspectRatio="none"`, so they are NOT rendered at the same scale:
    // 1600 units of width map to the viewport (~0.9x at 1440) while 160 units of
    // height map to a 74-104px band (~0.6x). A roll authored square here renders
    // half as deep as it is wide. The first build missed that and the curls read
    // as shallow bowls, so the width is cut and the depth raised to compensate.
    const half = 38 + rnd() * 34;
    const x0 = Math.max(-40, centre - half);
    const x1 = Math.min(W + 40, centre + half);
    const depth = 74 + rnd() * 26; // how far the roll hangs into the revealed room
    const lift = 3 + rnd() * 4; // its ends taper back to points on the tear

    const iStart = Math.max(0, Math.round(x0 / step));
    const iEnd = Math.min(n, Math.round(x1 / step));

    // Top of the roll follows the rip itself, so it is welded to the tear.
    let top = `M${(iStart * step).toFixed(0)} ${ys[iStart].toFixed(1)}`;
    for (let i = iStart + 1; i <= iEnd; i++) {
      top += ` L${(i * step).toFixed(0)} ${ys[i].toFixed(1)}`;
    }

    // Its underside is a smooth curve: paper rolls, it does not crease.
    const yMid = ys[Math.round((iStart + iEnd) / 2)];
    const belly = yMid + depth;
    const under =
      ` C ${(x1 - half * 0.06).toFixed(0)} ${(ys[iEnd] + lift + depth * 0.55).toFixed(1)},` +
      ` ${(centre + half * 0.72).toFixed(0)} ${belly.toFixed(1)},` +
      ` ${centre.toFixed(0)} ${belly.toFixed(1)}` +
      ` C ${(centre - half * 0.72).toFixed(0)} ${belly.toFixed(1)},` +
      ` ${(x0 + half * 0.06).toFixed(0)} ${(ys[iStart] + lift + depth * 0.55).toFixed(1)},` +
      ` ${(iStart * step).toFixed(0)} ${ys[iStart].toFixed(1)} Z`;

    curls.push({
      d: top + under,
      // The cast shadow is the same roll, dropped and swollen slightly.
      shadow:
        top +
        ` C ${(x1 - half * 0.06).toFixed(0)} ${(ys[iEnd] + lift + depth * 0.55 + 8).toFixed(1)},` +
        ` ${(centre + half * 0.72).toFixed(0)} ${(belly + 11).toFixed(1)},` +
        ` ${centre.toFixed(0)} ${(belly + 11).toFixed(1)}` +
        ` C ${(centre - half * 0.72).toFixed(0)} ${(belly + 11).toFixed(1)},` +
        ` ${(x0 + half * 0.06).toFixed(0)} ${(ys[iStart] + lift + depth * 0.55 + 8).toFixed(1)},` +
        ` ${(iStart * step).toFixed(0)} ${ys[iStart].toFixed(1)} Z`,
    });
  }

  // The rip's own drop shadow: the same ragged line, thickened downward.
  let tearShadow = `M0 ${(ys[0] - 6).toFixed(1)}`;
  for (let i = 1; i <= n; i++) tearShadow += ` L${(i * step).toFixed(0)} ${(ys[i] - 6).toFixed(1)}`;
  for (let i = n; i >= 0; i--) tearShadow += ` L${(i * step).toFixed(0)} ${(ys[i] + 9).toFixed(1)}`;
  tearShadow += " Z";

  return { tear, tearShadow, curls };
}

// Generated once per seed at module load: same markup on server and client.
const TORN: Record<number, Torn> = {};
function torn(seed: number) {
  return (TORN[seed] ??= buildTorn(seed));
}

export function SectionEdge({
  paper,
  reveal,
  seed = 1,
  className = "",
}: {
  /** The ground being torn: the OUTGOING section's colour. */
  paper: string;
  /** What the hole shows: the INCOMING section's own ground. */
  reveal: string;
  /** Change it for a different rip. Same seed, same tear, every render. */
  seed?: number;
  className?: string;
}) {
  const { tear, tearShadow, curls } = torn(seed);
  const id = `edge${seed}`;

  return (
    <div
      aria-hidden="true"
      /* The band starts just above the section's own top edge so the square seam
         is covered, and the sheet then hangs down into the room, ending along
         the rip with its rolls below that. */
      className={`pointer-events-none absolute inset-x-0 h-[74px] md:h-[104px] ${className}`}
      style={{ top: "-6px" }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          {/* The roll's own shading: its lit underside at the top, turning into
              its own shadow where it curls under. Mixed from the paper colour so
              one gradient serves a porcelain tear and a violet one. */}
          <linearGradient id={`${id}-roll`} x1="0" y1="0" x2="0" y2="1">
            {/* Tucked under the sheet, so it starts in shadow. The band is deep
                enough to read at this scale: at 6% it was a hairline nobody saw,
                which left the roll looking lit from the top down like a bowl. */}
            <stop offset="0%" stopColor={`color-mix(in srgb, ${paper} 44%, black)`} />
            <stop offset="14%" stopColor={`color-mix(in srgb, ${paper} 66%, black)`} />
            {/* The lit ridge along the top of the roll: the paper's outer face
                turning over, and the one thing that says "curl" rather than
                "hole". Kept tight, because a wide highlight reads as a sphere. */}
            <stop offset="26%" stopColor={`color-mix(in srgb, ${paper} 40%, white)`} />
            <stop offset="33%" stopColor={`color-mix(in srgb, ${paper} 72%, white)`} />
            <stop offset="46%" stopColor={paper} />
            <stop offset="72%" stopColor={`color-mix(in srgb, ${paper} 70%, black)`} />
            <stop offset="92%" stopColor={`color-mix(in srgb, ${paper} 42%, black)`} />
            <stop offset="100%" stopColor={`color-mix(in srgb, ${paper} 30%, black)`} />
          </linearGradient>
          <filter id={`${id}-blur`} x="-10%" y="-30%" width="120%" height="180%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* 1. The torn sheet, hanging down over the room below. */}
        <path d={tear} fill={paper} />

        {/* 2. The sheet's own shadow on the room it covers: a thin, tight band
               under the rip, which is what stops the edge reading as a sticker. */}
        <g filter={`url(#${id}-blur)`} opacity="0.22">
          <path d={tearShadow} fill="#000" />
        </g>

        {/* 3. The deeper shadow each roll casts down onto that room. */}
        <g filter={`url(#${id}-blur)`} opacity="0.28">
          {curls.map((c, i) => (
            <path key={i} d={c.shadow} fill="#000" />
          ))}
        </g>

        {/* 4. The rolls themselves, welded to the rip they tore from. */}
        {curls.map((c, i) => (
          <path key={i} d={c.d} fill={`url(#${id}-roll)`} />
        ))}
      </svg>
    </div>
  );
}
