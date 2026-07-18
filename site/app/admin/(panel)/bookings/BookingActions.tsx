"use client";

// The interactive transition controls for the detail page. Kept minimal: a
// primary one-tap button per status, plus a confirm-on-tap Cancel (destructive,
// so it arms before it fires). Errors from the guarded server actions render
// inline — no toast system in this build.
import { useActionState, useState } from "react";
import {
  cancelBooking,
  cancelConfirmed,
  markPickedUp,
  markReturned,
  reviveBooking,
  verifyPayment,
  type ActionState,
} from "./actions";

const INITIAL: ActionState = {};

const PRIMARY_BTN =
  "w-full rounded-control bg-violet-800 px-4 py-2.5 text-body text-porcelain-50 transition-colors hover:bg-violet-700 disabled:opacity-60";

function ActionError({ state }: { state: ActionState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="mt-2 text-caption text-danger">
      {state.error}
    </p>
  );
}

// One-tap forward transition (verify / pickup / return).
function TransitionButton({
  action,
  id,
  label,
  busyLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  id: string;
  label: string;
  busyLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={pending} className={PRIMARY_BTN}>
          {pending ? busyLabel : label}
        </button>
      </form>
      <ActionError state={state} />
    </div>
  );
}

// Cancel is destructive → arm-then-confirm to avoid a fat-finger reject. The
// action differs by source status (pending vs confirmed) but the UX is identical.
function CancelButton({
  id,
  action,
}: {
  id: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="w-full rounded-control border border-danger/40 px-4 py-2.5 text-body text-danger transition-colors hover:bg-danger/5"
      >
        Cancel booking
      </button>
    );
  }

  return (
    <div>
      <p className="mb-2 text-caption text-ink-600">
        Cancel this booking? The held dates will be released.
      </p>
      <div className="flex gap-2">
        <form action={formAction} className="flex-1">
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-control bg-danger px-4 py-2.5 text-body text-porcelain-50 transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Cancelling…" : "Yes, cancel"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="flex-1 rounded-control border border-ink-900/20 px-4 py-2.5 text-body text-ink-600 transition-colors hover:border-ink-900/40"
        >
          Keep it
        </button>
      </div>
      <ActionError state={state} />
    </div>
  );
}

export function BookingActions({ id, status }: { id: string; status: string }) {
  if (status === "pending") {
    return (
      <div className="flex flex-col gap-3">
        <TransitionButton
          action={verifyPayment}
          id={id}
          label="Mark payment verified"
          busyLabel="Verifying…"
        />
        <CancelButton id={id} action={cancelBooking} />
      </div>
    );
  }
  if (status === "confirmed") {
    return (
      <div className="flex flex-col gap-3">
        <TransitionButton action={markPickedUp} id={id} label="Mark picked up" busyLabel="Saving…" />
        <CancelButton id={id} action={cancelConfirmed} />
      </div>
    );
  }
  if (status === "picked_up") {
    return (
      <TransitionButton action={markReturned} id={id} label="Mark returned" busyLabel="Saving…" />
    );
  }
  if (status === "cancelled") {
    return (
      <TransitionButton action={reviveBooking} id={id} label="Revive booking" busyLabel="Reviving…" />
    );
  }
  return null; // returned is terminal
}
