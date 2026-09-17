-- 0009 — the public calendar learns what 0007 taught the constraint, and the
-- shop can say why it could not reach someone.

-- ---------------------------------------------------------------------------
-- 1. A retail hold is not a blocked day
-- ---------------------------------------------------------------------------
-- product_unavailable_ranges is the only sanctioned public read of a product's
-- calendar, and the calendar greys out whatever it returns. It was written when
-- every booked item held its dates. Since 0007 that is false: the shop owns
-- three of a kurti, and one of them being collected on Tuesday says nothing
-- about Tuesday.
--
-- The predicate is now the exclusion constraint's own, so the greyed days and
-- the days the database will actually refuse cannot drift apart.
create or replace function public.product_unavailable_ranges(p_product uuid)
returns table (blocked daterange)
language sql stable security definer set search_path = public as $$
  select blocked_range from public.booking_items
  where product_id = p_product
    and status not in ('cancelled','returned')
    and holds_dates
    and upper(blocked_range) >= current_date
$$;

-- ---------------------------------------------------------------------------
-- 2. Why a reservation was ended
-- ---------------------------------------------------------------------------
-- The owner's process for a retail collection is to ring about two hours ahead
-- (specs/RETAIL_SPEC.md R2). Nothing in the software cancels on a timer; she
-- does, when nobody answers. `cancelled_by` already says it was the shop. This
-- says what happened, so the same word is recorded every time and she can see
-- the pattern rather than read it back out of free-text notes.
--
-- One value, because one is all the shop's process has. Widening it later is a
-- line.
alter table public.bookings add column cancel_reason text
  check (cancel_reason is null or cancel_reason = 'no_answer');
