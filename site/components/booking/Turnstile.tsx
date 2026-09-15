"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile, the bot check on the booking form and the booking lookup.
 *
 * `interaction-only`: most visitors never see it. It shows itself only when
 * Cloudflare wants a click, so it costs the page nothing in the common case.
 *
 * The site key comes from NEXT_PUBLIC_TURNSTILE_SITE_KEY (inlined at build).
 * Outside production, Cloudflare's always-pass test key stands in, matching the
 * test secret in lib/turnstile.ts. Production with no key renders nothing and the
 * server refuses the request, which is the intended failure: no bot check, no
 * bookings.
 */

const TEST_SITE_KEY = "1x00000000000000000000AA";
const SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
  (process.env.NODE_ENV === "production" ? "" : TEST_SITE_KEY);

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | null = null;

function load(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
      s.onerror = () => {
        loading = null;
        reject(new Error("turnstile failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export function Turnstile({
  onToken,
  resetKey = 0,
  theme = "light",
  className = "",
}: {
  /** Called with a fresh token, or null when it expires or errors. */
  onToken: (token: string | null) => void;
  /** Change this to force a new challenge, e.g. after a failed submit (tokens are single-use). */
  resetKey?: number;
  theme?: "light" | "dark";
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  useEffect(() => {
    cb.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!SITE_KEY || !el.current) return;
    let id: string | null = null;
    let cancelled = false;
    load()
      .then((ts) => {
        if (cancelled || !el.current) return;
        id = ts.render(el.current, {
          sitekey: SITE_KEY,
          theme,
          appearance: "interaction-only",
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(null),
          "error-callback": () => cb.current(null),
        });
      })
      .catch(() => cb.current(null));
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
      cb.current(null);
    };
  }, [theme, resetKey]);

  return <div ref={el} className={className} />;
}

export const turnstileConfigured = SITE_KEY !== "";
