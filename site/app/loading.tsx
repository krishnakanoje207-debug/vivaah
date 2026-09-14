import { LoadingMark } from "@/components/site/LoadingMark";

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
 * The violet ground is kept: both dynamic routes open on violet-950, so this
 * resolves into the real page instead of flashing a different colour at it. A
 * skeleton of grey bars would be a picture of a page the site does not have.
 *
 * What stands on it was a single breathing hairline, and the owner judged it
 * "not good at all" (14 Sep 2026). Seen at production latency it was a dark
 * empty screen for four seconds with a 1px line nobody could find, which reads
 * as a page that failed, not one on its way. It is now the shop's name drawing
 * itself with a stitch running under it: the same mark the first-visit
 * Preloader uses, which picks this one up mid-draw (see Preloader).
 *
 * The height is one screen under the nav, and the mark sits in its centre,
 * which is exactly where the Preloader centres it; `data-vv-loading` is how the
 * Preloader's inline script finds this screen to continue from.
 */
export default function Loading() {
  return (
    <div
      data-vv-loading
      className="flex min-h-[calc(100svh-4rem)] w-full items-center justify-center bg-violet-950"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
      <LoadingMark />
    </div>
  );
}
