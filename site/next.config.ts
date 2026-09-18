import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// The cache lifetime the public catalogue pages answer with, in place of the
// one Next gives a dynamic render.
//
// Every route here renders per request, because the CSP nonce requires it
// (SECURITY_HARDENING_SPEC S3), and Next answers `revalidate === 0` with
// `private, no-cache, no-store, max-age=0, must-revalidate`
// (next/dist/server/lib/cache-control.js). The `no-store` in that string is
// what switches the back/forward cache off — a browser will not keep a page
// whose main resource carries it — which is the `MainResourceHasCacheControlNoStore`
// Lighthouse reports against `/`.
//
// These pages hold nothing that `no-store` exists to protect: a catalogue, an
// address, three policy pages. `no-cache` keeps the whole of the rest of the
// guarantee — the document may never be reused without revalidating first, and
// `private` keeps it out of every shared cache — so nothing is served staler
// than it is today. Dynamic HTML carries no ETag, so a revalidation is a full
// refetch either way; the only thing that changes is that the browser may
// restore the page it was showing a moment ago. That is the back button in a
// shop where a customer walks into a garment and walks back out.
//
// This is NOT PERF_PLAN 2.8. That item is about serving a CACHED RENDER to a
// visitor who has not seen the page, and it is the owner's to decide because
// the home page's own headline promises the stock changes day to day. Nothing
// here changes what is rendered or how often: every request still goes to Neon.
//
// `/admin/*`, `/reserve` and `/booking/*` are deliberately not in the list and
// keep `no-store`: a session, a name, a phone number.
const PUBLIC_PAGE_CACHE = "private, no-cache, max-age=0, must-revalidate";

// Lower case on purpose, and it is load-bearing. On the Worker a config header
// arrives as an `initialHeaders` entry and is spread over the rendered
// response's own headers at flush time, keyed exactly as written here
// (`OpenNextNodeResponse.flushHeaders`). The response stores its header names
// lower-cased, so `cache-control` overwrites Next's value and `Cache-Control`
// would land beside it as a second, contradictory header.
const cachePublicPage = [{ key: "cache-control", value: PUBLIC_PAGE_CACHE }];

const nextConfig: NextConfig = {
  // Baseline security headers. The Content-Security-Policy is NOT here: it
  // carries a per-request nonce and so is built in middleware.ts, which is also the
  // only place that can mint one (SECURITY_HARDENING_SPEC S3). Setting a second
  // CSP here would be intersected with that one and could only ever subtract
  // from it by accident.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing embeds this site; blocks clickjacking of the admin panel.
          // The modern equivalent is CSP frame-ancestors, which middleware.ts sets;
          // this stays for browsers that only understand the old header.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
      { source: "/", headers: cachePublicPage },
      {
        source: "/:page(rentals|retail|jewellery|visit|policies|privacy)",
        headers: cachePublicPage,
      },
      {
        source: "/:section(rentals|retail|jewellery)/:slug",
        headers: cachePublicPage,
      },
    ];
  },
};

export default nextConfig;

// Makes Cloudflare bindings available in `next dev` (getCloudflareContext).
initOpenNextCloudflareForDev();
