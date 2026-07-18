"use client";

import { useActionState } from "react";
import {
  saveBookingRules,
  saveShop,
  savePayments,
  saveCharges,
  type SettingsState,
} from "./actions";

const field =
  "w-full rounded-control border border-ink-900/20 bg-porcelain-50 px-3 py-2.5 text-body " +
  "text-ink-900 outline-none focus:border-violet-700";
const labelCls = "block text-caption font-medium text-ink-600 mb-1.5";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1 text-caption text-danger">
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

type BookingRules = { buffer_days: number; booking_expiry_minutes: number; sms_daily_quota: number };
type ShopInfo = { name: string; address: string; maps_url: string; hours: string; phone: string };
type Upi = { id: string; number: string; qr_path: string };
type Charges = { en: string; hi: string };

export function BookingRulesForm({ initial }: { initial: BookingRules }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveBookingRules, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Section title="Booking rules" caption="Buffer between bookings, hold expiry and daily SMS quota.">
      <form action={action} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="buffer_days" className={labelCls}>
              Buffer days
            </label>
            <input
              id="buffer_days"
              name="buffer_days"
              inputMode="numeric"
              defaultValue={initial.buffer_days}
              className={field}
            />
            <FieldError msg={fe.buffer_days} />
          </div>
          <div>
            <label htmlFor="booking_expiry_minutes" className={labelCls}>
              Hold expiry (min)
            </label>
            <input
              id="booking_expiry_minutes"
              name="booking_expiry_minutes"
              inputMode="numeric"
              defaultValue={initial.booking_expiry_minutes}
              className={field}
            />
            <FieldError msg={fe.booking_expiry_minutes} />
          </div>
          <div>
            <label htmlFor="sms_daily_quota" className={labelCls}>
              SMS daily quota
            </label>
            <input
              id="sms_daily_quota"
              name="sms_daily_quota"
              inputMode="numeric"
              defaultValue={initial.sms_daily_quota}
              className={field}
            />
            <FieldError msg={fe.sms_daily_quota} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SaveButton pending={pending} />
          <Feedback state={state} />
        </div>
      </form>
    </Section>
  );
}

export function ShopForm({ initial }: { initial: ShopInfo }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveShop, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Section title="Shop" caption="Details shown to customers on the visit page.">
      <form action={action} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className={labelCls}>
            Shop name
          </label>
          <input id="name" name="name" defaultValue={initial.name} className={field} />
          <FieldError msg={fe.name} />
        </div>
        <div>
          <label htmlFor="address" className={labelCls}>
            Address
          </label>
          <input id="address" name="address" defaultValue={initial.address} className={field} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className={labelCls}>
              Phone
            </label>
            <input id="phone" name="phone" defaultValue={initial.phone} className={field} />
          </div>
          <div>
            <label htmlFor="hours" className={labelCls}>
              Hours
            </label>
            <input id="hours" name="hours" defaultValue={initial.hours} className={field} />
          </div>
        </div>
        <div>
          <label htmlFor="maps_url" className={labelCls}>
            Google Maps link
          </label>
          <input id="maps_url" name="maps_url" defaultValue={initial.maps_url} className={field} />
          <p className="mt-1 text-caption text-ink-400">Map pin coordinates are preserved as saved.</p>
        </div>
        <div className="flex items-center gap-4">
          <SaveButton pending={pending} />
          <Feedback state={state} />
        </div>
      </form>
    </Section>
  );
}

export function PaymentsForm({ initial }: { initial: Upi }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(savePayments, {});
  return (
    <Section title="Payments" caption="UPI details customers use to pay the advance.">
      <form action={action} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="id" className={labelCls}>
              UPI ID
            </label>
            <input id="id" name="id" defaultValue={initial.id} className={field} />
          </div>
          <div>
            <label htmlFor="number" className={labelCls}>
              UPI number
            </label>
            <input id="number" name="number" defaultValue={initial.number} className={field} />
          </div>
        </div>
        <div>
          <label htmlFor="qr_path" className={labelCls}>
            QR image path
          </label>
          <input id="qr_path" name="qr_path" defaultValue={initial.qr_path} className={field} />
          <p className="mt-1 text-caption text-ink-400">
            Resolves under /public for now (e.g. /brand/upi-qr.png); moves to cloud storage later.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SaveButton pending={pending} />
          <Feedback state={state} />
        </div>
      </form>
    </Section>
  );
}

export function ChargesForm({ initial }: { initial: Charges }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveCharges, {});
  return (
    <Section title="Charges copy" caption="Explains rental charges to customers, in English and Hindi.">
      <form action={action} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="en" className={labelCls}>
              English
            </label>
            <textarea id="en" name="en" rows={5} defaultValue={initial.en} className={field} />
          </div>
          <div>
            <label htmlFor="hi" className={labelCls}>
              Hindi
            </label>
            <textarea id="hi" name="hi" rows={5} defaultValue={initial.hi} className={`${field} font-sans-hi`} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SaveButton pending={pending} />
          <Feedback state={state} />
        </div>
      </form>
    </Section>
  );
}
