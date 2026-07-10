-- =============================================================================
-- Vivaah — initial schema (F1) · v1.0
-- Target: Supabase Postgres. Apply verbatim as migration 0001_init.
-- Opus: do NOT alter constraint/trigger/RLS logic; escalate to Fable instead.
--
-- DATE CONVENTION (used everywhere, app included):
--   booked_range  = daterange(pickup_date, return_date + 1, '[)')
--     i.e. inclusive pickup day through inclusive return day.
--   blocked_range = daterange(pickup_date, return_date + 1 + buffer_days, '[)')
--     buffer_days is SNAPSHOTTED per item at booking time; later admin changes
--     to the buffer setting must not silently move existing blocks.
-- =============================================================================

create extension if not exists btree_gist;

-- ---------- enums ----------
create type product_type     as enum ('rental','retail');
create type booking_status   as enum ('pending','confirmed','picked_up','returned','cancelled');
create type extension_status as enum ('pending','approved','rejected');
create type message_status   as enum ('queued','sent','failed');

-- ---------- helpers ----------
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- catalogue ----------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  section    product_type not null,
  name       text not null,
  slug       text not null unique,
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id             uuid primary key default gen_random_uuid(),
  type           product_type not null,
  category_id    uuid references public.categories(id) on delete set null,
  name           text not null,
  slug           text not null unique,
  description    jsonb not null default '{}'::jsonb,          -- {en, hi}
  occasions      text[] not null default '{}',                -- bridal/sangeet/mehendi/reception
  images         jsonb not null default '[]'::jsonb,          -- [{path, alt}]
  spin           jsonb,                                       -- {basePath, frames, arcDegrees, loop}
  price          numeric(10,2),                               -- retail sale price
  rental_price   numeric(10,2),                               -- per rental period
  prebook_charge numeric(10,2),                               -- advance for rentals
  extension_rate numeric(10,2),                               -- per extra day
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint rental_needs_pricing check (
    type <> 'rental' or (rental_price is not null and prebook_charge is not null)
  )
);
create index products_category_idx on public.products (category_id) where is_active;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- Retail items always have >=1 variant (single-colour items get one default
-- variant) so storefront + admin logic stay uniform. App-enforced on create.
create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete cascade,
  colour_name    text not null,
  colour_hex     text not null check (colour_hex ~ '^#[0-9A-Fa-f]{6}$'),
  images         jsonb not null default '[]'::jsonb,
  stock          jsonb not null default '{}'::jsonb,          -- {"Free size": 3} or {"S":1,"M":2}
  price_override numeric(10,2),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);
create index variants_product_idx on public.product_variants (product_id) where is_active;

-- ---------- bookings ----------
create table public.bookings (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,                          -- short human code, app-generated (e.g. VVH-7K3M)
  customer_name text not null,
  phone         text not null check (phone ~ '^[0-9+][0-9 -]{7,15}$'),
  email         text,
  booked_range  daterange not null check (not isempty(booked_range)),
  status        booking_status not null default 'pending',
  amount_due    numeric(10,2) not null default 0,
  payment_ref   text,                                          -- customer-submitted UTR
  payment_ref_submitted_at timestamptz,
  verified_at   timestamptz,
  expires_at    timestamptz,                                   -- pending-hold deadline; null once confirmed
  extension_of  uuid references public.bookings(id),           -- set when this row exists only to record an approved extension lineage (see BOOKING_ENGINE_SPEC)
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint pending_has_expiry check (status <> 'pending' or expires_at is not null)
);
create index bookings_expiry_idx  on public.bookings (expires_at) where status = 'pending';
create index bookings_status_idx  on public.bookings (status);
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- One booking = one date range holding 1..n items (lehenga + bundled jewellery).
-- blocked_range/status are MIRRORED here (kept in sync by triggers below)
-- solely so the exclusion constraint can operate per item.
create table public.booking_items (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete restrict,
  variant_id    uuid references public.product_variants(id) on delete restrict,
  price         numeric(10,2) not null default 0,              -- snapshot at booking time
  buffer_days   int not null default 0 check (buffer_days between 0 and 14),
  blocked_range daterange not null,
  status        booking_status not null,
  created_at    timestamptz not null default now(),

  -- THE double-booking guarantee. DB-level, race-proof: two overlapping holds
  -- on the same product cannot both commit, ever. Cancelled/returned rows
  -- release their dates automatically.
  constraint no_double_booking exclude using gist (
    product_id with =,
    blocked_range with &&
  ) where (status not in ('cancelled','returned'))
);
create index booking_items_booking_idx on public.booking_items (booking_id);

-- BEFORE INSERT: derive blocked_range/status from the parent booking so the
-- app can never insert an item inconsistent with its booking.
create or replace function public.booking_items_derive() returns trigger
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into strict b from public.bookings where id = new.booking_id;
  new.status        := b.status;
  new.blocked_range := daterange(lower(b.booked_range),
                                 upper(b.booked_range) + new.buffer_days, '[)');
  return new;
end $$;
create trigger booking_items_derive before insert on public.booking_items
  for each row execute function public.booking_items_derive();

-- AFTER UPDATE on bookings: cascade status/date changes to items. An extension
-- (booked_range widened) re-fires the exclusion check here — if it collides
-- with the next booking the WHOLE transaction fails, which is exactly the
-- desired race-proof extension approval.
create or replace function public.booking_items_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status
     or new.booked_range is distinct from old.booked_range then
    update public.booking_items i
       set status        = new.status,
           blocked_range = daterange(lower(new.booked_range),
                                     upper(new.booked_range) + i.buffer_days, '[)')
     where i.booking_id = new.id;
  end if;
  return new;
end $$;
create trigger bookings_sync_items after update on public.bookings
  for each row execute function public.booking_items_sync();

-- ---------- extensions ----------
create table public.extension_requests (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references public.bookings(id) on delete cascade,
  requested_return    date not null,                            -- new inclusive return day
  charge_amount       numeric(10,2) not null default 0,
  status              extension_status not null default 'pending',
  decided_at          timestamptz,
  created_at          timestamptz not null default now()
);
create index extension_requests_open_idx on public.extension_requests (booking_id)
  where status = 'pending';

-- ---------- reviews ----------
-- Owner-moderated customer reviews per product. booking_id, when present,
-- marks a "verified renter". Inserts happen only via server route (service
-- role, Turnstile + rate-limited); public reads see approved rows only.
create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  booking_id    uuid references public.bookings(id) on delete set null,
  customer_name text not null,
  rating        int not null check (rating between 1 and 5),
  body          text not null default '',
  is_approved   boolean not null default false,
  created_at    timestamptz not null default now()
);
create index reviews_product_idx on public.reviews (product_id) where is_approved;

-- ---------- content & settings ----------
create table public.site_content (
  key        text primary key,                                  -- e.g. 'home.hero', 'policies.rental'
  content    jsonb not null default '{}'::jsonb,                -- {en:…, hi:…} blocks
  updated_at timestamptz not null default now()
);
create trigger site_content_touch before update on public.site_content
  for each row execute function public.touch_updated_at();

create table public.settings (
  key       text primary key,
  value     jsonb not null,
  is_public boolean not null default false                      -- true => readable by storefront (anon)
);

-- Category seeds (owner's lists, July 2026). Admin can add/rename later.
insert into public.categories (section, name, slug, sort_order) values
  ('rental', 'Bridal Lehengas',      'bridal-lehengas',      1),
  ('rental', 'Side Lehengas',        'side-lehengas',        2),
  ('rental', 'Indo-Western',         'indo-western',         3),
  ('rental', 'Ready-to-wear Sarees', 'ready-to-wear-sarees', 4),
  ('rental', 'Rajasthani Poshak',    'rajasthani-poshak',    5),
  ('rental', 'Chaniya Cholis',       'chaniya-cholis',       6),
  ('rental', 'Gowns',                'gowns',                7),
  ('rental', 'Sarees',               'sarees',               8),
  ('retail', '3-Piece Suits',        'three-piece-suits',    1),
  ('retail', 'Party Wear Suits',     'party-wear-suits',     2),
  ('retail', 'One Piece',            'one-piece',            3),
  ('retail', 'Short Kurtis',         'short-kurtis',         4),
  ('retail', 'Co-ord Sets',          'co-ord-sets',          5),
  ('retail', 'Night Suits',          'night-suits',          6),
  ('retail', '2-Piece Kurta-Pant Sets', 'kurta-pant-sets',   7),
  ('retail', 'Kaftans',              'kaftans',              8);

insert into public.settings (key, value, is_public) values
  ('buffer_days',            '2',                          false),
  ('booking_expiry_minutes', '120',                        false),
  ('sms_daily_quota',        '100',                        false),
  ('shop_info',  '{"name":"Vivaah","address":"","maps_url":"","lat":null,"lng":null,"hours":"","phone":""}', true),
  ('upi',        '{"id":"","number":"","qr_path":""}',     true),
  ('charges_copy','{"en":"","hi":""}',                     true);

-- ---------- comms ----------
create table public.sms_queue (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid references public.bookings(id) on delete set null,
  phone        text not null,
  body         text not null,
  status       message_status not null default 'queued',
  attempts     int not null default 0,
  not_before   date not null default current_date,              -- quota overflow defers to next day
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);
create index sms_queue_pending_idx on public.sms_queue (not_before) where status = 'queued';

-- Tracks WhatsApp free-service-window state per customer phone.
create table public.wa_contacts (
  phone           text primary key,
  last_inbound_at timestamptz not null,                         -- window open until +24h
  last_code       text,                                         -- last CONFIRM <code> received
  updated_at      timestamptz not null default now()
);

-- =============================================================================
-- RLS — deny by default. Storefront reads public catalogue with anon key;
-- ALL booking/comms writes go through server routes using the service-role key
-- (bypasses RLS); admin panel uses authenticated sessions with app_metadata.role='admin'.
-- The booking-status page (/booking/[code]) is served by a server route keyed
-- on the unguessable code — bookings are NEVER anon-readable.
-- =============================================================================
alter table public.categories         enable row level security;
alter table public.products           enable row level security;
alter table public.product_variants   enable row level security;
alter table public.bookings           enable row level security;
alter table public.booking_items      enable row level security;
alter table public.extension_requests enable row level security;
alter table public.site_content       enable row level security;
alter table public.settings           enable row level security;
alter table public.sms_queue          enable row level security;
alter table public.wa_contacts        enable row level security;
alter table public.reviews            enable row level security;

-- public catalogue reads
create policy categories_public_read on public.categories
  for select using (is_active or is_admin());
create policy products_public_read on public.products
  for select using (is_active or is_admin());
create policy variants_public_read on public.product_variants
  for select using (is_active or is_admin());
create policy site_content_public_read on public.site_content
  for select using (true);
create policy settings_public_read on public.settings
  for select using (is_public or is_admin());
create policy reviews_public_read on public.reviews
  for select using (is_approved or is_admin());

-- admin full control (writes)
create policy categories_admin_all on public.categories
  for all using (is_admin()) with check (is_admin());
create policy products_admin_all on public.products
  for all using (is_admin()) with check (is_admin());
create policy variants_admin_all on public.product_variants
  for all using (is_admin()) with check (is_admin());
create policy site_content_admin_all on public.site_content
  for all using (is_admin()) with check (is_admin());
create policy settings_admin_all on public.settings
  for all using (is_admin()) with check (is_admin());
create policy bookings_admin_all on public.bookings
  for all using (is_admin()) with check (is_admin());
create policy booking_items_admin_all on public.booking_items
  for all using (is_admin()) with check (is_admin());
create policy extensions_admin_all on public.extension_requests
  for all using (is_admin()) with check (is_admin());
create policy sms_queue_admin_all on public.sms_queue
  for all using (is_admin()) with check (is_admin());
create policy wa_contacts_admin_all on public.wa_contacts
  for all using (is_admin()) with check (is_admin());
create policy reviews_admin_all on public.reviews
  for all using (is_admin()) with check (is_admin());
-- (no anon policies on bookings/comms tables: deny by default; review INSERTs
--  go through a server route — service role — with Turnstile + rate limiting)

-- =============================================================================
-- Availability helper — the ONLY sanctioned way to read a product's calendar
-- publicly. Exposes date ranges only; no customer data leaks.
-- =============================================================================
create or replace function public.product_unavailable_ranges(p_product uuid)
returns table (blocked daterange)
language sql stable security definer set search_path = public as $$
  select blocked_range from public.booking_items
  where product_id = p_product
    and status not in ('cancelled','returned')
    and upper(blocked_range) >= current_date
$$;
grant execute on function public.product_unavailable_ranges(uuid) to anon, authenticated;

-- ---------- storage buckets (run via Supabase dashboard/CLI, noted here) ----------
-- product-images  : public read, admin write
-- spin-frames     : public read, admin write
-- site-assets     : public read, admin write   (hero videos, UPI QR, banners)
