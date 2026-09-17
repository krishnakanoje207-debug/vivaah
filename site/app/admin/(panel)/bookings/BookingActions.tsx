"use client";

// The interactive transition controls for the detail page. Kept minimal: a
// primary one-tap button per status, plus an arm-then-fire button for the
// destructive moves (decline, cancel). Errors from the guarded server actions
// render inline — no toast system in this build.
import { useActionState, useState } from "react";
import {
  approveExtensionRequest,
  cancelConfirmed,
  confirmBooking,
  declineBooking,
  markPickedUp,
  markReturned,
  rejectExtensionRequest,
  reviveBooking,
  type ActionState,
} from "./actions";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const INITIAL: ActionState = {};

const PRIMARY_BTN =
  "w-full rounded-control bg-violet-800 px-4 py-2.5 text-body text-porcelain-50 transition-colors hover:bg-violet-700 disabled:opacity-60";

const SECONDARY_BTN =
  "w-full rounded-control border border-ink-900/20 px-4 py-2.5 text-body text-ink-600 transition-colors hover:border-ink-900/40 disabled:opacity-60";

function ActionError({ state }: { state: ActionState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="mt-2 text-caption text-danger">
      {state.error}
    </p>
  );
}

// One-tap transition. `request` is set only for extension decisions.
function TransitionButton({
  action,
  id,
  request,
  label,
  busyLabel,
  className = PRIMARY_BTN,
}: {
  action: Action;
  id: string;
  request?: string;
  label: string;
  busyLabel: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  return (
    <div className="flex-1">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        {request && <input type="hidden" name="request" value={request} />}
        <button type="submit" disabled={pending} className={className}>
          {pending ? busyLabel : label}
        </button>
      </form>
      <ActionError state={state} />
    </div>
  );
}

// Decline and cancel are destructive → arm-then-confirm to avoid a fat-finger.
function ArmedButton({
  id,
  action,
  label,
  prompt,
  confirmLabel,
  busyLabel,
}: {
  id: string;
  action: Action;
  label: string;
  prompt: string;
  confirmLabel: string;
  busyLabel: string;
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
        {label}
      </button>
    );
  }

  return (
    <div>
      <p className="mb-2 text-caption text-ink-600">{prompt}</p>
      <div className="flex gap-2">
        <form action={formAction} className="flex-1">
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-control bg-danger px-4 py-2.5 text-body text-porcelain-50 transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {pending ? busyLabel : confirmLabel}
          </button>
        </form>
        <button type="button" onClick={() => setArmed(false)} className={`flex-1 ${SECONDARY_BTN}`}>
          Keep it
        </button>
      </div>
      <ActionError state={state} />
    </div>
  );
}

// `collection` is true only when nothing in the booking is rented: picked up
// then means collected and paid for at the counter, and it is the end of the
// booking, so the return has to be off the table (RETAIL_SPEC §2). A mixed
// booking still returns its rental, and keeps the button.
export function BookingActions({
  id,
  status,
  collection,
}: {
  id: string;
  status: string;
  collection: boolean;
}) {
  if (status === "pending") {
    return (
      <div className="flex flex-col gap-3">
        <TransitionButton action={confirmBooking} id={id} label="Confirm booking" busyLabel="Confirming…" />
        <ArmedButton
          id={id}
          action={declineBooking}
          label="Decline"
          prompt={`Decline this request? ${
            collection ? "The pieces go back into stock." : "The held dates will be released."
          } Let the customer know.`}
          confirmLabel="Yes, decline"
          busyLabel="Declining…"
        />
      </div>
    );
  }
  if (status === "confirmed") {
    return (
      <div className="flex flex-col gap-3">
        <TransitionButton action={markPickedUp} id={id} label="Mark picked up" busyLabel="Saving…" />
        <ArmedButton
          id={id}
          action={cancelConfirmed}
          label="Cancel booking"
          prompt={
            collection
              ? "Cancel this booking? The pieces go back into stock."
              : "Cancel this booking? The held dates will be released."
          }
          confirmLabel="Yes, cancel"
          busyLabel="Cancelling…"
        />
      </div>
    );
  }
  if (status === "picked_up") {
    if (collection) return null;
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

export function ExtensionDecision({ id, request }: { id: string; request: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <TransitionButton
        action={approveExtensionRequest}
        id={id}
        request={request}
        label="Approve"
        busyLabel="Approving…"
      />
      <TransitionButton
        action={rejectExtensionRequest}
        id={id}
        request={request}
        label="Reject"
        busyLabel="Rejecting…"
        className={SECONDARY_BTN}
      />
    </div>
  );
}
