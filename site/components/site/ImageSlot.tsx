/**
 * A photograph that has not arrived yet.
 *
 * Every picture on the landing page is a slot with a known size, and this draws
 * the slot: the same box the photograph will occupy, ruled rather than filled,
 * with the exact file size to supply written inside it. The layout is therefore
 * final before the photography is, and swapping a slot for its picture is a
 * one-line change that cannot shift anything around it.
 *
 * `w` and `h` are the pixel dimensions the owner is making the file at, already
 * doubled for retina; the box takes its aspect from them, so a slot can never
 * disagree with the file that fills it.
 */
export function ImageSlot({
  label,
  w,
  h,
  className = "",
  tone = "light",
  compact = false,
}: {
  /** What this picture is of, in the owner's words. */
  label: string;
  w: number;
  h: number;
  className?: string;
  /** `dark` when the slot sits on a violet ground. */
  tone?: "light" | "dark";
  /** Too small to carry its own caption: draw the box, say nothing. */
  compact?: boolean;
}) {
  const skin =
    tone === "dark"
      ? "border-porcelain-50/35 bg-violet-900 text-porcelain-50"
      : "border-ink-900/25 bg-porcelain-200 text-ink-900";

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 border border-dashed p-4 text-center ${skin} ${className}`}
      style={{ aspectRatio: `${w} / ${h}` }}
      title={compact ? `${label} — ${w} x ${h}` : undefined}
    >
      {!compact && (
        <>
          <span className="text-caption">{label}</span>
          <span className="tabular text-caption opacity-80">
            {w} &times; {h}
          </span>
        </>
      )}
    </div>
  );
}
