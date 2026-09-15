# Booking Engine Spec — v2 (amendment over v1.0)

**15 September 2026. Author: Opus 5 (Fable retired). Owner-approved decisions, same day.**
v1.0 (`BOOKING_ENGINE_SPEC.md`) still governs wherever this document is silent: the
state machine's shape, the exclusion constraint as the only authority on dates, the
extension mechanics, the reviews route. This file records what the owner changed
and what follows from it mechanically.

## 0. What changed, and why

The owner, asked how customers should be told about the UPI hold:

> "We are not taking any payments through the website. It's just a booking web
> application: we take the booking and everything else is handled at the shop."

That retires IMPLEMENTATION_PLAN §2.3 and v1.0 §2.2/§2.3 (UPI QR, UTR form, payment
verification). Four further decisions were taken with it:

| # | Decision | Consequence |
|---|---|---|
| D1 | No payment of any kind on the site | No UPI step, no UTR, no advance collected online. Prices are shown as payable at the shop. `payment_ref*` columns stay (never edit applied migrations) and are unused. |
| D2 | An unconfirmed booking blocks its dates at once, and lapses if the shop does not confirm within an admin-set window | `pending` keeps holding through the exclusion constraint (schema unchanged). `booking_expiry_minutes` becomes the *confirm-within* window; default raised 120 → 1440. |
| D3 | The customer picks a pickup **time** as well as dates | New column `bookings.pickup_time`. |
| D4 | The customer may cancel online until **6 hours before pickup** | New setting `cancel_cutoff_hours = 6`. |
| D5 | One booking page for a product page's Reserve and for the selection tray | `/reserve?items=slug,slug`. Rentals + jewellery only; retail waits for Phase 3. |
| D6 | WhatsApp reserve buttons replaced by online booking; "Ask on WhatsApp" stays as a quieter fallback | Copy change across the site. |

## 1. State machine (meaning changes, shape does not)

```
pending ──confirm (shop)──▶ confirmed ──pickup──▶ picked_up ──return──▶ returned
   │                            │
   ├─lapse (window passed)─▶ cancelled ◀── cancel (customer, before cutoff) ──┤
   ├─decline (shop)────────▶ cancelled ◀── cancel (shop) ─────────────────────┘
   └─cancel (customer)─────▶ cancelled ──revive (shop)──▶ confirmed  (DB re-checks)
```

- `pending` now means **requested, awaiting the shop's confirmation**. It holds dates.
- "Confirm" in admin replaces "verify payment": the owner has called or messaged the
  customer and accepts the booking. Same SQL transition as v1.0 (`verified_at` is
  reused as *confirmed at*).
- New column `bookings.cancelled_by` ∈ `customer | shop | lapsed`, set on every
  transition into `cancelled`, cleared on revive. Replaces the `[auto-expired]`
  note-append in v1.0 §2.4.

## 2. Flows

### 2.1 Create booking
Input: `items` (1–12 product slugs, active, `type in ('rental','jewellery')`, no
duplicates), `pickup` (date), `return` (date), `pickupTime` (HH:MM), `name`, `phone`,
`email?`, `note?` (≤ 500 chars), Turnstile token.

Validation (server, all of it; client checks are UX only):
- Dates are Asia/Kolkata calendar dates. `pickup ≥ today`, `return ≥ pickup`,
  inclusive length ≤ 30 days, `pickup ≤ today + 180 days`.
- `pickupTime` lies on the configured grid inside `pickup_hours` (§4) and the pickup
  weekday is not in `closed_weekdays`.
- `pickup_at` (pickup date + time, IST) is at least **2 hours** ahead of now, so the
  shop has a chance to confirm before she arrives.
- Phone normalised to Indian mobile `+91 XXXXX XXXXX` (10 digits, leading 6–9).
- Rate limits (§5), Turnstile.

Then, in order:
1. **Lapse sweep** (§2.4) on the owner connection, so a lapsed hold cannot refuse a
   fresh request just because the cron has not run yet.
2. `expires_at = least(now() + booking_expiry_minutes, pickup_at)`. A booking made
   for this evening lapses at pickup time, not tomorrow.
3. Per item: `buffer_days` snapshot from settings, `price` = the product's
   `rental_price` (a listed price for the owner's reference, not an amount charged).
   `amount_due = 0`: nothing is owed through the site.
4. Code `VVH-` + 4 Crockford base32 chars (unchanged; it is for reading aloud over
   the phone). Access token: 32 random bytes, base64url; only its SHA-256 is stored
   (`bookings.access_hash`).
5. **One statement** (CTE: insert booking, insert items from the booking's id).
   A single statement is atomic on the Neon HTTP driver without an interactive
   transaction. `23P01` → 409 `dates_taken` with the product(s) that collided.
   `23505` on `code` → regenerate, retry ≤ 5.
6. Response: `{ code, token }`. The client goes to `/booking/<code>?k=<token>`.

### 2.2 (retired) UPI payment step
Removed by D1.

### 2.3 Confirmation (admin)
Inbox shows pending requests soonest-lapsing first, with pickup date and time, the
customer's note, and one-tap WhatsApp/call links. **Confirm** = v1.0's verify
transition. **Decline** = pending → cancelled, `cancelled_by = 'shop'`.

### 2.4 Lapse
```sql
update bookings set status = 'cancelled', cancelled_by = 'lapsed'
 where status = 'pending' and expires_at < now();
```
Run lazily at the head of: booking creation, the availability route, the admin
inbox, and the status page. A Cloudflare cron (every 15 min) runs it as well so the
calendar is honest when nobody is using the site. Lazy is the guarantee; cron is
tidiness.

### 2.5 Extension — v1.0 unchanged, except
The charge is quoted and recorded; it is paid at the shop (v1.0 already said
"collect at pickup/return, just record it"). Requests allowed while `confirmed` or
`picked_up`, one open request per booking.

### 2.6 Customer cancellation (new)
`POST /api/bookings/<code>/cancel` with the access token. Allowed when
`status in ('pending','confirmed')` **and** `now() < pickup_at - cancel_cutoff_hours`.
Guarded in the UPDATE's WHERE clause itself, so the check and the write cannot be
separated by a race. Legacy rows with no `pickup_time` use the shop's opening time.

### 2.7 Jewellery drawer — v1.0 unchanged
Implemented on `/reserve`: once dates are chosen, offer active jewellery free for the
same range; adding appends to `items`.

## 3. Access to a booking (security amendment)

v1.0 made the booking code the authority ("code IS the auth"). A 4-character code is
~1M values: enumerable, and D4 turns read access into the power to cancel someone
else's booking. So:

- The **status link** carries the access token: `/booking/VVH-7K3M?k=<token>`. The
  server looks the booking up by code and `sha256(token)`; only the hash is stored,
  so a database read never yields a working link. (Timing on a hash comparison
  leaks nothing usable: matching a prefix of a SHA-256 does not help find a token.)
- A code + phone exchange sets an httpOnly cookie for that one booking, HMAC-signed
  with `SESSION_SECRET` under a `booking:` prefix, 7-day expiry.
- A customer who has lost the link can open the booking with **code + the phone
  number it was made with** (rate-limited, §5). That exchange returns the page, not
  the token.
- Without either, the route returns the same 404 whether or not the code exists.
- Responses expose code, pieces, dates, pickup time, status, shop info, and the
  customer's own phone masked (`98•••••210`). Never an email, never a note.

## 4. Settings

| key | default | public | meaning |
|---|---|---|---|
| `booking_expiry_minutes` | 1440 | no | confirm-within window (D2) |
| `cancel_cutoff_hours` | 6 | yes | D4 |
| `pickup_hours` | `{"open":"11:00","close":"20:00","step_minutes":30,"closed_weekdays":[0]}` | yes | D3; weekdays 0 = Sunday. Seeded to match the site's current "Mon–Sat, 11am – 8pm" placeholder; owner edits in admin. |
| `buffer_days` | 2 | **yes** (was no) | the calendar needs it to grey out a return date whose buffer would run into the next booking |
| `upi` | — | — | unused (D1); left in place, removed from the admin form |

## 5. Rate limits

Upstash sliding windows as locked, **when `UPSTASH_REDIS_REST_URL`/`_TOKEN` are set**.
Until then the phone limit is enforced from the bookings table itself (count of
bookings created for that phone in the last hour), which needs no new service and
cannot be bypassed by rotating IPs. Per-IP limits wait for Upstash or the Cloudflare
WAF rule on the real domain.

| Route | Limit |
|---|---|
| `POST /api/bookings` | 3/hour/phone, 10/hour/IP |
| code + phone lookup | 5/hour/IP |
| cancel | 3/day/code |
| extension | 3/day/code |

Turnstile is required in production on create and on code + phone lookup. Dev uses
Cloudflare's published always-pass test keys when no key is configured.

## 6. API inventory (replaces v1.0 §4 for these rows)

| Route | Method | Auth |
|---|---|---|
| `/api/availability?items=a,b` | GET | anon; blocked ranges + buffer + pickup hours only |
| `/api/bookings` | POST | anon + Turnstile |
| `/api/bookings/[code]/cancel` | POST | token |
| `/api/bookings/[code]/extension` | POST | token |
| `/api/bookings/lookup` | POST | code + phone + Turnstile |

Deleted: `/api/bookings/[code]/utr`. `GET /api/bookings/[code]` is not needed: the
status page is a server component reading on the owner connection.

## 7. Invariants → tests (v1.0 §5 still apply; additions)

9. Cancel after the cutoff → refused, row unchanged; before → cancelled, dates free.
10. Wrong or missing token → 404 indistinguishable from an unknown code.
11. A lapsed pending booking does not refuse a new request for its dates, with the
    cron never having run.
12. `expires_at` never later than `pickup_at`.
13. Items of type `retail`, inactive products, or duplicates → 400, nothing written.
