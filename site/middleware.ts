import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/adminAuth";

/**
 * Runs before every HTML route. Two jobs, and they are unrelated to each other.
 *
 * WHY THIS IS STILL `middleware.ts`, WHICH NEXT 16 DEPRECATES. The build prints
 * a notice on every run telling us to rename this to `proxy.ts`, and that was
 * tried. Next's own docs settle it against us: "Proxy defaults to using the
 * Node.js runtime. The `runtime` config option is not available in Proxy files"
 * (03-file-conventions/proxy.md). Renaming therefore moves this file off the
 * Edge runtime, and the Cloudflare adapter answers that with "Node.js
 * middleware support is experimental in cloudflare, and not officially
 * maintained by OpenNext maintainers. Use at your own risk."
 *
 * This file carries the admin redirect and the security policy. An experimental
 * adapter path is not where either belongs, and this project has already been
 * bitten once by a Next/OpenNext runtime mismatch (Turbopack builds, see
 * CLAUDE.md). The deprecation is a warning, not a removal, so we take the
 * warning and keep the supported runtime. Revisit when opennextjs-cloudflare
 * supports Node middleware properly, or when Next actually removes this
 * convention — whichever comes first.
 *
 * 1. THE CONTENT SECURITY POLICY (specs/SECURITY_HARDENING_SPEC.md S3).
 *    Until now the policy was `frame-ancestors 'self'` and nothing else, so any
 *    injected script ran: a stored XSS in a product name, a review, or an
 *    owner-edited block would execute with the run of the site, and the admin
 *    session is same-origin.
 *
 *    It has to be a nonce. The alternative considered was hashing the one inline
 *    script this site writes, which would have kept every page static, but the
 *    rendered document carries about thirty more inline scripts that are Next's
 *    own streaming payload (`self.__next_f.push(...)`), and their content
 *    changes per page and per build. There is nothing to hash.
 *
 *    A nonce is minted per request here and Next reads it back out of this
 *    header to stamp its own scripts. `'strict-dynamic'` then lets those trusted
 *    scripts load the ones they need — which is how Turnstile, injected by our
 *    own client code, is allowed without trusting its origin by name.
 *
 *    The cost is that a nonce cannot be baked into a prerendered page, so every
 *    route renders per request. Measured against the route table before doing
 *    it: only `/policies`, `/visit` and the 404 were static, none of them touch
 *    the database, and everything else was already dynamic. That is the whole
 *    bill.
 *
 * 2. THE ADMIN REDIRECT, which used to be this file's only job and is now
 *    scoped explicitly to `/admin`, because the matcher below had to widen to
 *    every route to carry the policy. Without that guard clause every page on
 *    the site would redirect to the login form.
 *
 *    It stays a signature-and-expiry check only. Whether a session has been
 *    revoked needs a query, and this runs on the Edge in front of everything;
 *    that check lives in `requireAdmin()` and the (panel) layout instead. This
 *    is also the layer that had the bypass CVE patched on 10 September, which is
 *    a reason to let it decide less rather than more.
 */
export async function middleware(req: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const nonce = btoa(crypto.randomUUID());

  const csp = [
    `default-src 'self'`,
    // 'strict-dynamic' makes browsers ignore host allowlists here and trust only
    // what a nonced script loads. 'self' is kept for browsers that do not
    // implement it. 'unsafe-eval' is React's dev-only error reconstruction.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // 'unsafe-inline' deliberately, and only for styles. The site renders inline
    // `style` ATTRIBUTES throughout — the hero scrim, the preloader, the `--i`
    // stagger the performance pass introduced — and a nonce cannot authorise an
    // attribute. script-src is where injection becomes code execution, and that
    // is the one being closed.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    // Turnstile verifies over its own origin; ws: is the dev server's HMR socket.
    `connect-src 'self' https://challenges.cloudflare.com${isDev ? " ws: wss:" : ""}`,
    // Turnstile's challenge frame, and the Google Maps embed on the front page
    // (which only renders once the owner's real address is in).
    `frame-src https://challenges.cloudflare.com https://maps.google.com https://www.google.com`,
    // Turnstile runs its work in a blob: worker.
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'self'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  // Next parses the nonce back out of the REQUEST header to stamp its own
  // scripts, so it has to be set on both sides.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  if (req.nextUrl.pathname.startsWith("/admin") && req.nextUrl.pathname !== "/admin/login") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!(await verifySession(token))) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    // Everything that renders a document. Static assets and API routes are left
    // out: neither executes a script in a page context, and the policy would be
    // dead weight on them. Prefetches are skipped so the router does not cache a
    // document stamped with a nonce that will not match the next request.
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:webp|jpg|jpeg|png|svg|ico|mp4|webm|woff2)).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    // Admin is matched unconditionally, prefetch included: the redirect above is
    // a guard, and a guard that a prefetch header can skip is not one.
    "/admin/:path*",
  ],
};
