import type { ReactNode } from "react";

/**
 * A drawn gold keyline frame for a photograph.
 *
 * Two hairlines and four corner brackets, nothing else. It is the restrained
 * half of the owner's two frame references (9 Sep 2026): a fine keyline reads as
 * a mount around a plate, while a baroque filigree frame would fight the palette
 * (v2 §1 allows gold at most ~2% of the surface), fight the brief's "subtle yet
 * extremely beautiful, unmistakably non-template", and read as clip art at the
 * sizes this site actually uses.
 *
 * The bracket is a jharokha corner, not a Greek key: the same arch the site
 * already uses as its signature (v2 §3b), turned into a corner. Drawn, so there
 * is no asset to license, nothing to download, and it stays crisp at any size.
 *
 * The hairlines stretch with the box; the brackets never do, because they are
 * fixed-size SVGs pinned to the corners. A stretched corner is the tell that
 * gives away a frame made from one scaled image.
 *
 * Deliberately NOT applied to every image. It marks a plate the page is asking
 * you to look at, and it stops meaning that if everything wears one.
 */

const BRACKET = 26; // px, fixed at every size

function Corner({
  className,
  tone,
}: {
  className: string;
  tone: "light" | "dark";
}) {
  const stroke = tone === "dark" ? "var(--color-gold-500)" : "var(--color-gold-600)";
  return (
    <svg
      width={BRACKET}
      height={BRACKET}
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
      className={`absolute ${className}`}
    >
      {/* The arch's shoulder, turned into a corner: a right angle that lifts
          into a quarter curve instead of meeting square. */}
      <path
        d="M0 26 L0 9 C0 4 4 0 9 0 L26 0"
        stroke={stroke}
        strokeWidth="1"
        strokeLinecap="square"
      />
      <path
        d="M6 26 L6 12 C6 8.7 8.7 6 12 6 L26 6"
        stroke={stroke}
        strokeWidth="1"
        strokeOpacity="0.45"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function GoldFrame({
  children,
  tone = "light",
  className = "",
}: {
  children: ReactNode;
  /** `dark` switches to gold-500, the on-dark half of the approved pair. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const line = tone === "dark" ? "border-gold-500/45" : "border-gold-600/40";
  const faint = tone === "dark" ? "border-gold-500/20" : "border-gold-600/20";

  return (
    <div className={`relative ${className}`}>
      {children}

      {/* Both hairlines sit inside the plate, so the frame never changes the
          box's footprint and never shifts the layout. */}
      <div className={`pointer-events-none absolute inset-3 border ${line}`} aria-hidden="true" />
      <div className={`pointer-events-none absolute inset-[1.125rem] border ${faint}`} aria-hidden="true" />

      <div className="pointer-events-none absolute inset-3" aria-hidden="true">
        {/* The path is authored as a top-left corner; the other three are it,
            turned. Rotation is about each square's own centre, so a bracket
            pinned to a corner stays pinned. */}
        <Corner tone={tone} className="left-0 top-0" />
        <Corner tone={tone} className="right-0 top-0 rotate-90" />
        <Corner tone={tone} className="bottom-0 right-0 rotate-180" />
        <Corner tone={tone} className="bottom-0 left-0 -rotate-90" />
      </div>
    </div>
  );
}
