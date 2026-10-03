"use client";

import { useActionState, useState } from "react";
import type { PickupHours } from "@/lib/bookingRules";
import { describedBy, useFocusFirstError } from "@/components/admin/formA11y";
import {
  saveBookingRules,
  saveShop,
  saveTerms,
  signOutEverywhere,
  type SettingsState,
} from "./actions";

const field =
  "w-full rounded-control border border-ink-900/20 bg-porcelain-50 px-3 py-2.5 text-body " +
  "text-ink-900 outline-none focus:border-violet-700";
const labelCls = "block text-caption font-medium text-ink-600 mb-1.5";

// `id` so the field itself can name this through aria-describedby; without it
// the message is announced once and the input reads as valid (P2.5).
/**
 * Hold a field's value in React rather than in the DOM.
 *
 * React 19 resets an uncontrolled `<form action={serverAction}>` once the
 * action returns, and it does that whether the action SUCCEEDED OR NOT. On a
 * rejected save that threw away everything she had typed and refilled the boxes
 * with the stored values, so "Buffer days must be a whole number" appeared
 * above a field already reading 2 again, and pressing save a second time
 * quietly saved the old value as though nothing had been wrong. Found while
 * building scripts/verify-admin-a11y.mts, which could not resubmit a bad value
 * because the bad value no longer existed.
 *
 * ProductForm never had this: its fields were already controlled.
 */
function useField(initial: string) {
  const [value, setValue] = useState(initial);
  return { value, onChange: (e: { target: { value: string } }) => setValue(e.target.value) };
}

function FieldError({ id, msg }: { id?: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-caption text-danger">
      {msg}
    </p>
  );
}

function Feedback({ state }: { state: SettingsState }) {
  if (state.ok) {
    return (
      <p role="status" className="text-caption text-success">
        Saved.
      </p>
    );
  }
  if (state.error) {
    return (
      <p role="alert" className="text-caption text-danger">
        {state.error}
      </p>
    );
  }
  return null;
}

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-violet-800 px-5 py-2.5 text-body font-semibold text-porcelain-50 transition-colors hover:bg-violet-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-ink-900/10 bg-white p-6 shadow-card sm:p-7">
      <h2 className="font-display text-h3 text-ink-900">{title}</h2>
      {caption && <p className="mt-1 text-caption text-ink-400">{caption}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

// Field order as each form reads on screen (P2.5): the hook focuses the first
// error in THIS order, not whichever the server happened to check first.
// Module constants, because a fresh array each render would defeat the hook's
// once-per-submit identity check.
const RULES_ORDER = [
  "buffer_days",
  "confirm_within_hours",
  "cancel_cutoff_hours",
  "sms_daily_quota",
  "open",
  "close",
  "step_minutes",
  "closed_weekdays",
] as const;
const SHOP_ORDER = [
  "address",
  "maps_url",
  "hours",
  "town",
  "getting_here",
  "why_back",
  "purchase_price",
  "retention",
] as const;

const TERMS_ORDER = ["terms_extensions", "terms_damage", "terms_pickup", "terms_charges"] as const;

type BookingRules = {
  buffer_days: number;
  confirm_within_hours: number;
  cancel_cutoff_hours: number;
  pickup_hours: PickupHours;
  sms_daily_quota: number;
};
type ShopInfo = Record<(typeof SHOP_ORDER)[number], string>;
type Terms = Record<(typeof TERMS_ORDER)[number], string>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // index = 0..6, 0 = Sunday

function NumberField({
  name,
  label,
  hint,
  value,
  error,
}: {
  name: string;
  label: string;
  hint: string;
  value: number;
  error?: string;
}) {
  const field_ = useField(String(value));
  return (
    <div>
      <label htmlFor={name} className={labelCls}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        inputMode="numeric"
        {...field_}
        aria-invalid={!!error}
        aria-describedby={describedBy(name, true, !!error)}
        className={field}
      />
      <p id={`${name}-hint`} className="mt-1 text-caption text-ink-400">
        {hint}
      </p>
      <FieldError id={`${name}-error`} msg={error} />
    </div>
  );
}

export function BookingRulesForm({ initial }: { initial: BookingRules }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveBookingRules, {});
  const fe = state.fieldErrors ?? {};
  useFocusFirstError(state.fieldErrors, RULES_ORDER, pending);
  const hours = initial.pickup_hours;
  // Controlled for the same reason as NumberField: a rejected save must not
  // discard what she typed.
  const open = useField(hours.open);
  const close = useField(hours.close);
  const step = useField(String(hours.step_minutes));
  return (
    <Section
      title="Booking rules"
      caption="How long a request holds its dates, when customers can cancel, and when they can collect."
    >
      <form action={action} className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            name="buffer_days"
            label="Buffer days"
            hint="Free days after each return, 0 to 14."
            value={initial.buffer_days}
            error={fe.buffer_days}
          />
          <NumberField
            name="confirm_within_hours"
            label="Confirm within (hours)"
            hint="An unconfirmed request lapses after this, or at its pickup time if sooner."
            value={initial.confirm_within_hours}
            error={fe.confirm_within_hours}
          />
          <NumberField
            name="cancel_cutoff_hours"
            label="Cancel cutoff (hours)"
            hint="Customers can cancel online until this long before pickup, 0 to 72."
            value={initial.cancel_cutoff_hours}
            error={fe.cancel_cutoff_hours}
          />
        </div>

        <fieldset className="flex flex-col gap-4 border-t border-ink-900/10 pt-5">
          <legend className="float-left mb-1 w-full font-display text-body text-ink-900">Pickup hours</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="open" className={labelCls}>
                Opens
              </label>
              <input
                id="open"
                name="open"
                type="time"
                {...open}
                aria-invalid={!!fe.open}
                aria-describedby={describedBy("open", false, !!fe.open)}
                className={field}
              />
              <FieldError id="open-error" msg={fe.open} />
            </div>
            <div>
              <label htmlFor="close" className={labelCls}>
                Closes
              </label>
              <input
                id="close"
                name="close"
                type="time"
                {...close}
                aria-invalid={!!fe.close}
                aria-describedby={describedBy("close", false, !!fe.close)}
                className={field}
              />
              <FieldError id="close-error" msg={fe.close} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="step_minutes" className={labelCls}>
                Slot length
              </label>
              <select
                id="step_minutes"
                name="step_minutes"
                {...step}
                aria-invalid={!!fe.step_minutes}
                aria-describedby={describedBy("step_minutes", false, !!fe.step_minutes)}
                className={field}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
              </select>
              <FieldError id="step_minutes-error" msg={fe.step_minutes} />
            </div>
          </div>
          {/* A group error: no single checkbox owns "closed on", so the
              fieldset carries the description and takes focus. tabIndex -1
              makes it focusable by script without putting it in the tab order,
              so the hook can land here and a screen reader reads the legend and
              the message together. */}
          <fieldset
            id="closed_weekdays"
            tabIndex={-1}
            aria-invalid={!!fe.closed_weekdays}
            aria-describedby={describedBy("closed_weekdays", false, !!fe.closed_weekdays)}
          >
            <legend className={labelCls}>Closed on</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day, i) => (
                <label
                  key={day}
                  className="flex cursor-pointer items-center gap-2 rounded-control border border-ink-900/20 bg-porcelain-50 px-3 py-2 text-body text-ink-900 has-[:checked]:border-violet-700 has-[:checked]:bg-violet-100"
                >
                  <input
                    type="checkbox"
                    name="closed_weekdays"
                    value={i}
                    defaultChecked={hours.closed_weekdays.includes(i)}
                    className="accent-violet-800"
                  />
                  {day}
                </label>
              ))}
            </div>
            <p className="mt-1 text-caption text-ink-400">
              The last pickup slot starts before closing time. Customers cannot pick up on closed days.
            </p>
            <FieldError id="closed_weekdays-error" msg={fe.closed_weekdays} />
          </fieldset>
        </fieldset>

        <div className="grid gap-4 border-t border-ink-900/10 pt-5 sm:grid-cols-3">
          <NumberField
            name="sms_daily_quota"
            label="SMS daily quota"
            hint="Messages the shop phone may send per day."
            value={initial.sms_daily_quota}
            error={fe.sms_daily_quota}
          />
        </div>

        <div className="flex items-center gap-4">
          <SaveButton pending={pending} />
          <Feedback state={state} />
        </div>
      </form>
    </Section>
  );
}

// What each shop field is for, in her words, and where it shows. One row per
// field, rendered by ShopField, so every one gets the same label, hint, error
// and a11y wiring.
const SHOP_FIELDS: {
  name: (typeof SHOP_ORDER)[number];
  label: string;
  hint: string;
  long?: boolean;
  numeric?: boolean;
}[] = [
  {
    name: "address",
    label: "Address",
    hint: "Shown in the footer of every page, on Visit us and in her booking. Once it is set, the front page shows a map of it.",
  },
  {
    name: "maps_url",
    label: "Google Maps link",
    hint: "Where “Get directions” goes. In Google Maps, press Share and paste the link. Leave empty to search the address.",
  },
  { name: "hours", label: "Opening hours", hint: "For example: Mon to Sat, 11am to 8pm." },
  { name: "town", label: "The town", hint: "Shown on the front page, Shop and Visit us. Hidden while empty." },
  {
    name: "getting_here",
    label: "Getting here",
    hint: "The nearest landmark and where to park, on Visit us. Hidden while empty.",
    long: true,
  },
  {
    name: "why_back",
    label: "Why people come back",
    hint: "One or two sentences, on the front page. Hidden while empty.",
    long: true,
  },
  {
    name: "purchase_price",
    label: "Price to buy a bridal lehenga (₹)",
    hint: "The “To buy” figure on Rent, set against what renting costs. Empty uses ₹80,000.",
    numeric: true,
  },
  {
    name: "retention",
    label: "How long you keep a finished booking",
    hint: "For example: one year. Shown on the privacy page; while empty it says no period is set yet.",
  },
];

function ShopField({
  spec,
  value,
  onChange,
  error,
}: {
  spec: (typeof SHOP_FIELDS)[number];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const common = {
    id: spec.name,
    name: spec.name,
    value,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    "aria-invalid": !!error,
    "aria-describedby": describedBy(spec.name, true, !!error),
    className: field,
  };
  return (
    <div>
      <label htmlFor={spec.name} className={labelCls}>
        {spec.label}
      </label>
      {spec.long ? (
        <textarea rows={3} {...common} />
      ) : (
        <input {...common} inputMode={spec.numeric ? "numeric" : undefined} />
      )}
      <p id={`${spec.name}-hint`} className="mt-1 text-caption text-ink-600">
        {spec.hint}
      </p>
      <FieldError id={`${spec.name}-error`} msg={error} />
    </div>
  );
}

export function ShopForm({ initial }: { initial: ShopInfo }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveShop, {});
  const fe = state.fieldErrors ?? {};
  useFocusFirstError(state.fieldErrors, SHOP_ORDER, pending);
  // Controlled, so a refused save keeps what she typed (see useField).
  const [values, setValues] = useState(initial);
  return (
    <Section
      title="Shop details"
      caption="What customers read about the shop. Saved changes reach the site within about a minute."
    >
      <form action={action} className="flex flex-col gap-4">
        {SHOP_FIELDS.map((spec) => (
          <ShopField
            key={spec.name}
            spec={spec}
            value={values[spec.name]}
            onChange={(v) => setValues((cur) => ({ ...cur, [spec.name]: v }))}
            error={fe[spec.name]}
          />
        ))}
        <div className="flex items-center gap-4">
          <SaveButton pending={pending} />
          <Feedback state={state} />
        </div>
      </form>
    </Section>
  );
}

// /policies' clauses, in her words. An empty box leaves that clause saying what
// it will cover, as it does today; Charges has no clause until it is written.
const TERMS_FIELDS: { name: (typeof TERMS_ORDER)[number]; label: string; hint: string }[] = [
  { name: "terms_extensions", label: "Extensions", hint: "Keeping a piece for extra days: how it is asked for and what it costs." },
  { name: "terms_damage", label: "Damage and care", hint: "What happens if a piece comes back marked or damaged." },
  { name: "terms_pickup", label: "Pickup and return", hint: "When she collects, when it comes back, and what happens if it is late." },
  { name: "terms_charges", label: "Charges", hint: "Deposits or any other charge. Shown as its own term once written." },
];

export function TermsForm({ initial }: { initial: Terms }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveTerms, {});
  const fe = state.fieldErrors ?? {};
  useFocusFirstError(state.fieldErrors, TERMS_ORDER, pending);
  // Controlled, so a refused save keeps what she typed (see useField).
  const [values, setValues] = useState(initial);
  return (
    <Section
      title="Rental terms"
      caption="The terms on the Rental terms page. Leave a box empty until it is decided. A blank line starts a new paragraph."
    >
      <form action={action} className="flex flex-col gap-4">
        {TERMS_FIELDS.map((spec) => (
          <div key={spec.name}>
            <label htmlFor={spec.name} className={labelCls}>
              {spec.label}
            </label>
            <textarea
              id={spec.name}
              name={spec.name}
              rows={4}
              value={values[spec.name]}
              onChange={(e) => setValues((cur) => ({ ...cur, [spec.name]: e.target.value }))}
              aria-invalid={!!fe[spec.name]}
              aria-describedby={describedBy(spec.name, true, !!fe[spec.name])}
              className={field}
            />
            <p id={`${spec.name}-hint`} className="mt-1 text-caption text-ink-600">
              {spec.hint}
            </p>
            <FieldError id={`${spec.name}-error`} msg={fe[spec.name]} />
          </div>
        ))}
        <div className="flex items-center gap-4">
          <SaveButton pending={pending} />
          <Feedback state={state} />
        </div>
      </form>
    </Section>
  );
}

/**
 * Sessions. Not a saved setting, so it is a plain form rather than a
 * useActionState one: the action ends the session that submitted it and
 * redirects to the login page, so there is no state to come back to.
 */
export function SessionsForm() {
  return (
    <Section
      title="Sessions"
      caption="Signed in somewhere you should not be? This ends every session, on every device."
    >
      <form action={signOutEverywhere} className="flex flex-col gap-4">
        <p className="text-body text-ink-600">
          Logging out only signs you out of the browser you are using. If you have left yourself
          signed in on a shop computer or someone else&apos;s phone, this is what closes it. You
          will be asked to sign in again here too.
        </p>
        <div>
          <button
            type="submit"
            className="press inline-flex min-h-[2.75rem] items-center justify-center rounded-control border border-danger/40 px-5 text-[0.9375rem] font-semibold text-danger transition-colors duration-[180ms] hover:bg-danger hover:text-porcelain-50"
          >
            Sign out of every device
          </button>
        </div>
      </form>
    </Section>
  );
}
