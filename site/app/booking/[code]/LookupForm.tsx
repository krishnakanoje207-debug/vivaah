"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile } from "@/components/booking/Turnstile";
import { Button } from "@/components/ui/Button";

const FIELD =
  "mt-2 w-full rounded-control border border-porcelain-50/25 bg-transparent px-3 py-2.5 text-porcelain-50 outline-none placeholder:text-porcelain-50/40 focus:border-gold-500";

/**
 * Code + phone, for a customer without her link. The route answers the same
 * 404 for an unknown code and a wrong phone, and so does this form.
 */
export function LookupForm({ code: initial }: { code: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initial);
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("One moment: the check that you are a person has not finished. Try again in a second.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, phone, turnstile: token }),
      });
      const data = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
      if (res.ok && data.code) {
        // The cookie is set; the same address now resolves to the booking. A
        // different code, or a stale ?k= in the address, needs a new address.
        const target = `/booking/${data.code}`;
        if (window.location.pathname + window.location.search === target) router.refresh();
        else router.replace(target);
        return;
      }
      setError(data.message ?? "Something went wrong. Please try again.");
    } catch {
      setError("We could not reach the shop's site. Check your connection and try again.");
    }
    // Tokens are single-use: every failed attempt needs a fresh challenge.
    setToken(null);
    setResetKey((n) => n + 1);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="border-t border-porcelain-50/20 pt-8" noValidate>
      <label htmlFor="lookup-code" className="block text-caption text-violet-300">
        Booking code
      </label>
      <input
        id="lookup-code"
        name="code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="VVH-7K3M"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={12}
        required
        className={`${FIELD} tabular text-h3 tracking-[0.06em]`}
      />

      <label htmlFor="lookup-phone" className="mt-6 block text-caption text-violet-300">
        Phone number you booked with
      </label>
      <div className="relative">
        <span aria-hidden="true" className="tabular pointer-events-none absolute top-1/2 left-3 mt-1 -translate-y-1/2 text-porcelain-50/60">
          +91
        </span>
        <input
          id="lookup-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="98765 43210"
          required
          className={`${FIELD} tabular pl-12`}
        />
      </div>

      <Turnstile onToken={setToken} resetKey={resetKey} theme="dark" className="mt-6" />

      {error && (
        <p role="alert" className="mt-6 border-l border-gold-500 pl-4 text-caption text-porcelain-50">
          {error}
        </p>
      )}

      <div className="mt-8">
        <Button type="submit" variant="primary-dark" disabled={busy}>
          {busy ? "Opening" : "Open the booking"}
        </Button>
      </div>
    </form>
  );
}
