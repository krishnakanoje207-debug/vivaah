"use client";

import { useActionState, useEffect, useState } from "react";
import { login, type LoginState } from "./actions";
import { Turnstile, turnstileConfigured } from "@/components/booking/Turnstile";

const field =
  "w-full rounded-control border border-ink-900/20 bg-porcelain-50 px-3 py-2.5 text-body " +
  "text-ink-900 outline-none focus:border-violet-700";
const label = "block text-caption font-medium text-ink-600 mb-1.5";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  // The bot check that stops a script running a password list against this form
  // (SECURITY_HARDENING_SPEC S1a). Nothing is gated on it here: the server
  // refuses a submit with no token and says so, and a sign-in takes long enough
  // to type that the token has normally arrived. Disabling the button while
  // Cloudflare thinks would only make the form look broken.
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  // Turnstile tokens are single-use, so a rejected attempt has to fetch a fresh
  // one. Without this the second try fails the bot check rather than the
  // password, and the form would tell her the wrong thing about why.
  useEffect(() => {
    if (state.error) {
      setToken(null);
      setResetKey((k) => k + 1);
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="username" className={label}>
          Username
        </label>
        <input id="username" name="username" type="text" autoComplete="username" required className={field} />
      </div>
      <div>
        <label htmlFor="password" className={label}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={field}
        />
      </div>

      {turnstileConfigured && (
        <>
          <input type="hidden" name="turnstile" value={token ?? ""} />
          {/* `interaction-only`: this renders nothing at all unless Cloudflare
              decides it wants a click, so the form normally looks unchanged. */}
          <Turnstile onToken={setToken} resetKey={resetKey} className="empty:hidden" />
        </>
      )}

      {state.error && (
        <p role="alert" className="text-caption text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-control bg-violet-800 px-6 py-2.5 text-body font-semibold text-porcelain-50 transition-colors hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
