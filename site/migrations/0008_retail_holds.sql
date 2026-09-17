-- 0008 — a retail hold names the piece it took, and the database takes it.
--
-- 0007 made stock countable and freed retail rows from the date constraint.
-- What it left unanswered is the other half of specs/RETAIL_SPEC.md §1.1: a
-- reservation has to say WHICH (variant, size) it took, or nothing can give it
-- back. booking_items carries variant_id but no size, and the counts are keyed
-- on both.

-- ---------------------------------------------------------------------------
-- 1. The size a hold is against
-- ---------------------------------------------------------------------------
alter table public.booking_items add column size text
  check (size is null or char_length(size) between 1 and 24);

-- A retail item is guarded by a count keyed on (variant_id, size), so it cannot
-- be booked without naming both. A rental is one piece and names neither.
-- holds_dates is stamped by the derive trigger before this is checked.
alter table public.booking_items add constraint retail_names_its_size
  check (holds_dates or (variant_id is not null and size is not null));

-- ---------------------------------------------------------------------------
-- 2. Taking and releasing the count
-- ---------------------------------------------------------------------------
-- The locked decision is that double-booking is never enforced in application
-- code, because two customers reserving the last M at the same moment is the
-- same race as two holds on one lehenga. So the count moves in the same
-- statement that checks it, and the app reads the database's answer rather
-- than asking first:
--
--   update variant_stock set held = held + 1 where ... and held < quantity
--
-- Zero rows updated means somebody else took the last one. That is raised as
-- SQLSTATE VV001, which lib/booking maps to a 409 named to the piece and size,
-- exactly as it maps 23P01 for dates.
--
-- A hold exists while the booking is pending or confirmed. It ends three ways:
-- cancelled (the count comes back), picked_up (the piece is sold and paid for
-- at the counter, so quantity comes down with held), or a revive, which has to
-- take the count again and can fail if the stock went in the meantime.

create or replace function public.variant_stock_take(
  p_variant uuid, p_size text, p_name text
) returns void
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.variant_stock
     set held = held + 1
   where variant_id = p_variant and size = p_size and held < quantity;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'out of stock: % in size %', p_name, p_size
      using errcode = 'VV001';
  end if;
end $$;

create or replace function public.booking_items_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  held_before boolean := false;
  held_now    boolean := new.status in ('pending','confirmed');
  nm text;
begin
  if new.holds_dates then return new; end if;   -- rentals are held by their dates
  -- OLD is unassigned on INSERT, so it is only read under the UPDATE branch.
  if tg_op = 'UPDATE' then
    held_before := old.status in ('pending','confirmed');
  end if;

  if held_now and not held_before then
    select name into nm from public.products where id = new.product_id;
    perform public.variant_stock_take(new.variant_id, new.size, nm);

  elsif held_before and not held_now then
    -- Sold: the piece leaves the shop, so what the shop owns comes down too.
    -- Otherwise the hold simply goes back on the rail.
    update public.variant_stock
       set held = held - 1,
           quantity = quantity - case when new.status = 'picked_up' then 1 else 0 end
     where variant_id = new.variant_id and size = new.size and held > 0;
  end if;
  return new;
end $$;

create trigger booking_items_stock after insert on public.booking_items
  for each row execute function public.booking_items_stock();

create trigger booking_items_stock_update after update of status on public.booking_items
  for each row when (old.status is distinct from new.status)
  execute function public.booking_items_stock();
