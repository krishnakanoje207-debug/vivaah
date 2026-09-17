"use client";

import { useActionState } from "react";
import Link from "next/link";
import { formatTime } from "@/lib/bookingRules";
import { cancelNoAnswer, type ActionState } from "./bookings/actions";

export type DueSoon = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  pickup_time: string | null;
  has_retail: boolean;
  has_rental: boolean;
};

/**
 * Who to ring today, and the button for when nobody answers.
 *
 * specs/RETAIL_SPEC.md R2: the shop calls about two hours before a collection,
 * and if it cannot reach her the reservation is off. That is a human process,
 * not a job — nothing cancels on a timer — so what this gives her is the list,
 * the number under her thumb, and one press to record the outcome she actually
 * gets. "No answer" cancels the booking with that reason, which also releases
 * whatever it was holding: the dates through the item trigger, and a retail
 * piece's count through the stock trigger.
 *
 * Client only for the form state on that one button; the list itself is served.
 */
export function CallList({ items }: { items: DueSoon[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-h3 text-ink-900">Coming in today</h2>
      <p className="mt-1 text-caption text-ink-600">
        Ring about two hours before. No answer cancels the booking and puts the pieces back.
      </p>

      <ul className="mt-4 divide-y divide-ink-900/10 overflow-hidden rounded-card border border-ink-900/10 bg-white shadow-card">
        {items.map((b) => (
          <Row key={b.id} b={b} />
        ))}
      </ul>
    </section>
  );
}

function Row({ b }: { b: DueSoon }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(cancelNoAnswer, {});
  const digits = b.phone.replace(/[^\d]/g, "");
  // Rental and retail in one booking is allowed, and the wording has to cover
  // it rather than pick one: she is doing both in the same visit.
  const kind =
    b.has_retail && b.has_rental ? "Renting and buying" : b.has_retail ? "Buying" : "Renting";

  return (
    <li className="px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/admin/bookings/${b.id}`} className="tabular font-medium text-ink-900 hover:underline">
              {b.code}
            </Link>
            <span className="tabular text-caption text-ink-900">
              {b.pickup_time ? formatTime(b.pickup_time) : "No time set"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-caption text-ink-600">
            {b.customer_name} · {kind}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${digits}`}
            className="rounded-control border border-ink-900/15 px-3 py-2 text-caption text-ink-900 hover:border-violet-300"
          >
            Call
          </a>
          <a
            href={`https://wa.me/91${digits.slice(-10)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-control border border-ink-900/15 px-3 py-2 text-caption text-ink-900 hover:border-violet-300"
          >
            WhatsApp
          </a>
          <form action={action}>
            <input type="hidden" name="id" value={b.id} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-control border border-danger/40 px-3 py-2 text-caption text-danger hover:bg-danger/5 disabled:opacity-60"
            >
              {pending ? "Cancelling" : "No answer"}
            </button>
          </form>
        </div>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-caption text-danger">
          {state.error}
        </p>
      )}
    </li>
  );
}
