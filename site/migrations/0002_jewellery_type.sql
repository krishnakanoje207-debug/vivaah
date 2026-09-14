-- 0002 — jewellery becomes a product type of its own.
--
-- Owner decision, 14 Sep 2026: jewellery gets a real catalogue, rentable on its
-- own as well as alongside an outfit, priced like the garments. Until now it was
-- a page with no rows behind it, and every tile on /jewellery linked to /rentals.
--
-- A third enum value rather than rental categories: as 'rental' rows the pieces
-- would appear in every rental category grid, filter and sitemap entry, and the
-- site already treats the shop as three businesses (CLAUDE.md).
--
-- Alone in its own migration on purpose. The runner wraps each file in one
-- transaction, and Postgres refuses to USE an enum value inside the transaction
-- that added it ("unsafe use of new value"). 0003 uses it.

alter type public.product_type add value if not exists 'jewellery';
