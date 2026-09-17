"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MAX_ITEMS,
  NOTE_MAX,
  RANGE_MESSAGES,
  checkRange,
  daysBetween,
  formatDay,
  formatTime,
  normalisePhone,
  openSlots,
  overlaps,
  todayIST,
  weekday,
  wouldBlock,
  type Blocked,
  type PickupHours,
} from "@/lib/bookingRules";
import { remove as removeFromSelection } from "@/lib/selection";
import { formatINR } from "@/lib/format";
import type { RetailVariant } from "@/lib/retail";
import { SHOP } from "@/lib/site";
import { SectionEdge } from "@/components/site/SectionEdge";
import { Button } from "@/components/ui/Button";
import { Turnstile, turnstileConfigured } from "@/components/booking/Turnstile";
import { AvailabilityCalendar } from "@/components/booking/AvailabilityCalendar";
import { JewelleryDrawer, type FreeJewel } from "@/components/booking/JewelleryDrawer";
import { ReserveEmpty } from "@/components/booking/ReserveEmpty";

export type ReservePiece = {
  slug: string;
  name: string;
  type: "rental" | "jewellery" | "retail";
  /** Per day, for a rental or a piece of jewellery. */
  pricePerDay: number | null;
  /** Outright, for a retail piece. */
  price: number | null;
  href: string;
  image: string | null;
  /** The picture is the category's, not this piece's. */
  sample: boolean;
  /** Retail only: the colours she chooses between, each with its sizes. */
  variants: RetailVariant[];
};

/** What a retail piece in the basket has been set to. */
type Pick = { variant: string; size: string };

type Availability = {
  today: string;
  bufferDays: number;
  cancelCutoffHours: number;
  pickupHours: PickupHours;
  products: { slug: string; blocked: Blocked[]; variants?: RetailVariant[] }[];
  jewellery?: FreeJewel[];
};

/** Whatever POST /api/bookings answers, success or failure. */
type Reply = { code?: string; token?: string; error?: string; field?: string; slugs?: string[]; message?: string };

type Field = "items" | "dates" | "time" | "name" | "phone" | "email" | "note";
const FIELD_ORDER: Field[] = ["items", "dates", "time", "name", "phone", "email", "note"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; // the server's own test

/**
 * The booking itself (specs/BOOKING_ENGINE_SPEC_V2.md §2.1): the pieces, one
 * date range for all of them, a pickup time, and how to reach her.
 *
 * Nothing here is paid and nothing reads as an amount owed (owner, 15 Sep
 * 2026). Prices appear per piece, per day, "paid at the shop"; there is no
 * total, because a total is a bill and there is no bill on this site.
 *
 * Every check on this page is a courtesy. The server re-runs checkRange and
 * normalisePhone, and the exclusion constraint alone decides whether the dates
 * are free: a 409 here is the normal way a race is lost, so it keeps everything
 * she typed, re-reads the calendar and says which piece went.
 */
export function ReserveFlow({
  initial,
  prefill,
}: {
  initial: ReservePiece[];
  /** The colour and size a product page already asked for, by slug. */
  prefill?: Record<string, Pick>;
}) {
  const router = useRouter();
  const [pieces, setPieces] = useState(initial);
  // Which colour and size each retail piece is set to. A piece arriving from
  // its own product page is already answered; one gathered in the tray is not,
  // and the form asks below.
  const [picks, setPicks] = useState<Record<string, Pick>>(() => {
    const out: Record<string, Pick> = {};
    for (const p of initial) {
      if (p.type !== "retail") continue;
      const given = prefill?.[p.slug];
      const v = p.variants.find((x) => x.id === given?.variant);
      if (v?.sizes.some((sz) => sz.size === given!.size && sz.inStock)) out[p.slug] = given!;
      // Only one colour and only one size in it: there is nothing to ask.
      else if (p.variants.length === 1 && p.variants[0].sizes.filter((sz) => sz.inStock).length === 1) {
        out[p.slug] = { variant: p.variants[0].id, size: p.variants[0].sizes.find((sz) => sz.inStock)!.size };
      }
    }
    return out;
  });
  const [avail, setAvail] = useState<Availability | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const [pickup, setPickup] = useState<string | null>(null);
  const [ret, setRet] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [taken, setTaken] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [sending, setSending] = useState(false);

  const [drawer, setDrawer] = useState<FreeJewel[] | null>(null);
  const drawerOffered = useRef(false);
  const rangeKey = useRef("");
  const submitRef = useRef<HTMLDivElement>(null);

  const slugs = pieces.map((p) => p.slug).join(",");
  const hasRental = pieces.some((p) => p.type === "rental");
  const one = pieces.length === 1;

  const toRent = pieces.filter((p) => p.type !== "retail");
  const toKeep = pieces.filter((p) => p.type === "retail");
  // Nothing comes back, so there is no return leg: one day, and the calendar
  // draws it as one (RETAIL_SPEC §3.3). A mixed basket keeps the rental's range
  // and she collects everything on the pickup day — she comes in once.
  const collectOnly = toRent.length === 0 && toKeep.length > 0;

  // The calendar. Re-read whenever the pieces change (a piece added from the
  // drawer brings its own holds) and after a lost race.
  const datesRef = useRef({ pickup, ret });
  useEffect(() => {
    datesRef.current = { pickup, ret };
  }, [pickup, ret]);
  useEffect(() => {
    if (!slugs) return;
    const ctrl = new AbortController();
    fetch(`/api/availability?items=${slugs}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Availability>) : Promise.reject(new Error(String(r.status)))))
      .then((a: Availability) => {
        setAvail(a);
        setLoadFailed(false);
        // The sizes come back with the calendar, so a size that went while she
        // was on this page stops being offered after a lost race.
        setPieces((ps) =>
          ps.map((p) => {
            const v = a.products.find((x) => x.slug === p.slug)?.variants;
            return v ? { ...p, variants: v } : p;
          }),
        );
        setPicks((cur) => {
          const next: Record<string, Pick> = {};
          for (const [slug, pick] of Object.entries(cur)) {
            const v = a.products.find((x) => x.slug === slug)?.variants;
            // Keep the choice unless this read says that size has gone.
            if (!v || v.find((x) => x.id === pick.variant)?.sizes.some((sz) => sz.size === pick.size && sz.inStock)) {
              next[slug] = pick;
            }
          }
          return next;
        });
        // Dates chosen against the old calendar may not survive the new one.
        const { pickup: p, ret: r } = datesRef.current;
        if (p && r && !fitsAll(a, p, r)) {
          setRet(null);
          if (!fitsAll(a, p, p)) setPickup(null);
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setLoadFailed(true);
      });
    return () => ctrl.abort();
  }, [slugs, refresh]);

  // Keep the address bar honest, so a reload or a shared link opens this
  // booking's pieces and not the ones she has since taken off.
  const firstUrl = useRef(true);
  useEffect(() => {
    if (firstUrl.current) {
      firstUrl.current = false;
      return;
    }
    window.history.replaceState(null, "", slugs ? `/reserve?items=${slugs}` : "/reserve");
  }, [slugs]);

  // The drawer must never sit over the send button. Once that button has been
  // out of view and scrolls in, the drawer goes, and does not come back.
  useEffect(() => {
    const el = submitRef.current;
    if (!drawer || !el) return;
    let wasHidden = false;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) wasHidden = true;
      else if (wasHidden) setDrawer(null);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [drawer]);

  const hours = avail?.pickupHours;
  const blocked = useMemo(
    () => pieces.map((p) => avail?.products.find((x) => x.slug === p.slug)?.blocked ?? []),
    [pieces, avail],
  );

  const onDates = useCallback(
    (p: string | null, r: string | null) => {
      setPickup(p);
      setRet(r);
      setTaken([]);
      setErrors((e) => ({ ...e, dates: undefined, ...(p ? {} : { time: undefined }) }));
      setDrawer(null); // its list was for the old dates
      if (hours) setTime((t) => (p && t && openSlots(p, hours).includes(t) ? t : null));

      const key = `${p}|${r}`;
      rangeKey.current = key;
      if (!p || !r || !hasRental || drawerOffered.current) return;
      fetch(`/api/availability?items=${slugs}&from=${p}&to=${r}`, { cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<Availability>) : null))
        .then((a: Availability | null) => {
          // Only for the dates still chosen, and only ever once.
          if (!a?.jewellery?.length || rangeKey.current !== key || drawerOffered.current) return;
          drawerOffered.current = true;
          setDrawer(a.jewellery);
        })
        .catch(() => {});
    },
    [hours, hasRental, slugs],
  );

  const removePiece = (slug: string) => {
    setPieces((ps) => ps.filter((p) => p.slug !== slug));
    setTaken((t) => t.filter((s) => s !== slug));
    setPicks(({ [slug]: _gone, ...rest }) => rest);
  };

  // Choosing a colour keeps the size only if this colour has it in stock, the
  // same rule the product page applies.
  const chooseColour = (piece: ReservePiece, v: RetailVariant) => {
    setPicks((cur) => {
      const size = cur[piece.slug]?.size;
      const keep = size && v.sizes.some((s) => s.size === size && s.inStock) ? size : "";
      return { ...cur, [piece.slug]: { variant: v.id, size: keep } };
    });
    setErrors((e) => ({ ...e, items: undefined }));
  };

  const chooseSize = (piece: ReservePiece, variant: string, size: string) => {
    setPicks((cur) => ({ ...cur, [piece.slug]: { variant, size } }));
    setErrors((e) => ({ ...e, items: undefined }));
  };

  const addJewel = (j: FreeJewel) => {
    setPieces((ps) =>
      ps.length >= MAX_ITEMS || ps.some((p) => p.slug === j.slug)
        ? ps
        : [...ps, { ...j, type: "jewellery", price: null, variants: [], href: `/jewellery/${j.slug}`, sample: false }],
    );
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !hours) return;
    setFormError(null);

    const errs: Partial<Record<Field, string>> = {};
    // Every retail piece has to have been answered. The server checks this too,
    // and the database decides whether the size is still to be had.
    const unanswered = toKeep.filter((p) => !picks[p.slug]?.size);
    if (unanswered.length > 0) {
      errs.items =
        unanswered.length === 1
          ? `Choose a size for the ${unanswered[0].name}.`
          : "Choose a size for each piece you are buying.";
    }
    if (!pickup || !ret) errs.dates = RANGE_MESSAGES.bad_date;
    else if (!time) errs.time = RANGE_MESSAGES.bad_time;
    else {
      const problem = checkRange({ pickup, ret, time }, hours);
      if (problem) errs[problem === "bad_time" || problem === "too_soon" ? "time" : "dates"] = RANGE_MESSAGES[problem];
    }
    if (name.trim().length < 2) errs.name = "Tell us your name.";
    if (!normalisePhone(phone)) errs.phone = "Enter a 10-digit Indian mobile number.";
    if (email.trim() && !EMAIL_RE.test(email.trim())) errs.email = "That email address does not look right.";
    if (note.trim().length > NOTE_MAX) errs.note = `Keep the note under ${NOTE_MAX} characters.`;
    setErrors(errs);
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (first) {
      document.getElementById(`rv-${first}`)?.focus();
      return;
    }
    if (!token && turnstileConfigured) {
      setFormError("One moment: we are still checking that this is coming from a person. Try again in a second.");
      return;
    }

    setSending(true);
    const failed = (message: string) => {
      setFormError(`Not sent. ${message}`);
      setToken(null);
      setResetKey((k) => k + 1); // tokens are single-use
      setSending(false);
    };
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // A retail line names the colour and size its count is keyed on; the
          // other two are one piece each, named by slug alone.
          items: pieces.map((p) =>
            p.type === "retail" ? { slug: p.slug, ...picks[p.slug] } : p.slug,
          ),
          pickup,
          return: ret,
          time,
          name: name.trim(),
          phone,
          email: email.trim() || undefined,
          note: note.trim() || undefined,
          turnstile: token,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as Reply;
      if (res.status === 201 && body.code && body.token) {
        pieces.forEach((p) => removeFromSelection(p.slug));
        router.push(`/booking/${body.code}?k=${encodeURIComponent(body.token)}`);
        return;
      }
      const message: string = body.message ?? "Something went wrong sending your booking. Please try again, or call the shop.";
      if (res.status === 409 && body.error === "out_of_stock") {
        // The last one in that size went while she was filling the form. The
        // dates are not the problem, so this is said against the pieces and the
        // calendar is left alone. The sizes are re-read so the one that went
        // now shows as gone.
        setRefresh((n) => n + 1);
        setErrors({ items: message });
        failed(message);
        document.getElementById("rv-items")?.focus();
      } else if (res.status === 409) {
        setTaken(Array.isArray(body.slugs) ? body.slugs : []);
        setRefresh((n) => n + 1);
        setErrors({ dates: message });
        failed(message);
        document.getElementById("rv-dates")?.focus();
      } else if (body.error === "invalid" && FIELD_ORDER.includes(body.field as Field)) {
        setErrors({ [body.field as Field]: message });
        failed(message);
      } else if (body.error === "range") {
        setErrors({ dates: message });
        failed(message);
      } else {
        failed(message);
      }
    } catch {
      failed("Your booking could not be sent. Check your connection and try again.");
    }
  }

  if (pieces.length === 0) return <ReserveEmpty />;

  const takenNames = pieces.filter((p) => taken.includes(p.slug)).map((p) => p.name);
  const days = pickup && ret ? daysBetween(pickup, ret) + 1 : null;
  const slots = pickup && hours ? openSlots(pickup, hours) : [];
  const cutoff = avail?.cancelCutoffHours ?? 6;

  return (
    <div>
      {/* ---------- Head: the pieces on the rail ---------------------------- */}
      <section data-dark-hero="scrim" className="on-dark grain -mt-16 bg-violet-950 pt-28 pb-24 md:pt-36 md:pb-32">
        <div className="shell-wide relative z-[1] grid gap-14 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:items-end lg:gap-20">
          <div>
            <p className="eyebrow">Reserve online, collect at the shop</p>
            <h1 className="mt-4 text-h1 text-porcelain-50">
              {collectOnly ? (
                <>
                  The day you <em className="italic">come in</em>
                </>
              ) : (
                <>
                  The days you <em className="italic">need {one ? "it" : "them"}</em>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-[44ch] text-body text-violet-300">
              {collectOnly
                ? "Choose the day and the time you will come in. The shop calls or messages you to confirm, and nothing is paid online."
                : "Choose a pickup day, a return day and a time to collect. The shop calls or messages you to confirm, and nothing is paid online."}
            </p>
          </div>

          <div className="min-w-0">
            <p className="eyebrow">
              {pieces.length} {one ? "piece" : "pieces"} in this booking
            </p>
            <div className="-mx-5 mt-4 overflow-x-auto px-5 pb-3 md:-mx-10 md:px-10 lg:mx-0 lg:px-0">
              <ul className="relative flex min-w-max gap-6 pt-9 md:gap-9">
                {/* The rail they hang from. */}
                <span aria-hidden="true" className="absolute inset-x-0 top-3 h-0.5 bg-gold-500/60" />
                {pieces.map((p) => (
                  <li key={p.slug} className="relative w-28 md:w-36">
                    <svg
                      aria-hidden="true"
                      width="20"
                      height="34"
                      viewBox="0 0 20 34"
                      fill="none"
                      className="absolute -top-[2.1rem] left-1/2 -translate-x-1/2 text-gold-500"
                    >
                      <path
                        d="M10 34V12.5C10 10 14.5 9.6 14.5 6 14.5 3.2 12.4 1.2 10 1.2S5.5 3.2 5.5 5.6"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="keyline arch relative aspect-[4/5] overflow-hidden bg-porcelain-100">
                      {p.image ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image}
                            alt={p.sample ? "" : p.name}
                            aria-hidden={p.sample || undefined}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                          {p.sample && (
                            <span className="absolute bottom-2 left-2 rounded-full bg-porcelain-50/90 px-2 py-0.5 text-[0.6875rem] font-medium text-ink-900">
                              Sample photo
                            </span>
                          )}
                        </>
                      ) : (
                        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-2xl text-gold-600/60">
                          &#10022;
                        </span>
                      )}
                      {taken.includes(p.slug) && (
                        <span className="absolute inset-x-2 top-1/2 -translate-y-1/2 bg-porcelain-50 px-2 py-1 text-center text-[0.6875rem] font-semibold text-danger">
                          Taken on those dates
                        </span>
                      )}
                    </div>
                    <Link
                      href={p.href}
                      className="mt-3 line-clamp-2 block text-caption leading-snug text-porcelain-50 underline-offset-4 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="mt-1 text-caption text-violet-300">
                      {p.type === "retail" ? (
                        p.price !== null ? (
                          <>
                            <span className="tabular">₹{formatINR(p.price)}</span> to keep
                          </>
                        ) : (
                          "Price at the shop"
                        )
                      ) : p.pricePerDay !== null ? (
                        <>
                          <span className="tabular">₹{formatINR(p.pricePerDay)}</span> / day
                        </>
                      ) : (
                        "Price at the shop"
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => removePiece(p.slug)}
                      aria-label={`Remove ${p.name} from this booking`}
                      className="-ml-1 inline-flex min-h-11 items-center px-1 text-caption text-violet-300 underline underline-offset-4 hover:text-porcelain-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-caption text-violet-300">
              {collectOnly
                ? "Paid at the shop when you collect."
                : toKeep.length > 0
                  ? "A rental is priced per day; a piece you keep is priced outright. Both are paid at the shop when you collect."
                  : "Prices are per day, paid at the shop when you collect."}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- The booking --------------------------------------------- */}
      <section className="relative bg-porcelain-50 pt-24 pb-24 md:pt-32 md:pb-28">
        <SectionEdge seed={51} paper="var(--color-violet-950)" reveal="var(--color-porcelain-50)" />

        <form
          noValidate
          onSubmit={submit}
          className="shell relative grid gap-16 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.8fr)] lg:gap-x-20 xl:gap-x-28"
        >
          <div className="min-w-0 space-y-20 lg:col-start-1 lg:row-start-1">
            {/* Colours and sizes, for the pieces she is buying. First in the
                form because it is about the pieces on the rail above it, and
                because a piece that arrived from the tray has not been asked
                yet — the product page asks whoever comes that way, and then
                this fieldset is already answered. */}
            {toKeep.length > 0 && (
              <fieldset aria-describedby={errors.items ? "rv-items-error" : undefined}>
                <legend className="sr-only">Colour and size for each piece you are buying</legend>
                <h2 id="rv-items" tabIndex={-1} className="text-h2 outline-none">
                  {toKeep.length === 1 ? "The piece you are buying" : "The pieces you are buying"}
                </h2>
                <div className="mt-10 space-y-12">
                  {toKeep.map((p) => {
                    const pick = picks[p.slug];
                    const variant = p.variants.find((v) => v.id === pick?.variant) ?? p.variants[0];
                    return (
                      <div key={p.slug}>
                        <p className="text-body font-medium text-ink-900">{p.name}</p>
                        {p.variants.length > 1 && (
                          <div className="mt-4 flex flex-wrap gap-3">
                            {p.variants.map((v) => {
                              const on = v.id === variant?.id && !!pick;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => chooseColour(p, v)}
                                  aria-pressed={on}
                                  className={`press inline-flex min-h-[44px] items-center gap-3 rounded-control border px-4 text-caption transition-colors duration-[180ms] ${
                                    on
                                      ? "border-violet-700 bg-violet-100/60 text-ink-900"
                                      : "border-porcelain-200 text-ink-600 hover:border-ink-900/30"
                                  }`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="h-5 w-5 shrink-0 rounded-full ring-1 ring-ink-900/20"
                                    style={{ backgroundColor: v.colourHex }}
                                  />
                                  {v.colourName}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {variant && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {variant.sizes.map((sz) => {
                              const on = pick?.variant === variant.id && pick.size === sz.size;
                              return (
                                <button
                                  key={sz.size}
                                  type="button"
                                  disabled={!sz.inStock}
                                  onClick={() => chooseSize(p, variant.id, sz.size)}
                                  aria-pressed={on}
                                  className={`press inline-flex min-h-11 min-w-[3.5rem] items-center justify-center rounded-control border px-4 text-caption transition-colors duration-[180ms] ${
                                    on
                                      ? "border-violet-700 bg-violet-800 font-medium text-porcelain-50"
                                      : sz.inStock
                                        ? "border-porcelain-200 text-ink-600 hover:border-ink-900/30"
                                        : "cursor-not-allowed border-dashed border-porcelain-200 text-ink-600 line-through"
                                  }`}
                                >
                                  {sz.size}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <FieldError id="rv-items-error" message={errors.items} />
              </fieldset>
            )}

            {/* Dates */}
            <fieldset aria-describedby={errors.dates ? "rv-dates-error" : undefined}>
              <legend className="sr-only">Pickup and return dates</legend>
              <h2 id="rv-dates" tabIndex={-1} className="text-h2 outline-none">
                {collectOnly ? "When you will come in" : `When you need ${one ? "it" : "them"}`}
              </h2>
              {loadFailed && !avail ? (
                <p className="mt-10 text-body text-ink-600">
                  The calendar did not load.{" "}
                  <button type="button" onClick={() => setRefresh((n) => n + 1)} className="min-h-11 text-ink-900 underline underline-offset-4">
                    Try again
                  </button>
                </p>
              ) : (
                <div className="mt-10">
                  <AvailabilityCalendar
                    today={avail?.today ?? todayIST()}
                    blocked={blocked}
                    bufferDays={avail?.bufferDays ?? 0}
                    hours={hours ?? FALLBACK_HOURS}
                    pickup={pickup}
                    ret={ret}
                    onChange={onDates}
                    ready={avail !== null}
                    pronoun={one ? "it" : "them"}
                    single={collectOnly}
                  />
                </div>
              )}
              <FieldError id="rv-dates-error" message={errors.dates} />
              {takenNames.length > 0 && (
                <p className="mt-3 text-caption text-ink-600">
                  Taken: {takenNames.join(", ")}. Choose other dates, or remove{" "}
                  {takenNames.length === 1 ? "that piece" : "those pieces"} above.
                </p>
              )}
            </fieldset>

            {/* Time */}
            <fieldset aria-describedby={errors.time ? "rv-time-error" : undefined}>
              <legend className="sr-only">Pickup time</legend>
              <h2 className="text-h2">A time to collect</h2>
              {!pickup ? (
                <p className="mt-8 text-body text-ink-600">Choose a pickup day and its times appear here.</p>
              ) : (
                <>
                  <p className="mt-8 text-body text-ink-900">
                    On {formatDay(pickup)}. The shop keeps {one ? "it" : "them"} ready for you from then.
                  </p>
                  <div id="rv-time" tabIndex={-1} className="mt-6 space-y-6 outline-none">
                    {groupSlots(slots).map(([label, list]) => (
                      <div key={label} role="radiogroup" aria-label={`${label} times`} className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:gap-6">
                        <span className="w-24 shrink-0 text-eyebrow font-medium uppercase tracking-[0.12em] text-ink-600">
                          {label}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {list.map((t) => (
                            <label key={t} className="relative cursor-pointer">
                              <input
                                type="radio"
                                name="time"
                                value={t}
                                checked={time === t}
                                onChange={() => {
                                  setTime(t);
                                  setErrors((e) => ({ ...e, time: undefined }));
                                }}
                                className="peer sr-only"
                              />
                              <span className="flex min-h-11 min-w-[5.5rem] items-center justify-center gap-1 border-b border-ink-900/25 px-3 transition-colors duration-[180ms] hover:border-gold-600 peer-checked:border-violet-800 peer-checked:bg-violet-800 peer-checked:text-porcelain-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-600">
                                <span className="tabular font-display text-[1.0625rem]">{formatTime(t).split(" ")[0]}</span>
                                <span className="text-caption">{formatTime(t).split(" ")[1]}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <FieldError id="rv-time-error" message={errors.time} />
            </fieldset>

            {/* Details */}
            <fieldset>
              <legend className="sr-only">How to reach you</legend>
              <h2 className="text-h2">How to reach you</h2>
              <div className="mt-10 grid gap-x-10 gap-y-9 md:grid-cols-2">
                <TextField id="rv-name" label="Your name" error={errors.name}>
                  <input
                    id="rv-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    maxLength={80}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "rv-name-error" : undefined}
                    className={INPUT}
                  />
                </TextField>
                <TextField
                  id="rv-phone"
                  label="Mobile number"
                  hint="The shop calls or messages this number to confirm."
                  error={errors.phone}
                >
                  <div className="flex items-baseline border-b border-ink-900/60 focus-within:border-gold-600">
                    <span aria-hidden="true" className="pr-2 text-body text-ink-600">
                      +91
                    </span>
                    <input
                      id="rv-phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel-national"
                      placeholder="98765 43210"
                      maxLength={16}
                      aria-invalid={!!errors.phone}
                      aria-describedby={`rv-phone-hint${errors.phone ? " rv-phone-error" : ""}`}
                      className={`${INPUT} tabular border-b-0`}
                    />
                  </div>
                </TextField>
                <TextField id="rv-email" label="Email" optional error={errors.email}>
                  <input
                    id="rv-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    maxLength={120}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "rv-email-error" : undefined}
                    className={INPUT}
                  />
                </TextField>
                <div className="md:col-span-2">
                  <TextField
                    id="rv-note"
                    label="Anything the shop should know"
                    optional
                    hint={`${note.length} of ${NOTE_MAX} characters`}
                    error={errors.note}
                  >
                    <textarea
                      id="rv-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      maxLength={NOTE_MAX}
                      placeholder="The occasion, your size, a fitting you would like"
                      aria-invalid={!!errors.note}
                      aria-describedby={`rv-note-hint${errors.note ? " rv-note-error" : ""}`}
                      className={`${INPUT} resize-y`}
                    />
                  </TextField>
                </div>
              </div>
            </fieldset>
          </div>

          {/* The slip: what she is asking for, and what happens after. */}
          <aside aria-label="Your booking" className="min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <Slip>
              <p className="eyebrow text-center">Your booking</p>
              <p className="mt-2 text-center font-display text-h3">
                {pieces.length} {one ? "piece" : "pieces"}
              </p>
              {/* Listed under separate headings when the basket holds both:
                  the two carry different promises, and one of them she keeps
                  (RETAIL_SPEC §3.3). One trade alone needs no heading. */}
              {toRent.length > 0 && toKeep.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-eyebrow font-medium uppercase tracking-[0.12em] text-ink-600">
                      To rent
                    </p>
                    <p className="mt-1 text-caption text-ink-900">
                      {toRent.map((p) => p.name).join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-eyebrow font-medium uppercase tracking-[0.12em] text-ink-600">
                      To keep
                    </p>
                    <p className="mt-1 text-caption text-ink-900">
                      {toKeep
                        .map((p) => `${p.name}${picks[p.slug]?.size ? ` (${picks[p.slug].size})` : ""}`)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mx-auto mt-2 max-w-[30ch] text-center text-caption text-ink-600">
                  {pieces
                    .map((p) => `${p.name}${picks[p.slug]?.size ? ` (${picks[p.slug].size})` : ""}`)
                    .join(", ")}
                </p>
              )}

              <Stitch />
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-6 gap-y-3">
                <dt className="text-eyebrow font-medium uppercase tracking-[0.12em] text-ink-600">
                  {collectOnly ? "Come in" : "Collect"}
                </dt>
                <dd className="text-right text-body text-ink-900">
                  {pickup ? `${formatDay(pickup)}${time ? `, ${formatTime(time)}` : ""}` : <Unset />}
                </dd>
                {/* Nothing comes back, so there is nothing to say here. */}
                {!collectOnly && (
                  <>
                    <dt className="text-eyebrow font-medium uppercase tracking-[0.12em] text-ink-600">Return</dt>
                    <dd className="text-right text-body text-ink-900">{ret ? formatDay(ret) : <Unset />}</dd>
                    <dt className="text-eyebrow font-medium uppercase tracking-[0.12em] text-ink-600">Length</dt>
                    <dd className="tabular text-right text-body text-ink-900">
                      {days ? `${days} ${days === 1 ? "day" : "days"}` : <Unset />}
                    </dd>
                  </>
                )}
              </dl>

              <Stitch />
              <p className="eyebrow">What happens next</p>
              <ol className="mt-4 space-y-3 text-caption text-ink-900">
                <Next>
                  {collectOnly
                    ? "It comes off the rail in your size the moment you send this."
                    : toKeep.length > 0
                      ? "Your dates are held, and what you are buying comes off the rail, the moment you send this."
                      : "Your dates are held for you the moment you send this."}
                </Next>
                <Next>The shop calls or messages you to confirm.</Next>
                {toKeep.length > 0 && (
                  // R2: her own process. Worth saying, because it is the call
                  // she has to answer for the piece to still be there.
                  <Next>You get another call about two hours before you come in.</Next>
                )}
                <Next>Nothing is paid online. You pay at the shop when you collect.</Next>
                <Next>
                  Plans change? Cancel online until {cutoff} {cutoff === 1 ? "hour" : "hours"} before{" "}
                  {collectOnly ? "you are due in" : "pickup"}.
                </Next>
                <Next>
                  {collectOnly
                    ? "If the shop cannot confirm in time, the hold lapses and the piece goes back on the rail."
                    : "If the shop cannot confirm in time, the hold lapses and the dates open again."}
                </Next>
              </ol>
            </Slip>
          </aside>

          <div ref={submitRef} className="min-w-0 lg:col-start-1 lg:row-start-2">
            <Turnstile onToken={setToken} resetKey={resetKey} theme="light" />
            {formError && (
              <p role="alert" className="mb-6 border-l-2 border-danger pl-4 text-body text-danger">
                {formError}
              </p>
            )}
            {/* Not <Button>: it spreads its props after its own className, so a
                width set here would replace the variant's styles, not add to them. */}
            <button
              type="submit"
              disabled={sending}
              className="press inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-control bg-violet-800 px-8 text-[0.9375rem] font-semibold text-porcelain-50 transition-colors duration-[180ms] hover:bg-violet-700 disabled:cursor-wait disabled:bg-violet-700 sm:w-auto"
            >
              {sending ? "Sending your booking" : one ? "Reserve this piece" : "Reserve these pieces"}
            </button>
            <p className="mt-4 max-w-[48ch] text-caption text-ink-600">
              Nothing is paid online. The dates are held for you as soon as this is sent.
            </p>
          </div>
        </form>
      </section>

      {/* ---------- Close: the shop, on the footer's own ground -------------- */}
      <section className="on-dark grain bg-violet-950 pt-24 pb-14 md:pt-28 md:pb-16">
        <SectionEdge seed={52} paper="var(--color-porcelain-50)" reveal="var(--color-violet-950)" />
        <div className="shell relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <p className="font-display text-h3 text-porcelain-50">Rather talk it through first?</p>
          <Button href={`tel:${SHOP.phone.replace(/\s/g, "")}`} variant="ghost-dark">
            Call the shop
          </Button>
        </div>
      </section>

      <p aria-live="polite" className="sr-only">
        {drawer ? "Jewellery free on your dates is open at the side of the page." : ""}
      </p>
      {drawer && pickup && ret && (
        <JewelleryDrawer
          list={drawer}
          added={pieces.map((p) => p.slug)}
          full={pieces.length >= MAX_ITEMS}
          dates={`${shortDay(pickup)} to ${shortDay(ret)}`}
          onAdd={addJewel}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const INPUT =
  "block w-full min-w-0 border-b border-ink-900/60 bg-transparent py-2.5 text-body text-ink-900 outline-none transition-colors duration-[180ms] placeholder:text-ink-600/70 focus:border-gold-600";

const FALLBACK_HOURS: PickupHours = { open: "11:00", close: "20:00", step_minutes: 30, closed_weekdays: [] };

function fitsAll(a: Availability, p: string, r: string) {
  const range = wouldBlock(p, r, a.bufferDays);
  return (
    !a.pickupHours.closed_weekdays.includes(weekday(p)) &&
    a.products.every((x) => !x.blocked.some((b) => overlaps(range, b)))
  );
}

const shortDay = (d: string) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${d}T00:00:00Z`),
  );

function groupSlots(slots: string[]): [string, string[]][] {
  const groups: [string, string[]][] = [
    ["Morning", slots.filter((t) => t < "12:00")],
    ["Afternoon", slots.filter((t) => t >= "12:00" && t < "17:00")],
    ["Evening", slots.filter((t) => t >= "17:00")],
  ];
  return groups.filter(([, list]) => list.length > 0);
}

function TextField({
  id,
  label,
  optional,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-caption font-medium text-ink-900">
        {label}
        {optional && <span className="font-normal text-ink-600"> (optional)</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-caption text-ink-600">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-caption font-medium text-danger">
      {message}
    </p>
  );
}

const Unset = () => <span className="text-ink-600">Not chosen yet</span>;

// A swing tag, the kind the shop pins to a piece that is set aside: corners cut
// either side of the eyelet, and the string it hangs from. The shadow is a
// drop-shadow on the wrapper because a box-shadow would be clipped with the tag.
function Slip({ children }: { children: ReactNode }) {
  return (
    <div className="relative pt-10 [filter:drop-shadow(0_12px_28px_rgba(23,20,35,0.10))]">
      <svg aria-hidden="true" width="40" height="52" viewBox="0 0 40 52" fill="none" className="absolute left-1/2 top-0 -translate-x-1/2 text-gold-600">
        <path d="M20 50C12 38 30 26 21 14 16 8 19 3 24 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <div
        className="relative bg-porcelain-100 px-6 pb-8 pt-14 sm:px-8"
        style={{ clipPath: "polygon(2.75rem 0, calc(100% - 2.75rem) 0, 100% 2.75rem, 100% 100%, 0 100%, 0 2.75rem)" }}
      >
        <span aria-hidden="true" className="absolute left-1/2 top-5 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-porcelain-50 ring-1 ring-ink-900/25" />
        {children}
      </div>
    </div>
  );
}

const Stitch = () => (
  <div
    aria-hidden="true"
    className="my-7 h-[1.5px]"
    style={{ backgroundImage: "linear-gradient(to right, var(--color-gold-600) 55%, transparent 0)", backgroundSize: "9px 1.5px" }}
  />
);

const Next = ({ children }: { children: ReactNode }) => (
  <li className="flex gap-3">
    <span aria-hidden="true" className="text-gold-600">
      &#10022;
    </span>
    <span>{children}</span>
  </li>
);
