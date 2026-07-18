"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const field =
  "w-full rounded-control border border-ink-900/20 bg-porcelain-50 px-3 py-2.5 text-body " +
  "text-ink-900 outline-none focus:border-violet-700";
const label = "block text-caption font-medium text-ink-600 mb-1.5";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

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
