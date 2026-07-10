// Gold hairline with a centred ✦ — the recurring seam motif (§5).
export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`ornament ${className}`} aria-hidden="true">
      <span className="text-[0.7rem] leading-none">✦</span>
    </div>
  );
}
