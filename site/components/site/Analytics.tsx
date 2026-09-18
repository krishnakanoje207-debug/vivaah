"use client";

import { useEffect } from "react";

/**
 * Cloudflare Web Analytics — LAUNCH_CHECKLIST item 18.
 *
 * Chosen on the owner's decision (18 Sep 2026) out of the providers that clear
 * the two locks this project runs under: free with commercial use permitted
 * (CLAUDE.md), and cookie-light enough that it does not turn the site into a
 * tracking surface. It also adds no new company to `/privacy` clause 04, since
 * Cloudflare already serves the site and runs the bot check, and it sets no
 * cookie and does no fingerprinting, so clause 05 still names two cookies.
 *
 * NEVER RENDER THIS UNGATED. It is mounted inside `<AnalyticsGate>` in
 * `SiteChrome`, which renders nothing until a visitor has actually said yes, so
 * the script cannot reach the DOM before then. That gating is the thing
 * `scripts/verify-analytics.mjs` exists to prove, and it is also what makes the
 * cookie banner honest: item 17 was deliberately unmounted while there was
 * nothing to consent to, and this is what changed that.
 *
 * DARK UNTIL THE OWNER SUPPLIES A TOKEN. The token comes from her Cloudflare
 * dashboard (Web Analytics, add a site, copy the JS snippet's token) and is not
 * a secret — it is served in the page to every visitor. With no token this
 * renders nothing at all, which is the same resting state the comms layer
 * takes: not configured is not the same as broken.
 *
 * It is `NEXT_PUBLIC_*`, so it is INLINED AT BUILD TIME and a new token needs a
 * rebuild and redeploy, not just a `wrangler secret put`. That follows
 * `components/booking/Turnstile.tsx`, and the alternative was rejected on
 * measured grounds: keeping the token in the `settings` table would let her
 * paste it in herself, but reading it in the root layout puts a Neon query on
 * the critical path of every route including `/policies`, `/visit` and the 404,
 * which today touch no database at all. That is the property the cache-header
 * and bfcache work rests on (CLAUDE.md, 18 Sep round two), and it is worth more
 * than saving one redeploy.
 *
 * CSP: the tag is created here rather than rendered as JSX, so it is injected
 * by an already-trusted script and `'strict-dynamic'` admits it without the
 * policy having to name its origin — the same route Turnstile takes. The POST
 * it then makes to cloudflareinsights.com does need naming, and `middleware.ts`
 * names it in `connect-src`.
 */

const TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN || "";
const SRC = "https://static.cloudflareinsights.com/beacon.min.js";

export function Analytics() {
  useEffect(() => {
    if (!TOKEN) return;
    // One tag per document. The gate mounts this once, but a second mount would
    // load a second beacon and count every page view twice.
    if (document.querySelector(`script[src="${SRC}"]`)) return;

    const s = document.createElement("script");
    s.src = SRC;
    s.defer = true;
    s.setAttribute("data-cf-beacon", JSON.stringify({ token: TOKEN }));
    document.head.appendChild(s);

    // Withdrawal removes the tag, which stops the NEXT document from counting.
    // It does not unbind a beacon that has already run in THIS one: nothing
    // short of a reload does, and reloading the page under someone who has just
    // changed a checkbox is worse than the half-second of counting it saves.
    // `/privacy` clause 05 says this in the visitor's own terms rather than
    // implying the withdrawal is instant.
    return () => {
      s.remove();
    };
  }, []);

  return null;
}
