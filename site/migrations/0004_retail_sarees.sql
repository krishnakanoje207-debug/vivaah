-- 0004 — Sarees on the retail side.
--
-- Owner, 14 Sep 2026. Rentals already has a Sarees category, and category slugs
-- are unique across both sections, so the retail one cannot also be `sarees`.

insert into public.categories (section, name, slug, sort_order) values
  ('retail', 'Sarees', 'retail-sarees', 9);
