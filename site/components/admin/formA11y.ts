"use client";

import { useEffect, useRef } from "react";

/**
 * Move focus to the first field the server rejected.
 *
 * LAUNCH_CHECKLIST P2.5. Every admin form already announced its failure in a
 * `role="alert"` paragraph and disabled its button while pending. What none of
 * them did was mark the field or go to it, so someone using a screen reader
 * heard "that is not a whole number" once and then found every input reporting
 * itself as valid, and someone on a long form was left to hunt for the red line
 * themselves. `components/booking/ReserveFlow.tsx` already does this on the
 * public side; this is the same behaviour for the panel.
 *
 * Admin forms submit through `useActionState`, so errors arrive as returned
 * state rather than through a handler we control. That makes "once per failed
 * submit" the whole difficulty, and the obvious answer does not work.
 *
 * THE FIRST VERSION KEYED ON THE STATE OBJECT'S IDENTITY, assuming every submit
 * deserialises a fresh one. `scripts/verify-admin-a11y.mts` caught that it does
 * not: submitting the same bad value twice reached the server both times (the
 * POST count went up) and focus moved only on the first, because the identical
 * action result came back as the SAME object and the check swallowed it. The
 * second rejection was therefore silent, which is precisely the case that
 * someone relying on focus most needs to be told about.
 *
 * `pending` falling from true to false is the honest signal. It does not care
 * what the result looks like, it fires once per completed submit, and two
 * submits returning equal data cannot defeat it. A re-render for any other
 * reason — typing, a sibling form on the same page saving — does not flip it,
 * so the caret is never yanked out of whatever she is in the middle of.
 *
 * `order` is the field order as the form reads on screen, so the first error is
 * the topmost one rather than whichever the server happened to check first. It
 * must be a module constant or memoised.
 */
export function useFocusFirstError(
  fieldErrors: Record<string, string> | undefined,
  order: readonly string[],
  pending: boolean,
): void {
  const wasPending = useRef(false);

  useEffect(() => {
    const justFinished = wasPending.current && !pending;
    wasPending.current = pending;
    if (!justFinished || !fieldErrors) return;
    const first = order.find((name) => fieldErrors[name]);
    if (!first) return;
    // The id is the field name throughout the panel; a group error (a radio set,
    // the spin fields) points at its fieldset, which carries the same id.
    document.getElementById(first)?.focus();
  }, [pending, fieldErrors, order]);
}

/**
 * The ids a field hands to `aria-describedby`: its hint, if it has one, and its
 * error, if it is carrying one. Returns undefined rather than an empty string
 * when there is neither, because `aria-describedby=""` points at nothing and
 * some screen readers announce the failure to resolve it.
 */
export function describedBy(name: string, hasHint: boolean, hasError: boolean): string | undefined {
  const ids = [hasHint ? `${name}-hint` : null, hasError ? `${name}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}
