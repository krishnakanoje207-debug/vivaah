# Booking Engine Spec (F2) — v1.0

Implements IMPLEMENTATION_PLAN §2.3/§2.5/§6 on top of `specs/schema.sql`. Opus: implement mechanically; if a case isn't covered here, **escalate to Fable — do not improvise booking logic.** All writes to `bookings`/`booking_items`/`extension_requests` happen in **server routes with the service-role key**; the anon client never touches these tables.

## 1. State machine

```
pending ──verify──▶ confirmed ──pickup──▶ picked_up ──return──▶ returned
   │                    │                     │
   ├─expire(cron)──▶ cancelled ◀──cancel──────┘   (admin/customer cancel per policy)
   └─cancel───────▶ cancelled ──revive──▶ confirmed   (admin-only, DB re-checks dates)
```

Allowed transitions (everything else = 409):
| From | To | Actor | Side effects |
|---|---|---|---|
| pending | confirmed | admin (verify) | `verified_at=now()`, `expires_at=null`; fire comms "confirmed" |
| pending | cancelled | cron (expiry) or admin | dates release automatically (constraint ignores cancelled) |
| confirmed | picked_up | admin | — |
| confirmed | cancelled | admin (per policy) | fire comms "cancelled" |
| picked_up | returned | admin | dates release |
| cancelled | confirmed | admin (**revive**) | single `UPDATE status`; sync trigger re-inserts holds → **DB rejects if dates were taken meanwhile** — surface as "dates no longer free" |

Status lives on `bookings`; triggers mirror to `booking_items`. Never update `booking_items.status/blocked_range` directly.

## 2. Flows

### 2.1 Create booking (rental, with optional jewellery bundle)
1. Input: product slug, optional jewellery product ids (≤ settings cap, default 3), pickup_date, return_date, name, phone, email?. Validate: pickup ≥ today, return ≥ pickup, range length ≤ 30 days, Turnstile token, rate limits (§5).
2. Compute per item: `buffer_days` = current `settings.buffer_days` (snapshot), `price` = product's `prebook_charge` (jewellery without a charge → 0). `amount_due` = Σ prebook charges.
3. Generate `code`: `VVH-` + 4 chars Crockford base32 (no I/L/O/U); on unique collision retry (max 5).
4. Single transaction: insert `bookings` (status `pending`, `expires_at = now() + settings.booking_expiry_minutes`), insert all `booking_items`. **Exclusion violation (SQLSTATE 23P01) → 409 "those dates were just taken"** — this is the race loser's path; render alternatives (nearest free ranges from `product_unavailable_ranges`).
5. Response → UPI step (§2.2). No comms yet.

### 2.2 UPI payment step
- Show `settings.upi` (QR image, number, ID + copy buttons) + intent link `upi://pay?pa=<id>&pn=<shop>&am=<amount>&tn=<code>`.
- Customer submits UTR: 12–22 alphanumeric, stored on `payment_ref` + `payment_ref_submitted_at`. Editable while `pending` (typos). Success screen = WhatsApp CONFIRM deep-link button (per COMMS_FLOW_SPEC) + booking-status link.
- A pending booking **holds dates even before UTR entry** (hold started at insert). Expiry covers abandonment.

### 2.3 Verification (admin)
- Inbox shows pending bookings with UTR. One tap **Confirm** → transition per §1; **Reject** → cancelled (reason optional). Confirm triggers comms ladder.
- If a booking expired seconds before the tap: admin sees expired state; **Revive** runs the cancelled→confirmed transition (DB decides).

### 2.4 Expiry cron (Cloudflare, every 5 min)
`UPDATE bookings SET status='cancelled', notes=coalesce(notes,'')||' [auto-expired]' WHERE status='pending' AND expires_at < now()`. For each expired row with a submitted UTR, queue an owner notification (possible slow verification, revive available).

### 2.5 Extension
1. Customer (status page) or admin requests new inclusive return date (> current). Quote `charge_amount = extension_rate × extra_days` per rental item (Σ across items that have a rate).
2. Insert `extension_requests` (pending). Notify owner.
3. **Approve** (admin, single transaction): `UPDATE bookings SET booked_range = daterange(lower(booked_range), requested_return + 1, '[)') WHERE id=… AND status IN ('confirmed','picked_up')`; sync trigger re-checks every item against the next booking's block. 23P01 → mark request `rejected`, message "not possible — the outfit is booked right after your dates". Success → `approved`, `amount_due += charge_amount`, comms update. Extra charge is paid at shop or via a second UTR (admin choice in settings) — v1: **collect at pickup/return, just record it**.
4. UI must pre-check availability before offering the request (good UX), but the UPDATE is the only authority (race-proof).

### 2.6 Retail reservation — different mechanics, decided
Retail is **stock-counted, not date-exclusive**: two customers may reserve the same dress model on the same day if stock allows, so retail must NOT go through `booking_items` (the exclusion constraint would wrongly block the second reservation). Decision:
- Retail reservations create a `bookings` row (code, customer, status machine reused; `booked_range = [pickup_date, pickup_date+1)` is informational only) and rows in a new table **`reservation_items`** (booking_id, product_id, variant_id, size, qty) with **no exclusion constraint** — added as migration `0002_retail.sql` at the start of Phase 3 (**Fable reviews that migration before it's applied**).
- Stock is decremented on create and restored on cancel/expiry, inside the server-route transaction using `SELECT … FOR UPDATE` on the variant row; reject if insufficient.
- Everything else (code, expiry of unconfirmed reservations, admin confirm, comms) reuses the rental machinery unchanged.

### 2.7 Jewellery cross-sell drawer (owner requirement, July 2026)
Most customers rent jewellery with the outfit, so the moment a rental garment is added to a booking (date selection confirmed or "book" tapped), open the **side drawer** (design per DESIGN_SPEC §6): jewellery products **availability-checked for the same `booked_range`** via `product_unavailable_ranges`, one-tap Add appends a `booking_items` row with identical dates inside the same transaction at submit time. Rules: appears once per booking flow (dismiss = don't reopen), never blocks the booking CTA, adding from the drawer re-renders the amount summary. Server re-validates availability at submit regardless (the drawer is UX, the constraint is law).

### 2.8 Reviews (owner requirement, July 2026)
- `POST /api/products/[id]/reviews` — body: name, rating 1–5, text, optional booking code (if it matches a `returned` booking containing that product → store `booking_id` = "verified renter"). Turnstile + rate limit 2/day/IP. Inserted `is_approved=false`.
- Admin inbox gets a review-moderation queue (approve/reject) in Phase 4.
- Product pages read approved reviews only (RLS enforces).

### 2.9 Scope note — rentals are category-wide
Rentals are NOT just lehengas: 8 garment categories (see schema category seeds) + jewellery, all date-exclusive via `booking_items`. The engine is category-agnostic; nothing changes mechanically.

## 3. Availability & calendar
- Public calendar data comes **only** from `product_unavailable_ranges(product_id)` (RPC, anon-safe). Client renders: booked/held (danger tint), buffer tail (dotted), free. Never expose customer data.
- Date-picker blocks: past dates, ranges intersecting any blocked range, and enforces the range-length cap. Server re-validates everything (client checks are UX only).

## 4. API route inventory (server routes, service-role)
| Route | Method | Auth | Rate limit |
|---|---|---|---|
| `/api/availability/[productId]` | GET | anon (RPC passthrough, cacheable 60s) | CF edge |
| `/api/bookings` | POST | anon + Turnstile | 3/hr/phone, 10/hr/IP |
| `/api/bookings/[code]` | GET | code IS the auth (unguessable) | 30/hr/IP |
| `/api/bookings/[code]/utr` | POST | code | 5/hr/code |
| `/api/bookings/[code]/extension` | POST | code | 3/day/code |
| `/api/bookings/[code]/cancel` | POST | code (policy-gated) | 3/day/code |
| `/api/products/[id]/reviews` | POST | anon + Turnstile | 2/day/IP |
| `/api/admin/**` | * | Supabase session + `is_admin` | 5/15min login |
| Webhooks (`/api/hooks/whatsapp`, `/api/hooks/sms-gateway`) | POST | signature verification (see COMMS spec) | CF edge |

Booking-status responses expose: code, item names/images, dates, status, amounts, shop info — **never** phone/UTR of anyone else; include own phone masked (`98•••••210`).

## 5. Invariants → tests (Fable reviews these at gate F4-1)
1. Two concurrent creates, same product, overlapping ranges → exactly one succeeds (parallel transactions test).
2. Buffer honoured: booking A returns day X with buffer 2 → create starting X+1 fails, X+3 succeeds.
3. Expiry frees dates; revive after a competing booking → fails; revive with free dates → succeeds.
4. Extension colliding with next booking's block → rejected, DB unchanged; non-colliding → range widened and items synced.
5. Cancelling parent booking cascades status to items and frees dates atomically.
6. `pending` without `expires_at` impossible (constraint).
7. Anon key: selects on bookings/booking_items return zero rows; RPC returns ranges only.
8. Same product twice in one booking → rejected by exclusion (documented; UI prevents).
