-- 0007 — retail becomes bookable: countable stock, and dates that only bind
-- the pieces there is one of.
--
-- specs/RETAIL_SPEC.md §1. The owner's decision of 16 Sep 2026 is that a retail
-- reservation carries a collection date, so retail reuses the Phase 2 engine
-- rather than growing a second one. That puts retail rows into booking_items,
-- where the rental guarantee is waiting to do the wrong thing to them.

-- ---------------------------------------------------------------------------
-- 1. Which items are held by their dates
-- ---------------------------------------------------------------------------
-- no_double_booking excludes on (product_id, blocked_range). That is exactly
-- right for the one bridal lehenga: two overlapping holds on it must never both
-- commit. It is wrong for a kurti the shop owns three of — and because it keys
-- on product_id alone, a reservation in S would refuse one in M.
--
-- True for rental and jewellery, both single pieces. False for retail, which is
-- guarded by stock below instead. Set by the derive trigger, never by the app.
alter table public.booking_items add column holds_dates boolean not null default true;

update public.booking_items bi set holds_dates = false
  from public.products p
 where p.id = bi.product_id and p.type = 'retail';

-- The exclusion constraint owns its own GiST index, so dropping the constraint
-- takes the index with it.
alter table public.booking_items drop constraint no_double_booking;
alter table public.booking_items add constraint no_double_booking
  exclude using gist (product_id with =, blocked_range with &&)
  where (status not in ('cancelled','returned') and holds_dates);

-- The derive trigger already refuses an item inconsistent with its booking.
-- It now also stamps holds_dates, and holds retail to a zero buffer: a buffer
-- exists to ready a garment that comes back, and a sold kurti does not.
create or replace function public.booking_items_derive() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  t public.product_type;
begin
  select * into strict b from public.bookings where id = new.booking_id;
  select type into strict t from public.products where id = new.product_id;
  new.status      := b.status;
  new.holds_dates := (t <> 'retail');
  if t = 'retail' then
    new.buffer_days := 0;
  end if;
  new.blocked_range := daterange(lower(b.booked_range),
                                 upper(b.booked_range) + new.buffer_days, '[)');
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Countable stock
-- ---------------------------------------------------------------------------
-- product_variants.stock is jsonb ({"S":1,"M":2}). JSONB cannot carry a CHECK
-- the database enforces per size under concurrency, and two customers reserving
-- the last M at the same moment is the same race as a double booking. So the
-- counts come out into rows, where `held <= quantity` makes overselling
-- unrepresentable rather than merely avoided.
create table public.variant_stock (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  size       text not null check (char_length(size) between 1 and 24),
  quantity   int  not null check (quantity >= 0),   -- what the shop owns
  held       int  not null default 0 check (held >= 0),
  updated_at timestamptz not null default now(),
  primary key (variant_id, size),
  constraint held_within_stock check (held <= quantity)
);
create trigger variant_stock_touch before update on public.variant_stock
  for each row execute function public.touch_updated_at();

-- Reserving one unit is then a single statement that cannot race:
--   update variant_stock set held = held + 1
--    where variant_id = $1 and size = $2 and held < quantity
-- Zero rows updated means somebody else took the last one.

-- Backfill from the jsonb the shop has been keeping. The jsonb column stays:
-- an applied migration is never edited, dropping it buys nothing, and it
-- becomes unused like payment_ref.
insert into public.variant_stock (variant_id, size, quantity)
select v.id, s.key, greatest(0, coalesce((s.value)::text::int, 0))
  from public.product_variants v,
       lateral jsonb_each(v.stock) as s(key, value)
 where jsonb_typeof(v.stock) = 'object'
   and jsonb_typeof(s.value) = 'number'
on conflict (variant_id, size) do nothing;

-- ---------------------------------------------------------------------------
-- 3. RLS — every public table needs it or verify-schema fails (it caught
--    schema_migrations itself). The storefront reads sizes to offer them; it
--    never sees a count, and it never writes.
-- ---------------------------------------------------------------------------
alter table public.variant_stock enable row level security;

grant select on public.variant_stock to app_public;

create policy variant_stock_public_read on public.variant_stock
  for select to app_public
  using (
    exists (
      select 1
        from public.product_variants v
        join public.products p on p.id = v.product_id
       where v.id = variant_stock.variant_id
         and v.is_active
         and p.is_active
    )
  );
