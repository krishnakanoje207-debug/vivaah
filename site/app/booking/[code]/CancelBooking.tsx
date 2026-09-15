"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

// The link token, read back from the address bar at the moment of posting, so
// the server never has to write it into the page. Absent after a code + phone
// lookup, where the cookie is the proof.
export const linkToken = () => new URLSearchParams(window.location.search).get("k") ?? undefined;

/** Two steps: ask, then do. The default focus on the second step is to keep it. */
export function CancelBooking({ code }: { code: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"ask" | "confirm" | "sending">("ask");
  const [error, setError] = useState<string | null>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (step === "confirm") keepRef.current?.focus();
  }, [step]);

  async function cancel() {
    setStep("sending");
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${code}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: linkToken() }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setError(
        data.message ??
          (res.status === 404
            ? "This page could not prove the booking is yours any more. Reload it and try again."
            : "Something went wrong. Please try again."),
      );
    } catch {
      setError("We could not reach the shop's site. Check your connection and try again.");
    }
    setStep("confirm");
  }

  return (
    <div className="mt-8">
      {step === "ask" ? (
        <Button variant="ghost" onClick={() => setStep("confirm")}>
          Cancel this booking
        </Button>
      ) : (
        <div className="border-l border-danger pl-5">
          <p className="max-w-[44ch] text-ink-900">
            Cancel {code}? The dates are released straight away, and the booking cannot be brought back online.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={cancel}
              disabled={step === "sending"}
              className="press inline-flex items-center justify-center rounded-control bg-danger px-6 py-3 text-[0.9375rem] font-semibold text-porcelain-50 transition-opacity duration-[180ms] disabled:opacity-70"
            >
              {step === "sending" ? "Cancelling" : "Yes, cancel it"}
            </button>
            <Button ref={keepRef} variant="ghost" onClick={() => setStep("ask")} disabled={step === "sending"}>
              Keep the booking
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 max-w-[52ch] text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
