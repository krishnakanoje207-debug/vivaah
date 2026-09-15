-- 0006 — bookings become requests the shop confirms, with no payment online.
--
-- Owner decisions, 15 Sep 2026 (specs/BOOKING_ENGINE_SPEC_V2.md §0): the site
-- takes no payment of any kind; an unconfirmed booking holds its dates and lapses
-- if the shop does not confirm in time; the customer picks a pickup time; she may
-- cancel online until six hours before it.
--
-- Nothing here touches the exclusion constraint or the item triggers. `pending`
-- keeps holding dates exactly as before; what changes is what it means.
-- The UPI columns (payment_ref, payment_ref_submitted_at) and the `upi` setting are
-- left in place and unused: dropping them buys nothing and cannot be undone.

-- When she will come in. Nullable only for the demo rows that predate it; the
-- booking route always sets it.
alter table public.bookings add column pickup_time time;

-- Who ended a cancelled booking. Replaces appending "[auto-expired]" to notes,
-- which the admin cannot filter on and which mixed system text into her notes.
alter table public.bookings add column cancelled_by text
  check (cancelled_by in ('customer', 'shop', 'lapsed'));

-- What the customer typed on the booking form, kept apart from `notes`, which is
-- the owner's own field.
alter table public.bookings add column customer_note text
  check (char_length(customer_note) <= 500);

-- SHA-256 of the status-link token. The 4-character code is for reading aloud and
-- is enumerable, so it cannot be what authorises a cancellation (V2 §3). Null on
-- the demo rows, which can still be opened with code + phone.
alter table public.bookings add column access_hash bytea
  check (access_hash is null or octet_length(access_hash) = 32);

-- The phone rate limit counts recent bookings per number (V2 §5).
create index bookings_phone_recent_idx on public.bookings (phone, created_at);

-- The confirm-within window. Two hours was sized for a customer paying by UPI;
-- a shop confirming by phone around its own day needs longer. Only moved if it
-- is still the seeded value, so an owner's own choice is never overwritten.
update public.settings set value = '1440'
 where key = 'booking_expiry_minutes' and value = '120'::jsonb;

-- The calendar has to grey out a return date whose buffer would run into the
-- next booking, so the storefront needs to read it. It is a shop rule, not data
-- about anyone.
update public.settings set is_public = true where key = 'buffer_days';

insert into public.settings (key, value, is_public) values
  ('cancel_cutoff_hours', '6', true),
  ('pickup_hours',
   '{"open":"11:00","close":"20:00","step_minutes":30,"closed_weekdays":[0]}',
   true)
on conflict (key) do nothing;
