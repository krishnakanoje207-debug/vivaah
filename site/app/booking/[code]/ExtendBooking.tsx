"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { addDays, formatDay } from "@/lib/bookingRules";
import { formatINR } from "@/lib/format";
import { linkToken } from "./CancelBooking";

type Quote = { ok: true; extraDays: number; charge: number; newReturn: string } | { ok: false; message: string };

const STEP =
  "press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink-900/25 text-ink-900 transition-colors duration-[180ms] hover:border-ink-900/60 disabled:opacity-35 disabled:hover:border-ink-900/25";

/**
 * A later return date, one day at a time rather than a calendar: she is moving
 * one date a few days on, and a stepper cannot pick a day before the current
 * return or past the longest booking. The quote is the server's; the shop still
 * approves, and the exclusion constraint has the last word then.
 */
export function ExtendBooking({
  code,
  ret,
  firstDay,
  maxExtra,
}: {
  code: string;
  ret: string;
  firstDay: string;
  maxExtra: number;
}) {
  const router = useRouter();
  const [extra, setExtra] = useState(1);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState<"quote" | "request" | null>(null);
  const newReturn = addDays(firstDay, extra - 1);

  function move(by: number) {
    setExtra((n) => Math.min(maxExtra, Math.max(1, n + by)));
    setQuote(null);
  }

  async function post(kind: "quote" | "request") {
    setBusy(kind);
    try {
      const res = await fetch(`/api/bookings/${code}/extension`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: linkToken(), newReturn, ...(kind === "quote" ? { quote: true } : {}) }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<Quote> & { message?: string };
      if (res.ok && data.ok) {
        if (kind === "request") {
          router.refresh();
          return;
        }
        setQuote(data as Quote);
      } else {
        setQuote({
          ok: false,
          message:
            data.message ??
            (res.status === 404
              ? "This page could not prove the booking is yours any more. Reload it and try again."
              : "Something went wrong. Please try again."),
        });
      }
    } catch {
      setQuote({ ok: false, message: "We could not reach the shop's site. Check your connection and try again." });
    }
    setBusy(null);
  }

  return (
    <div>
      <p className="mt-4 max-w-[28ch] font-display text-h3 text-ink-900">Ask to bring it back later.</p>
      <p className="mt-3 max-w-[52ch] text-ink-600">The return date is {formatDay(ret)} until the shop agrees a new one.</p>

      <div className="mt-8 flex items-center gap-4 sm:gap-6">
        <button type="button" onClick={() => move(-1)} disabled={extra <= 1 || !!busy} aria-label="One day fewer" className={STEP}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <p aria-live="polite" className="min-w-0 flex-1 text-center sm:flex-none sm:text-left">
          <span className="eyebrow block">New return</span>
          <span className="tabular mt-1 block font-display text-h3 whitespace-nowrap text-ink-900 sm:text-h2">{formatDay(newReturn)}</span>
          <span className="mt-1 block text-caption text-ink-600">
            {extra} more {extra === 1 ? "day" : "days"}
          </span>
        </p>
        <button type="button" onClick={() => move(1)} disabled={extra >= maxExtra || !!busy} aria-label="One day more" className={STEP}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div aria-live="polite">
        {quote?.ok === true && (
          <p className="mt-8 max-w-[52ch] border-l border-gold-600 pl-5 text-ink-900">
            {quote.extraDays} more {quote.extraDays === 1 ? "day" : "days"}.{" "}
            {quote.charge > 0 ? (
              <>
                <span className="tabular font-semibold">₹{formatINR(quote.charge)}</span>, paid at the shop.
              </>
            ) : (
              "The shop will tell you any charge."
            )}
          </p>
        )}
        {quote?.ok === false && (
          <p role="alert" className="mt-8 max-w-[52ch] border-l border-danger pl-5 text-danger">
            {quote.message}
          </p>
        )}
      </div>

      <div className="mt-8">
        {quote?.ok === true ? (
          <Button onClick={() => post("request")} disabled={!!busy}>
            {busy === "request" ? "Asking" : "Ask the shop to extend"}
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => post("quote")} disabled={!!busy}>
            {busy === "quote" ? "Checking" : "Check the dates and charge"}
          </Button>
        )}
      </div>
    </div>
  );
}
