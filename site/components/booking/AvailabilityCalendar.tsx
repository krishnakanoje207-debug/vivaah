"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  HORIZON_DAYS,
  MAX_DAYS,
  addDays,
  daysBetween,
  formatDay,
  isBlockedDay,
  openSlots,
  overlaps,
  weekday,
  wouldBlock,
  type Blocked,
  type PickupHours,
} from "@/lib/bookingRules";

/**
 * The calendar on /reserve: pickup first, then return.
 *
 * Its vocabulary is the workroom's, not a date picker's. A day another booking
 * holds is chalk-hatched, the way a cutter marks cloth that is spoken for. Her
 * own dates are a length of violet with a running stitch along it, the pickup
 * and return days cut as tags pointing at each other. The days after the return
 * that the shop keeps to ready the pieces carry the stitch on its own, without
 * the cloth, so she can see why the day after her return is not free to the
 * next person either.
 *
 * What is offered mirrors the exclusion constraint, never replaces it:
 *   - a pickup day must be open to the shop, inside the horizon, have a pickup
 *     time left, and leave room for at least a one-day booking before the next
 *     hold (its buffer included, via wouldBlock);
 *   - a return day is offered only while wouldBlock(pickup, return) overlaps no
 *     piece's blocked range. That test only ever gets worse as the return moves
 *     later, so the last good return is found once and every day up to it is
 *     free.
 * The server re-checks all of it, and the constraint decides.
 *
 * Keyboard: one day in the grid is tabbable (roving focus). Arrows move by day
 * and week, Home/End to the week's ends, Page Up/Down by month, Enter or Space
 * chooses. Past and unavailable days stay focusable but aria-disabled, so arrow
 * keys never jump unexpectedly over them.
 */

type Props = {
  today: string;
  /** One list per piece in the booking. */
  blocked: Blocked[][];
  bufferDays: number;
  hours: PickupHours;
  pickup: string | null;
  ret: string | null;
  onChange: (pickup: string | null, ret: string | null) => void;
  /** False until the availability has arrived: nothing is chosen blind. */
  ready: boolean;
  /** "them" for several pieces, "it" for one. */
  pronoun: string;
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_NAMES_SUN0 = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

// Chalk hatching for a held day. Decorative: the day's label says "held".
const HATCH: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-violet-500) 38%, transparent) 0 1px, transparent 1px 6px)",
};
// The running stitch, the same thread the loading mark sews.
const stitch = (color: string): CSSProperties => ({
  backgroundImage: `linear-gradient(to right, ${color} 55%, transparent 0)`,
  backgroundSize: "8px 1.5px",
  backgroundRepeat: "repeat-x",
  backgroundPosition: "left bottom",
});
// Tags cut to point along her range: the pickup's point faces forward, the
// return's faces back to it.
const TAG_START = "polygon(0 0, 78% 0, 100% 50%, 78% 100%, 0 100%)";
const TAG_END = "polygon(22% 0, 100% 0, 100% 100%, 22% 100%, 0 50%)";

const col = (d: string) => (weekday(d) + 6) % 7; // Monday first: Sunday, the closed day, ends the row
const monthOf = (d: string) => d.slice(0, 7);

function addMonths(month: string, n: number): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1 + n;
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, "0")}`;
}

const daysIn = (month: string) => daysBetween(`${month}-01`, `${addMonths(month, 1)}-01`);

/** The same day of the month n months on, pulled back to the month's last day. */
function shiftMonth(d: string, n: number): string {
  const m = addMonths(monthOf(d), n);
  const day = Math.min(Number(d.slice(8, 10)), daysIn(m));
  return `${m}-${String(day).padStart(2, "0")}`;
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "UTC" });
const LONG = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
const MONTH = fmt({ month: "long" });
const utc = (d: string) => new Date(`${d}T00:00:00Z`);

export function AvailabilityCalendar({ today, blocked, bufferDays, hours, pickup, ret, onChange, ready, pronoun }: Props) {
  const uid = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const wantFocus = useRef(false);

  // Two months side by side when the column has room for 44px days in both,
  // measured on the calendar itself rather than guessed from the viewport,
  // because the column's width depends on the layout around it.
  const [count, setCount] = useState(1);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCount(e.contentRect.width >= 640 ? 2 : 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const firstMonth = monthOf(today);
  const maxPickup = addDays(today, HORIZON_DAYS);
  const lastDay = addDays(maxPickup, MAX_DAYS - 1);
  const [view, setView] = useState(() => monthOf(pickup ?? today));
  const [focus, setFocus] = useState(() => pickup ?? today);
  const [hover, setHover] = useState<string | null>(null);

  const union = useMemo(() => blocked.flat(), [blocked]);
  const fits = useMemo(
    () => (p: string, r: string) => {
      const range = wouldBlock(p, r, bufferDays);
      return blocked.every((list) => !list.some((b) => overlaps(range, b)));
    },
    [blocked, bufferDays],
  );

  const canPickup = (d: string) =>
    d >= today &&
    d <= maxPickup &&
    !hours.closed_weekdays.includes(weekday(d)) &&
    openSlots(d, hours).length > 0 &&
    fits(d, d);

  const lastReturn = useMemo(() => {
    if (!pickup || !fits(pickup, pickup)) return null;
    let last = pickup;
    for (let i = 1; i < MAX_DAYS; i++) {
      const r = addDays(pickup, i);
      if (!fits(pickup, r)) break;
      last = r;
    }
    return last;
  }, [pickup, fits]);

  const choosingReturn = pickup !== null && ret === null;
  const canReturn = (d: string) => choosingReturn && lastReturn !== null && d >= pickup! && d <= lastReturn;
  // While she is choosing a return, a later day that cannot be one is shown as
  // unavailable rather than quietly restarting the booking from it; an earlier
  // day she could collect on still restarts it, which is what a tap there means.
  const selectable = (d: string) =>
    ready && (choosingReturn ? canReturn(d) || (d < pickup! && canPickup(d)) : canPickup(d));

  const choose = (d: string) => {
    if (!selectable(d)) return;
    if (canReturn(d)) onChange(pickup, d);
    else onChange(d, null);
  };

  // What the stitched length currently runs to: the chosen return, or while
  // she is still choosing, the day under the pointer or the keyboard focus.
  const end = ret ?? (choosingReturn && hover && canReturn(hover) ? hover : null);
  const tailEnd = ret && bufferDays > 0 ? addDays(ret, bufferDays) : null;

  const lastVisible = addMonths(view, count - 1);
  const months = Array.from({ length: count }, (_, i) => addMonths(view, i));
  const visible = (d: string) => monthOf(d) >= view && monthOf(d) <= lastVisible;
  // The one tabbable day: the focused day when it is on screen, else the first
  // day she could choose in view, else the first of the month.
  const tabDay = visible(focus)
    ? focus
    : (Array.from({ length: daysIn(view) }, (_, i) => `${view}-${String(i + 1).padStart(2, "0")}`).find(selectable) ??
      `${view}-01`);

  useEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    rootRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus();
  }, [focus, view]);

  const move = (e: KeyboardEvent, d: string) => {
    const next = (() => {
      switch (e.key) {
        case "ArrowLeft": return addDays(d, -1);
        case "ArrowRight": return addDays(d, 1);
        case "ArrowUp": return addDays(d, -7);
        case "ArrowDown": return addDays(d, 7);
        case "Home": return addDays(d, -col(d));
        case "End": return addDays(d, 6 - col(d));
        case "PageUp": return shiftMonth(d, -1);
        case "PageDown": return shiftMonth(d, 1);
        default: return null;
      }
    })();
    if (!next) return;
    e.preventDefault();
    const clamped = next < `${firstMonth}-01` ? `${firstMonth}-01` : next > lastDay ? lastDay : next;
    if (monthOf(clamped) < view) setView(monthOf(clamped));
    else if (monthOf(clamped) > lastVisible) setView(addMonths(monthOf(clamped), -(count - 1)));
    wantFocus.current = true;
    setFocus(clamped);
    if (choosingReturn) setHover(clamped);
  };

  const closedNames = hours.closed_weekdays.map((n) => WEEKDAY_NAMES_SUN0[n]);
  const prompt = !ready
    ? "Reading the calendar."
    : !pickup
      ? "Choose the day you collect."
      : !ret
        ? lastReturn && lastReturn < addDays(pickup, MAX_DAYS - 1)
          ? `Now the day you bring ${pronoun} back, by ${formatDay(lastReturn)} at the latest.`
          : `Now the day you bring ${pronoun} back.`
        : "To change the dates, choose a new pickup day.";

  return (
    <div ref={rootRef}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-body text-ink-900">
          <span aria-live="polite">{prompt}</span>
          {pickup && (
            <button
              type="button"
              onClick={() => onChange(null, null)}
              className="ml-3 inline-flex min-h-[44px] items-center text-caption text-ink-600 underline underline-offset-4 hover:text-ink-900"
            >
              Clear dates
            </button>
          )}
        </p>
        <div className="flex shrink-0">
          <PageButton label="Earlier month" dir={-1} disabled={view <= firstMonth} onClick={() => setView(addMonths(view, -1))} />
          <PageButton label="Later month" dir={1} disabled={lastVisible >= monthOf(lastDay)} onClick={() => setView(addMonths(view, 1))} />
        </div>
      </div>

      <div
        className={`mt-6 grid gap-x-10 gap-y-10 ${count === 2 ? "grid-cols-2" : "grid-cols-1"} ${ready ? "" : "opacity-60"}`}
        onPointerLeave={() => setHover(null)}
      >
        {months.map((m) => {
          const first = `${m}-01`;
          const start = addDays(first, -col(first));
          const cells = Math.ceil((col(first) + daysIn(m)) / 7) * 7;
          const weeks = Array.from({ length: cells / 7 }, (_, w) =>
            Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i)),
          );
          const labelId = `${uid}-${m}`;
          return (
            <div key={m} className="min-w-0">
              <h3 id={labelId} className="flex items-baseline gap-2 border-b border-porcelain-200 pb-3 text-h3 italic">
                {MONTH.format(utc(first))}
                <span className="tabular font-sans text-caption not-italic text-ink-600">{m.slice(0, 4)}</span>
              </h3>
              <div role="grid" aria-labelledby={labelId} className="mt-3">
                <div role="row" className="grid grid-cols-7">
                  {WEEKDAYS.map((w) => (
                    <span
                      key={w}
                      role="columnheader"
                      aria-label={w}
                      className="py-2 text-center text-eyebrow font-medium uppercase tracking-[0.12em] text-ink-600"
                    >
                      {w.slice(0, 2)}
                    </span>
                  ))}
                </div>
                {weeks.map((week) => (
                  <div role="row" key={week[0]} className="grid grid-cols-7">
                    {week.map((d) => {
                      if (monthOf(d) !== m) return <span key={d} role="gridcell" className="h-12" />;
                      const held = isBlockedDay(d, union);
                      const ok = selectable(d);
                      const isPickup = d === pickup;
                      const isEnd = end !== null && d === end;
                      const inLength = pickup !== null && end !== null && d > pickup && d < end;
                      const long = end !== null && pickup !== null && end > pickup;
                      const tail = ret !== null && tailEnd !== null && d > ret && d <= tailEnd;
                      const past = d < today;
                      const closed = hours.closed_weekdays.includes(weekday(d));
                      const chosen = isPickup || d === ret;

                      const label = [
                        LONG.format(utc(d)),
                        d === today && "today",
                        isPickup && "your pickup day",
                        d === ret && "your return day",
                        inLength && ret && "inside your booking",
                        tail && "kept by the shop to ready the pieces",
                        held && "held for another booking",
                        !ok && !held && !chosen && !inLength && !tail && (past ? "past" : closed && !choosingReturn ? "shop closed for pickups" : "not available"),
                      ]
                        .filter(Boolean)
                        .join(", ");

                      return (
                        <div
                          key={d}
                          role="gridcell"
                          aria-selected={chosen || (inLength && ret !== null) || undefined}
                          className="relative h-12"
                        >
                          {long && (isPickup || isEnd || inLength) && (
                            <span
                              aria-hidden="true"
                              className={`absolute inset-y-1.5 ${ret ? "bg-violet-100" : "bg-violet-100/60"} ${isPickup ? "left-1/2 right-0" : isEnd ? "left-0 right-1/2" : "inset-x-0"}`}
                              style={stitch("var(--color-gold-600)")}
                            />
                          )}
                          {tail && (
                            <span aria-hidden="true" className="absolute inset-x-0 bottom-1.5 h-2" style={stitch("var(--color-violet-500)")} />
                          )}
                          {held && <span aria-hidden="true" className="absolute inset-1" style={HATCH} />}
                          <button
                            type="button"
                            data-day={d}
                            tabIndex={d === tabDay ? 0 : -1}
                            aria-label={label}
                            aria-disabled={!ok}
                            onClick={() => choose(d)}
                            onKeyDown={(e) => move(e, d)}
                            onFocus={() => {
                              setFocus(d);
                              if (choosingReturn) setHover(d);
                            }}
                            onPointerEnter={() => choosingReturn && setHover(d)}
                            className={`group relative flex h-full w-full items-center justify-center font-display text-[1.0625rem] tabular transition-colors duration-[180ms] ${
                              isPickup || d === ret
                                ? "text-porcelain-50"
                                : ok
                                  ? "cursor-pointer text-ink-900"
                                  : // One weight for every unavailable day: ink-400 is decoration
                                    // only (3.31:1 on porcelain). The hatch alone marks a day held
                                    // by another booking, which is what the legend promises.
                                    "cursor-not-allowed text-ink-600"
                            }`}
                          >
                            {(isPickup || d === ret) && (
                              <span
                                aria-hidden="true"
                                className="absolute inset-x-0.5 inset-y-1.5 bg-violet-800"
                                style={{ clipPath: !long ? undefined : isPickup ? TAG_START : TAG_END }}
                              />
                            )}
                            {isEnd && !ret && (
                              <span aria-hidden="true" className="absolute inset-x-0.5 inset-y-1.5 border border-violet-800" />
                            )}
                            <span className="relative">{Number(d.slice(8, 10))}</span>
                            {d === today && (
                              <span
                                aria-hidden="true"
                                className={`absolute bottom-2.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${chosen ? "bg-gold-500" : "bg-gold-600"}`}
                              />
                            )}
                            {ok && !chosen && (
                              <span
                                aria-hidden="true"
                                className="absolute bottom-2.5 left-1/2 h-px w-4 -translate-x-1/2 scale-x-0 bg-gold-600 transition-transform duration-[180ms] ease-out-strong group-hover:scale-x-100"
                              />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-caption text-ink-600">
        <li className="flex items-center gap-2.5">
          <span aria-hidden="true" className="h-4 w-5 border border-porcelain-200" style={HATCH} />
          Held for another booking
        </li>
        <li className="flex items-center gap-2.5">
          <span aria-hidden="true" className="h-4 w-5 bg-violet-100" style={stitch("var(--color-gold-600)")} />
          Your dates
        </li>
        {bufferDays > 0 && (
          <li className="flex items-center gap-2.5">
            <span aria-hidden="true" className="h-2 w-5" style={stitch("var(--color-violet-500)")} />
            {bufferDays === 1 ? "A day" : `${bufferDays} days`} the shop keeps after a return to ready the pieces
          </li>
        )}
        {closedNames.length > 0 && <li>No pickups on {closedNames.join(" or ")}, when the shop is closed</li>}
      </ul>
    </div>
  );
}

function PageButton({ label, dir, disabled, onClick }: { label: string; dir: 1 | -1; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="press inline-flex h-11 w-11 items-center justify-center text-ink-900 transition-colors duration-[180ms] hover:text-gold-700 disabled:cursor-not-allowed disabled:text-ink-400"
    >
      <svg width="22" height="12" viewBox="0 0 22 12" fill="none" aria-hidden="true" className={dir < 0 ? "rotate-180" : ""}>
        <path d="M1 6h19M15 1l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
