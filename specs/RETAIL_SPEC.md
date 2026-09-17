# Retail Spec — Phase 3

**16 September 2026. Author: Opus 5 (Fable retired). Owner decisions taken the same day.**

Retail is the last of the three trades that is not a real catalogue. `/retail` is a
static page whose category tiles link to `/retail?category=X`, which nothing reads;
there is no `lib/retail.ts` and no `/retail/[slug]`. Nine retail categories and the
`product_variants` table are already in Neon.

This document governs Phase 3. `BOOKING_ENGINE_SPEC_V2.md` still governs the
reservation grammar wherever this one is silent — retail reuses that engine rather
than growing a second one.

## 0. The owner's three decisions

Asked what "Reserve" means for a piece that is sold rather than rented, how long a
held piece stays held, and how much to say about stock:

| # | Decision | Consequence |
|---|---|---|
| R1 | **A retail reservation carries dates**: "add dates for which they can book" | Retail reuses `bookings`/`booking_items`, not a new table. A retail booking is a **collection appointment**: one date and a time, not a range. |
| R2 | **The shop calls about two hours before the appointment; no answer cancels the reservation** | No automatic lapse window of the rental kind. The hold stands until the appointment. `cancelled_by = 'shop'` when she cannot be reached. A `no_answer` reason is recorded so the owner can see why. |
| R3 | **Sizes are shown; counts are not** | She picks from sizes actually in stock. The page never says "only 1 left". Stock counts stay in admin. |

R2 is a *human* process, not a job: nothing in the software cancels a retail
reservation on a timer. What the software owes the owner is the call list — the
appointments coming up in the next few hours, with the number to ring.

## 1. The correctness problem, and why retail cannot use the rental constraint

`booking_items.no_double_booking` excludes on `(product_id, blocked_range)`. That is
exactly right for a rental: there is one bridal lehenga, and two overlapping holds on
it must never both commit.

It is wrong for retail. The shop has three of a kurti in M. Under that constraint the
second customer to reserve one would be refused by the database, because the
constraint knows nothing about how many exist. Worse, it keys on `product_id`, so a
reservation of the kurti in **S** would block one in **M**.

So:

- **Retail rows are excluded from `no_double_booking`.** Migration `0007` drops and
  recreates it with `and holds_dates` in the `WHERE`, where `holds_dates` is a new
  boolean on `booking_items`, set by the existing derive trigger from the product's
  type. It is true for rentals and jewellery — both are single pieces whose dates
  must not overlap — and false for retail, which is counted instead. (A new
  migration; `0001` is applied and must never be edited.)
- **Retail is guarded by stock instead, and that guard is also DB-level.** The locked
  decision that double-booking is never enforced in application code applies here for
  the same reason: two customers reserving the last M at the same moment is the same
  race.

### 1.1 Stock becomes countable

`product_variants.stock` is `jsonb` (`{"S":1,"M":2}`). JSONB cannot carry a CHECK that
the database enforces per size under concurrency, so Phase 3 normalises it:

```sql
create table public.variant_stock (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  size       text not null,
  quantity   int  not null check (quantity >= 0),   -- what the shop owns
  held       int  not null default 0 check (held >= 0),
  primary key (variant_id, size),
  constraint held_within_stock check (held <= quantity)
);
```

Reserving one unit is a single atomic statement:

```sql
update variant_stock set held = held + 1
 where variant_id = $1 and size = $2 and held < quantity
```

Zero rows updated means it was the last one and somebody else got it → `409
out_of_stock`, named to the piece and size. `held_within_stock` makes overselling
unrepresentable even if a future caller forgets the `held < quantity` guard.

`held` is released when the booking is cancelled or declined, and on collection the
owner marks it sold, which decrements `quantity` as well. Both run in the same
transaction as the status change.

`0007` backfills `variant_stock` from the existing `stock` jsonb. The jsonb column
stays (never edit an applied migration; dropping it buys nothing) and becomes
unused, like `payment_ref`.

## 2. What a retail reservation is

- One **collection date** and a **time**, on the same pickup grid and closed-weekday
  rules as rentals (`pickup_hours`).
- `booked_range` is the single day `[D, D+1)`. Retail items take `buffer_days = 0`:
  a buffer exists to ready a returned garment, and nothing comes back.
- `amount_due = 0`. Nothing is paid online — the 15 Sep decision is site-wide.
- Status flow is the rental one minus the return: `pending → confirmed → picked_up`,
  where `picked_up` means collected and paid for at the shop. `returned` is not used.
- Mixed baskets are allowed: one booking may hold a lehenga to rent and a kurti to
  buy, because the tray already gathers across trades and splitting them into two
  bookings would ask her to give her details twice.

## 3. Pages

### 3.1 `/retail`
Keeps its arcade head and its grammar. The category tiles gain a real destination and
the page gains a collection, in the order `/rentals` settled on (the catalogue above
the argument, owner's call of 14 Sep): the rail of what is in, then the categories,
then the existing editorial.

`/retail?category=X` filters in place, as `/rentals` does.

### 3.2 `/retail/[slug]`
No turntable — retail has no frame sets, and `SPIN_CATEGORIES` is lehengas only. The
page is the still gallery, the name, the price, the colour swatches, the sizes, and
the reserve.

- **Colour** is a swatch row from `product_variants.colour_hex`, each labelled with
  `colour_name` (a hex alone is not a name, and colour-blind visitors get nothing
  from it). The selected swatch drives the gallery.
- **Size** is a row of the sizes with stock in the chosen colour (R3: no counts). A
  size with no stock renders disabled with "ask at the shop", not hidden — she should
  know the size exists.
- Reserve sends her to `/reserve?items=<slug>&variant=<id>&size=M`.

### 3.3 `/reserve`
One page still serves all three trades. With a retail piece in the basket it asks for
**one date**, not a range, and the calendar's return leg is not drawn. The docket
lists what she is renting and what she is buying under separate headings, because the
two carry different promises and one of them she keeps.

## 4. Admin

- Products already support retail; the form gains variants (colour name, hex, and a
  quantity per size).
- The bookings inbox distinguishes a collection from a rental at a glance.
- **The call list (R2)**: the dashboard surfaces appointments in the next few hours
  with one-tap call and WhatsApp, since the shop's process is to ring two hours
  ahead. Marking "no answer" cancels the reservation with that reason and releases
  the held stock.

## 5. Invariants → tests (added to `verify-booking.mts`)

14. Two customers can reserve the same product in the same size when the shop owns
    two, and the third is refused `out_of_stock` — with the constraint, not a count
    the application read first.
15. Reserving size M never blocks size S of the same product.
16. A rental and a retail piece can hold the same day without colliding, and two
    rentals of the same garment on that day still cannot.
17. Cancelling a retail reservation releases its `held`, and `held` never exceeds
    `quantity` under concurrent reservation.
18. A retail booking never carries buffer days, and never enters `returned`.

## 6. Out of scope

Swatch photography per colour (one image set per product until the owner's
photographs land), shipping of any kind, and stock movements the shop makes in the
room — `quantity` is edited in admin, not derived from sales the site never saw.

---

## 7. Build record (17 September 2026)

What was built against this spec, and the decisions taken while building that the
spec did not already settle.

### 7.1 Migrations
- **`0007_retail_stock.sql`** (written 16 Sep, applied): `holds_dates`, the
  narrowed exclusion constraint, `variant_stock`, the jsonb backfill, RLS.
- **`0008_retail_holds.sql`**: the half §1.1 left unanswered. A reservation has
  to name WHICH (variant, size) it took or nothing can give it back, so
  `booking_items` gains `size` and the check `retail_names_its_size`. The take
  and the release are triggers on `booking_items`, not application code: a hold
  exists while the item is `pending` or `confirmed`, and every path into and out
  of that — create, admin decline, customer cancel, the lazy lapse sweep, an
  admin revive — moves the count without knowing it has. Running out raises
  **SQLSTATE `VV001`**, which `lib/booking` maps to a 409 the way it maps 23P01
  for dates. `picked_up` takes `quantity` down with `held`: the piece has left.
- **`0009_retail_availability.sql`**: `product_unavailable_ranges()` learns
  `holds_dates`. It is the only sanctioned public read of a product's calendar
  and the calendar greys out whatever it returns; without this, one kurti being
  collected on Tuesday would grey out Tuesday for all three of them. Plus
  `bookings.cancel_reason`, one value (`no_answer`), for R2.

### 7.2 Decisions taken while building
- **The tray carries no sizes, so /reserve asks.** The spec's
  `/reserve?items=<slug>&variant=<id>&size=M` fits one piece, which is the only
  case that can have made the choice — a product page. A basket assembled in the
  tray has answered nothing, so /reserve grew a fieldset that asks for the
  colour and size of each piece being bought, and the URL form is a prefill for
  the single-piece case. It is validated against that piece's real colours and
  sizes on the way in, and again on the server.
- **A mixed basket keeps the rental's range.** §2 allows mixed baskets but does
  not say what the dates mean. They are the rental's, and she collects
  everything on the pickup day: she comes in once. Only a basket of nothing but
  retail is one day, and there the calendar draws no return leg (`single`).
- **The admin edits `quantity`, never `held`.** `held` belongs to the triggers.
  `held_within_stock` refuses a count set below what is already spoken for, and
  the product form names that rather than saying "could not save". The form now
  reads its counts from `variant_stock` too: the `stock` jsonb it used to read
  is the pre-0007 copy and nothing renders it any more.
- **A size with a live hold is not deleted.** Removing a size in the admin
  deletes its row only where `held = 0`, because the row is what a collection is
  released against.

### 7.3 The two pages that were still written for rentals
Built after the engine, once retail rows could actually exist.

The **customer's status page** now has a day rather than dates when nothing is
rented, three stations rather than four (a collection never enters `returned`),
no return row and nothing to extend. A mixed booking is the case worth getting
right: it runs on the rental's range, she comes in once for all of it, so it
keeps all four stations and its return line says "what you rented, to the shop".

The **admin inbox** marks each booking rental, collection or both, asked as two
questions over its items rather than one. A collection drops the return line,
the return row, the "Mark returned" button and the next-step card once it is
picked up; a mixed booking keeps them. Retail lines carry their colour and size
under the name. A shop cancellation made because nobody answered now says so.

Suppressing "Mark returned" and the return day follows from §2 rather than §4,
and is deliberate: offering to return a piece that has been sold is a bug, not
a missing nicety.

### 7.4 Gates
All green on the final state, run from `site/` with the dev server up:
`verify-booking.mts` **35/35** (invariants 14–18 added, and test 10 now checks
that a retail line with no size is refused rather than that retail is refused),
`verify-schema.mjs` **17/17**, `site-audit.mjs` **396/396** (`/retail/[slug]`
added to the routes), `hero-scrim-verify.mjs` **8/8**, `tsc` clean.

### 7.5 Not built
Nothing in §6, as intended. `npm run lint` was not run: it exhausts V8's heap on
this machine while the dev server holds memory. It is not one of the gates.
