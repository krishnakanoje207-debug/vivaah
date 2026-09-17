-- 0011 — a revocation floor for admin sessions.
--
-- specs/SECURITY_HARDENING_SPEC.md S2. The admin session token carried only an
-- expiry, so nothing could be taken back: `logout()` deleted the cookie in one
-- browser while the token itself stayed valid for the rest of its seven days,
-- and the only real revocation was rotating SESSION_SECRET and redeploying.
--
-- There is exactly one admin, so this is not a session store. A session now
-- carries an issued-at and is valid only while that is at or after the single
-- timestamp below. Setting it to now ends every session that exists.
--
-- Epoch SECONDS as a jsonb number, to compare directly against the token's
-- `iat` without parsing a date on the hot path. 0 means "nothing revoked yet",
-- which is every session ever issued, which is the correct starting state.
--
-- is_public false: the storefront role must not read it. settings already has
-- RLS and a policy that only exposes is_public rows, so this needs no grant and
-- no policy of its own, and scripts/verify-schema.mjs keeps proving that.

insert into public.settings (key, value, is_public)
values ('admin.sessions_valid_from', '0'::jsonb, false)
on conflict (key) do nothing;
