# Comms Flow Spec — v2 (17 September 2026)

**Delta over `COMMS_FLOW_SPEC.md` (v1.0).** v1.0 is still the reference for the
WhatsApp webhook mechanics (§2.2 signature verification, idempotency, the
subscribe handshake) and for the SMS gateway's quota consumer (§3). Everything
v1.0 says about **money is void**: there is no advance, no UTR, no payment to
verify, and no message may mention one. `specs/BOOKING_ENGINE_SPEC_V2.md` is the
authority on what a booking *is*, and this file says what the shop and the
customer are told about it.

Where v2 is silent, v1.0 governs. Where they disagree, v2 wins.

---

## 1. What changed, and why it changes the messages

v1.0 was written for a booking that was paid for. Its two-stage flow — "received,
your advance is being verified" then "confirmed" — described a customer waiting
on the shop to *check a payment*. The owner retired payments from the website on
15 September. A booking is now **a request the shop confirms**, holding its dates
on the exclusion constraint while it waits, and **lapsing on its own** if the shop
does not answer inside the admin-set window (default 24h).

Three consequences the message set has to carry:

1. **MSG-1 cannot say "being verified".** It says the shop will confirm, and when
   the request lapses if they do not.
2. **There is a new terminal state nobody is told about in v1.0: `lapsed`.** The
   dates come free again and the customer never heard a word. A request that dies
   of silence is the single worst thing this system can do to a bride, and it is
   the reason the email leg is worth building before the WhatsApp leg.
3. **The shop is now the bottleneck.** Under v1.0 the customer waited on a human
   checking a payment; under v2 the request expires unless a human acts. The
   owner notification stops being a courtesy and becomes load-bearing: if she
   does not see the request, it lapses. Today she learns a request exists **only
   by opening the admin panel** — nothing in the repo sends anything.

## 2. The event set

Every row is an event the engine already produces. "Who" is who must be told.

| # | Event | Raised by | Customer | Owner |
|---|---|---|---|---|
| E1 | Request created | `createBooking()` | receipt: what, when, "we will confirm" | **new request, act within the window** |
| E2 | Request confirmed | `confirmBooking()` | confirmation + pickup day, time, address | — |
| E3 | Request declined | `declineBooking()` | declined, with the shop's reason if given | — |
| E4 | Request lapsed | `lapseExpired()` sweep | lapsed unanswered, please call | **lapsed unanswered** (a miss worth seeing) |
| E5 | Confirmed booking cancelled by shop | `cancelConfirmed()` | cancelled, with reason | — |
| E6 | Cancelled, nobody answered the phone | `cancelNoAnswer()` | we called and could not reach you | — |
| E7 | Cancelled by the customer | `cancelByCustomer()` | acknowledgement | **cancelled, dates are free** |
| E8 | Extension requested | `requestExtension()` | acknowledgement | **decide it** |
| E9 | Extension approved / rejected | `approveExtension()` / `rejectExtension()` | the decision + the new return day | — |
| E10 | Pickup-day reminder | scheduler | reminder + address | — |
| E11 | Return-day reminder | scheduler | reminder + how to extend | — |

**E10 and E11 are NOT built in this phase, and the reason is architectural, not
effort.** They need a clock. `CLAUDE.md` records why there is no cron on this
project: Neon's free tier suspends after five idle minutes, and a schedule that
wakes it hourly to find nothing keeps a free database awake for nothing anyone
can see. The lazy-sweep trick that lapses expired requests works because *a
reader is already there* — it cannot fire a reminder on a day when nobody visits
the site. Options when this is picked up: a Cloudflare Cron Trigger (free, and it
is the Worker that wakes, not Neon — the query only runs if the sweep finds
rows), or fold the reminder into the owner's morning call list, which she already
opens daily. **Do not build E10/E11 on the lazy sweep.** A reminder that arrives
only if a stranger happens to load the site is worse than no reminder.

## 3. The ladder, and what of it can actually ship today

v1.0 §1's ladder stands as the design. What is honest about September 2026:

| Priority | Channel | Blocked on | State |
|---|---|---|---|
| 1 | WhatsApp free-form (24h window) | spare SIM registered on Meta Cloud API; `WA_*` secrets | **dark** |
| 2 | WhatsApp utility template | the above, plus the owner turning the paid toggle on | **dark**, default off, stays off |
| 3 | SMS via the owner's Android gateway | the gateway app installed on her phone; `GATEWAY_*` secrets | **dark** |
| 4 | Email (Resend) | a Resend account; a verified sending domain for customer mail | **shippable, with one caveat** |
| 5 | Owner web push | Phase 4's PWA | **dark** |

**The Resend caveat, stated plainly because it decides what this phase delivers.**
Resend will not send to arbitrary recipients from an unverified domain; until a
domain is verified it delivers only to the address that owns the Resend account.
This site has no custom domain — it is `vivaah.vivaah.workers.dev`, and the
domain is the one thing the client pays for and has not bought yet. So:

- **Owner notifications (E1, E4, E7, E8) work the day a Resend key exists**, because
  the owner's address can be the account address. These are the load-bearing ones:
  they are what stops a request lapsing unseen.
- **Customer mail (E1–E9) is written, tested and dark** until a domain is
  verified. It must not half-send: an email that reaches the shop but not the
  bride is worse than a clean "not configured".

Nothing here may send a paid message. Priority 2 is the only paid channel and its
toggle defaults false; the send helper must refuse it unless
`settings.wa_template_enabled` is true, exactly as v1.0 §1 requires.

## 4. The layer to build

One module, `site/lib/comms/`, with four rules:

1. **Events in, channels out.** Callers raise a typed event (`notify({kind: 'booking.created', booking})`).
   They never name a channel. This is what keeps the WhatsApp and SMS legs from
   rewriting `lib/booking.ts` when they light up.
2. **A dark channel is a normal outcome, not an error.** Missing secrets mean
   `skipped: not_configured`, logged, no throw. A booking must never fail because
   a notification could not be sent — the row in Postgres is the booking, the
   message is a courtesy. Wrap every send so a channel failure cannot propagate
   into the caller's transaction.
3. **Never on the request's critical path.** Sends go through `after()` from
   `next/server` so the customer's confirmation renders without waiting on an
   SMTP round trip. Verify `after()` survives the OpenNext build before relying
   on it (the adapter's `waitUntil` is the fallback); if neither holds, the send
   is awaited and the timeout is short.
4. **Every attempt is recorded.** One row per event per channel in `comms_log`,
   including the skips. Without the skips the table lies by omission: "no row"
   would mean both "nothing happened" and "we tried and the channel was dark".

### 4.1 `0010_comms_log.sql`

```sql
create table public.comms_log (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references public.bookings(id) on delete cascade,
  event       text not null,            -- 'booking.created', 'booking.lapsed', ...
  channel     text not null,            -- 'email' | 'whatsapp' | 'sms' | 'push'
  recipient   text not null,            -- 'owner' | 'customer'
  address     text,                     -- the email/phone actually used, null when skipped
  status      text not null,            -- 'sent' | 'failed' | 'skipped'
  detail      text,                     -- provider id on success, reason on skip/failure
  created_at  timestamptz not null default now()
);
create index comms_log_booking_idx on public.comms_log (booking_id, created_at desc);
alter table public.comms_log enable row level security;
-- No grants to app_public: comms rows carry customer addresses and are owner-only,
-- like every other booking-adjacent table. verify-schema asserts this.
```

**`alter table ... enable row level security` is not optional.** `scripts/verify-schema.mjs`
fails on any public table without RLS — it caught `schema_migrations` itself — and
the gate is 17/17 today. A new table with no grants and no RLS would break it.
Add `comms_log` to the list of tables verify-schema proves `app_public` cannot
reach, beside `sms_queue` and `wa_contacts`.

### 4.2 Copy

The register is the site's: plain, warm, no heritage (memory: `shop-story-facts`),
**no em dashes** (they were stripped from the seeded copy on 10 Sep), female-only
address, and **no mention of money moving through the site**. Every customer
message carries the status link (`/booking/<code>` with its token — the 32-byte
token from BOOKING_ENGINE_SPEC_V2, never the 4-character code alone, since
reading a booking now means being able to cancel it) and the shop's phone number.
Every owner message carries the admin deep link and the lapse deadline.

Templates live in `site_content` under `comms.templates` so the owner can edit
them, seeded with the English set; the Hindi column stays empty until Phase 4
lights the EN/हिं toggle.

## 5. What "done" means for this phase

Gates, all of which are already green and must stay so: `verify-booking` 35/35,
`verify-schema` 17/17 **plus the new comms_log assertions**, `site-audit` 396/396,
`hero-scrim` 8/8, `tsc` clean.

New, and the honest test of this phase: **a booking request created through the
browser produces exactly the expected rows in `comms_log`**, with the email leg
reporting `sent` when a key is present and `skipped: not_configured` when it is
not, and `createBooking` succeeding identically either way. The existing
end-to-end harness (`scripts/verify-booking-e2e.mts`) already drives one
booking's whole life through real Chrome and deletes its row in `finally`; the
comms assertions belong there rather than in a new harness.

## 6. Still blocked on the owner, tracked here so it is not rediscovered

- **Resend account + API key** → owner notifications light up.
- **A domain** → customer email lights up. Also unblocks SPF/DKIM (v1.0 §4).
- **Spare SIM on Meta Cloud API** → the WhatsApp leg (v1.0 §2 is still the spec).
- **The gateway app on her Android** → the SMS leg (v1.0 §3 is still the spec).
- **Her email address and the shop's real phone number** — the second is already
  `TODO(owner)` in `lib/site.ts` and the front door renders `+91 00000 00000`.

---

## 7. Build record (17 September 2026)

What was built, what was decided along the way, and what is still open. §1 to §6
are the plan; this section is what the plan turned into.

### 7.1 The shape it landed in

`site/lib/comms/` is four files and no more: `types.ts` (the event set and the
row a message is built from, kept apart so the copy can import it without
pulling in the database client), `messages.ts` (every string), `email.ts` (the
one live channel) and `index.ts` (`notify`, which loads the booking, builds both
messages, walks the channels and records what each did).

`lapseExpired()` changed shape to serve E4. It returned a count; it now returns
the ids it lapsed, because a request that dies of silence is the one event the
customer never hears about on her own and the count could not say whose. Every
reader that sweeps now passes those ids to `notifyLapsed`.

`createBooking()` gained `id` on its success result. The route already had the
code and the raw token, but the raw token exists only in that one place, so
`booking.created` is the only message that can deep-link her straight in, and it
needed the id to load the booking.

### 7.2 `after()` was verified on workerd, not assumed

§4 rule 3 made this conditional: sends go through `after()` **if** it survives
the OpenNext build, with the adapter's `waitUntil` as the fallback. It does, and
it was checked rather than taken on trust, because the whole layer sits on it.

The check drove the production path that needs no bot token: a pending booking
was created with `expires_at` already past, the **built** Worker was run under
`wrangler dev` against the real database, and `GET /api/availability` was called
once. The booking came back `cancelled / lapsed` and two `comms_log` rows for
`booking.lapsed` were written after the response had gone. So `after()` runs
under workerd through OpenNext, and the fallback is not needed.

Worth knowing if this is ever revisited: the booking POST cannot be exercised
this way. `lib/turnstile.ts` stands in Cloudflare's always-pass test secret only
outside production, and a built Worker is production, so without a real
`TURNSTILE_SECRET_KEY` every booking through the built Worker is refused 403 by
design. The lapse sweep is the honest way in.

### 7.3 What the gates say

All green, from `site/` with the dev server up:

| Gate | Was | Now |
|---|---|---|
| `scripts/verify-schema.mjs` | 17/17 | **18/18** (`comms_log` exists, and `app_public` is refused on it) |
| `scripts/verify-booking.mts` | 35/35 | **38/38** (both legs logged, `notify` reports what it logged, an unknown id is a no-op) |
| `scripts/verify-booking-e2e.mts` | 32/32 | **64/64** |
| `site-audit.mjs` | 396/396 | 396/396 |
| `hero-scrim-verify.mjs` | 8/8 | 8/8 |
| `tsc` | clean | clean |

Two things had to be fixed in the end-to-end gate before it could report, and
neither was a fault in the site:

**It was racing Cloudflare.** The gate filled the form and pressed Reserve faster
than Turnstile issues its token, so the form refused the submit and said so, and
the gate read that as a navigation timeout that looked like a booking failure.
It now waits for the token the way a visitor waits for it. The form's own
behaviour was correct throughout.

**It was reading between two writes.** `notify` records one channel at a time,
so polling until `comms_log` stopped being empty could see the owner's row alone
and call a working path broken. It now waits for both legs to settle.

### 7.4 Open, and deliberately not built

**Owner-editable templates (§4.2) are NOT built.** The copy lives in
`lib/comms/messages.ts`, not in `site_content` under `comms.templates`. This is
the one place this phase falls short of its own spec, and it is recorded rather
than quietly dropped. The reason it is not a small job: the messages interpolate
a booking (the items and their sizes, a pickup that reads differently for a
collection than for a rental, an hours-until-lapse computed from two timestamps,
a status link carrying a single-use token), so making them editable means giving
the owner a placeholder language and somewhere to edit it, plus a way to stop a
broken template from silencing a notification. Until then the register is fixed
in code and reviewed there.

**E10 and E11 (the two reminders) are NOT built**, for the architectural reason
§2 gives: they need a clock, and the lazy sweep is not one. Nothing here changes
that.

**Everything is still dark.** Every channel reports `skipped: not_configured`
until the owner supplies what §6 lists. That is the designed resting state, not
a failure, and it is what the gates assert against today. The first real send
will be an owner alert on the day a Resend key exists; customer mail waits on a
domain.
