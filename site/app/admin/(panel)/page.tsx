const CARDS = ["Bookings", "Products", "Content", "Settings"] as const;

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="font-display text-h2 text-ink-900">Dashboard</h1>
      <p className="mt-2 text-body text-ink-600">
        Bookings, products, content and settings — coming in this build.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CARDS.map((title) => (
          <div key={title} className="rounded-card border border-ink-900/10 bg-white p-6 shadow-card">
            <h2 className="font-display text-h3 text-ink-900">{title}</h2>
            <p className="mt-1 text-caption text-ink-400">Placeholder</p>
          </div>
        ))}
      </div>
    </div>
  );
}
