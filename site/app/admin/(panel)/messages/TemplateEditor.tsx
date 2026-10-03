"use client";

import { useActionState, useState } from "react";
import { PLACEHOLDERS, SLOTS, fill, render, type Place, type Template } from "@/lib/comms/messages";
import { describedBy, useFocusFirstError } from "@/components/admin/formA11y";
import { saveTemplate, type TemplateState } from "./actions";
import type { Sample } from "./samples";

const field =
  "w-full rounded-control border border-ink-900/20 bg-porcelain-50 px-3 py-2.5 text-body " +
  "text-ink-900 outline-none focus:border-violet-700";
const labelCls = "block text-caption font-medium text-ink-600 mb-1.5";
const card = "rounded-card border border-ink-900/10 bg-white p-6 shadow-card sm:p-7";

// Reading order, for the focus hook (P2.5). A module constant, as the hook asks.
const ORDER = ["subject", "text"] as const;

// Nothing here is sent for a one-day collection: extensions are a rental's, and
// the return reminder only goes to a basket with something to bring back.
const RENTAL_ONLY = new Set(["extension.requested", "extension.approved", "extension.rejected", "reminder.return"]);

export function TemplateEditor({
  id,
  initial,
  saved,
  samples,
  place,
}: {
  id: string;
  initial: Template;
  saved: boolean;
  samples: Sample[];
  place: Place;
}) {
  const slot = SLOTS.find((s) => s.id === id)!;
  // Controlled on purpose: React 19 resets an uncontrolled `<form action>` even
  // when the action refused the save, which would throw away what she typed
  // (LAUNCH_CHECKLIST item 13, and SettingsForms.tsx for the whole story).
  const [subject, setSubject] = useState(initial.subject);
  const [text, setText] = useState(initial.text);
  const [state, action, pending] = useActionState<TemplateState, FormData>(async (prev, form) => {
    const next = await saveTemplate(prev, form);
    if (next.reverted) {
      setSubject(slot.builtIn.subject);
      setText(slot.builtIn.text);
    }
    return next;
  }, {});
  const fe = state.fieldErrors ?? {};
  useFocusFirstError(state.fieldErrors, ORDER, pending);

  const choices = RENTAL_ONLY.has(slot.kind) ? samples.slice(0, 1) : samples;
  const [which, setWhich] = useState(0);
  const sample = choices[which] ?? choices[0];
  const preview = render({ subject, text }, fill(slot.who, slot.kind, sample.booking, sample.extra, place));

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
      <section className={`${card} lg:col-start-1`} aria-labelledby="wording-heading">
        <h2 id="wording-heading" className="font-display text-h3 text-ink-900">
          Wording
        </h2>
        <form action={action} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="id" value={slot.id} />
          <div>
            <label htmlFor="subject" className={labelCls}>
              Subject
            </label>
            <input
              id="subject"
              name="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              aria-invalid={!!fe.subject}
              aria-describedby={describedBy("subject", true, !!fe.subject)}
              className={field}
            />
            <p id="subject-hint" className="mt-1 text-caption text-ink-600">
              One line. A placeholder that can be empty cannot go here.
            </p>
            {fe.subject && (
              <p id="subject-error" role="alert" className="mt-1 text-caption text-danger">
                {fe.subject}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="text" className={labelCls}>
              Message
            </label>
            <textarea
              id="text"
              name="text"
              rows={14}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={!!fe.text}
              aria-describedby={describedBy("text", true, !!fe.text)}
              className={`${field} leading-relaxed`}
            />
            <p id="text-hint" className="mt-1 text-caption text-ink-600">
              Put a placeholder in curly brackets, like {"{name}"}, where the booking goes. A line that
              uses a placeholder with nothing in it is left out.
            </p>
            {fe.text && (
              <p id="text-error" role="alert" className="mt-1 text-caption text-danger">
                {fe.text}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={pending}
              className="rounded-control bg-violet-800 px-5 py-2.5 text-body font-semibold text-porcelain-50 transition-colors hover:bg-violet-700 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            {saved && (
              <button
                type="submit"
                name="intent"
                value="revert"
                disabled={pending}
                className="rounded-control border border-ink-900/20 px-5 py-2.5 text-body text-ink-600 transition-colors hover:border-ink-900/40 hover:text-ink-900 disabled:opacity-60"
              >
                Go back to the built-in wording
              </button>
            )}
            {state.ok && (
              <p role="status" className="text-caption text-success">
                {state.reverted ? "Back to the built-in wording." : "Saved."}
              </p>
            )}
            {state.error && (
              <p role="alert" className="text-caption text-danger">
                {state.error}
              </p>
            )}
          </div>
        </form>
      </section>

      <section
        className={`${card} lg:sticky lg:top-6 lg:col-start-2 lg:row-span-3 lg:row-start-1`}
        aria-labelledby="preview-heading"
      >
        <h2 id="preview-heading" className="font-display text-h3 text-ink-900">
          Preview
        </h2>
        <p className="mt-1 text-caption text-ink-600">
          What {slot.who === "customer" ? "she" : "you"} would get for a made-up booking, as you type.
        </p>
        {choices.length > 1 && (
          <fieldset className="mt-4">
            <legend className={labelCls}>Preview for</legend>
            <div className="flex flex-wrap gap-2">
              {choices.map((c, i) => (
                <label
                  key={c.label}
                  className="flex cursor-pointer items-center gap-2 rounded-control border border-ink-900/20 bg-porcelain-50 px-3 py-2 text-caption text-ink-900 has-[:checked]:border-violet-700 has-[:checked]:bg-violet-100"
                >
                  <input
                    type="radio"
                    name="preview-sample"
                    checked={which === i}
                    onChange={() => setWhich(i)}
                    className="accent-violet-800"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="mt-5 rounded-control border border-ink-900/10 bg-porcelain-50 p-4" data-preview>
          <p className="text-caption text-ink-600">Subject</p>
          <p className="mt-0.5 break-words text-body font-semibold text-ink-900" data-preview-subject>
            {preview.subject}
          </p>
          <p
            className="mt-4 whitespace-pre-wrap break-words border-t border-ink-900/10 pt-4 text-body leading-relaxed text-ink-900"
            data-preview-text
          >
            {preview.text}
          </p>
        </div>
      </section>

      <section className={`${card} lg:col-start-1`} aria-labelledby="placeholders-heading">
        <h2 id="placeholders-heading" className="font-display text-h3 text-ink-900">
          Placeholders this message can use
        </h2>
        <dl className="mt-4 flex flex-col gap-3">
          {slot.uses.map((name) => (
            <div key={name} className="border-t border-ink-900/10 pt-3 first:border-t-0 first:pt-0">
              <dt className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-porcelain-200 px-1.5 py-0.5 text-caption text-ink-900">{`{${name}}`}</code>
                {slot.required.includes(name) && (
                  <span className="text-caption font-medium text-violet-800">Has to stay in the message</span>
                )}
              </dt>
              <dd className="mt-1 text-caption text-ink-600">
                {PLACEHOLDERS[name]}
                {slot.optional[name] && ` ${slot.optional[name]} When it is empty, its line is left out.`}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <details className={`${card} lg:col-start-1`}>
        <summary className="cursor-pointer font-display text-h3 text-ink-900">The built-in wording</summary>
        <p className="mt-4 text-caption text-ink-600">Subject</p>
        <p className="mt-0.5 break-words text-body text-ink-900">{slot.builtIn.subject}</p>
        <p className="mt-4 text-caption text-ink-600">Message</p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-body leading-relaxed text-ink-900">
          {slot.builtIn.text}
        </p>
      </details>
    </div>
  );
}
