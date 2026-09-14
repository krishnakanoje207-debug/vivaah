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

  // Where the paper actually curls back is not evenly spaced. The first build
  // dropped each roll into its own lane — `(k + 0.5) / count` with a jitter of
  // only ±20% of a lane — and made every belly a symmetric bell of near-enough
  // the same size. Rendered, that reads as a scalloped border or a repeating
  // artifact rather than as a tear: three or four identical domes at regular
  // intervals (measured 14 Sep on the front door).
  //
  // A real rip rolls where the fibre let go and lies flat everywhere else. So
  // positions are WALKED across the width with random gaps, which lets the run
  // cluster two rolls and then leave a third of the span untouched; sizes vary
  // by up to 3x so a deep roll can sit beside a shallow lip; and each belly
  // leans, with its low point off-centre and its two arms carrying different
  // weight. No two rolls in a seam are the same shape any more.
  const curls: { d: string; shadow: string }[] = [];
  const centres: number[] = [];
  for (let x = W * (0.06 + rnd() * 0.2); x < W * 0.94 && centres.length < 3; ) {
    centres.push(x);
    x += W * (0.3 + rnd() * 0.34);
  }

  for (const centre of centres) {
    // Narrow and deep: a roll, not a swell. Wide shallow curves read as waves.
    //
    // These numbers are in viewBox units and the box is drawn with
    // `preserveAspectRatio="none"`, so they are NOT rendered at the same scale:
    // 1600 units of width map to the viewport (~0.9x at 1440) while 160 units of
    // height map to a 74-104px band (~0.6x). A roll authored square here renders
    // half as deep as it is wide. The first build missed that and the curls read
    // as shallow bowls, so the width is cut and the depth raised to compensate.
    // Proportion is what decides whether this reads as paper or as a bucket.
    // The first tuning made the rolls DEEPER than they were wide (half 13-84
    // units against a depth of 26-129) and the rendered result was a row of
    // hanging sacks. Paper peeling off a surface is the opposite shape: wide and
    // shallow, three to six times broader than it lifts. Rendered at 1440 the
    // box squashes x by ~0.9 and y by ~0.65, so these authored numbers land at
    // roughly 200-400px across and 15-35px deep — a lift, not a pouch.
    const scale = 0.6 + rnd() * 0.7;
    const half = (110 + rnd() * 120) * scale;
    const depth = (20 + rnd() * 18) * scale; // how far it lifts off the rip
    const lift = 3 + rnd() * 4; // its ends taper back to points on the tear
    // Which way the roll leans, and how unevenly it carries. A symmetric bell
    // is the single biggest giveaway that a shape was generated.
    const lean = (rnd() - 0.5) * 0.7;
    const armL = 0.55 + rnd() * 0.45;
    const armR = 0.55 + rnd() * 0.45;

    const x0 = Math.max(-40, centre - half);
    const x1 = Math.min(W + 40, centre + half);
    const iStart = Math.max(0, Math.round(x0 / step));
    const iEnd = Math.min(n, Math.round(x1 / step));
    if (iEnd - iStart < 2) continue; // too narrow to read as anything

    // Top of the roll follows the rip itself, so it is welded to the tear.
    let top = `M${(iStart * step).toFixed(0)} ${ys[iStart].toFixed(1)}`;
    for (let i = iStart + 1; i <= iEnd; i++) {
      top += ` L${(i * step).toFixed(0)} ${ys[i].toFixed(1)}`;
    }

    // Its underside is a smooth curve: paper rolls, it does not crease. The
    // shadow is the same curve dropped and swollen, so the two can never drift
    // apart the way two hand-copied path strings can.
    const yMid = ys[Math.round((iStart + iEnd) / 2)];
    const belly = yMid + depth;
    const bx = centre + lean * half; // where the roll actually hangs lowest
    const under = (dy: number, swell: number) =>
      ` C ${(x1 - half * 0.06).toFixed(0)} ${(ys[iEnd] + lift + depth * armR * 0.55 + dy).toFixed(1)},` +
      ` ${(bx + half * 0.72).toFixed(0)} ${(belly + swell).toFixed(1)},` +
      ` ${bx.toFixed(0)} ${(belly + swell).toFixed(1)}` +
      ` C ${(bx - half * 0.72).toFixed(0)} ${(belly + swell).toFixed(1)},` +
      ` ${(x0 + half * 0.06).toFixed(0)} ${(ys[iStart] + lift + depth * armL * 0.55 + dy).toFixed(1)},` +
      ` ${(iStart * step).toFixed(0)} ${ys[iStart].toFixed(1)} Z`;

    curls.push({ d: top + under(0, 0), shadow: top + under(8, 11) });
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
            {/* Tucked under the sheet, so it starts in shadow. */}
            <stop offset="0%" stopColor={`color-mix(in srgb, ${paper} 52%, black)`} />
            {/* The lit ridge along the top of the lift: the paper's outer face
                turning over, and the one thing that says "curl" rather than
                "hole". On a shallow lift this is most of what is visible, so it
                sits high and carries the section rather than being a hairline
                between two dark bands. */}
            <stop offset="18%" stopColor={`color-mix(in srgb, ${paper} 55%, white)`} />
            <stop offset="38%" stopColor={paper} />
            <stop offset="70%" stopColor={`color-mix(in srgb, ${paper} 74%, black)`} />
            <stop offset="100%" stopColor={`color-mix(in srgb, ${paper} 46%, black)`} />
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
