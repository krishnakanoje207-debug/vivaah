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
  recreates it with `and is_rental` in the `WHERE`, where `is_rental` is a new
  generated/stored boolean on `booking_items`. (A new migration; `0001` is applied
  and must never be edited.)
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
