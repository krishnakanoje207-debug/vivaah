/**
 * What the browser is shown while a page waits on the database.
 *
 * Measured before this existed: 3,875ms TTFB on the front door, and every one
 * of those milliseconds was a blank window. `/` and `/rentals` are
 * `force-dynamic` and await Neon before returning any HTML, and with no
 * `loading.tsx` anywhere in the app Next had nothing to send in the meantime.
 * This makes the document stream: the shell goes out immediately and the page
 * replaces this when its query lands.
 *
 * It is the violet ground and nothing else, on purpose. Both dynamic routes
 * open on violet-950 — the home hero and the rentals threshold — and the home
 * page's own Preloader draws on that same ground, so this resolves into the
 * real page instead of flashing a different colour at it. A skeleton of grey
 * bars would be a picture of a page the site does not have.
 */
export default function Loading() {
  return (
    <div
      className="flex min-h-[100svh] w-full items-center justify-center bg-violet-950"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
      {/* A single hairline, drawn in the gold the site uses for its ornament.
          It breathes rather than spins: a spinner is a unit of anxiety, and
          this is usually on screen for well under a second. */}
      <span
        aria-hidden="true"
        className="h-px w-24 origin-center animate-pulse bg-gold-500/50"
      />
    </div>
  );
}
