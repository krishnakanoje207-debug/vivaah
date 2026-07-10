// Rating as gold diamond marks (✦ filled / ✧ empty) — never yellow stars (§6).
export function ReviewStars({ rating, className = "" }: { rating: number; className?: string }) {
  const filled = Math.round(rating);
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-gold-600 ${className}`}
      role="img"
      aria-label={`${rating} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} aria-hidden="true" className="text-[0.85em] leading-none">
          {i < filled ? "✦" : <span className="text-ink-400">✧</span>}
        </span>
      ))}
    </span>
  );
}
