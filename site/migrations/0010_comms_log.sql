-- 0010 — comms_log: one row per notification attempt, skips included.
--
-- Phase 5 (specs/COMMS_FLOW_SPEC_V2.md §4.1). Every channel but email is dark
-- until the owner supplies a SIM, a gateway or a domain, so the common outcome
-- for most of this table's life is `skipped`. Recording the skips is the point:
-- without them "no row" would mean both "nothing happened" and "we tried and the
-- channel was not configured", and the first is a bug while the second is Tuesday.
--
-- No grants to app_public. The rows carry customer addresses and are owner-only,
-- like bookings, sms_queue and wa_contacts. RLS is enabled because
-- scripts/verify-schema.mjs fails any public table without it.

create table if not exists public.comms_log (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references public.bookings(id) on delete cascade,
  event       text not null,
  channel     text not null,
  recipient   text not null,
  address     text,
  status      text not null,
  detail      text,
  created_at  timestamptz not null default now(),
  constraint comms_log_channel_ck   check (channel   in ('email','whatsapp','sms','push')),
  constraint comms_log_recipient_ck check (recipient in ('owner','customer')),
  constraint comms_log_status_ck    check (status    in ('sent','failed','skipped'))
);

create index if not exists comms_log_booking_idx on public.comms_log (booking_id, created_at desc);

alter table public.comms_log enable row level security;
