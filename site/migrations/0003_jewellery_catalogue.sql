-- 0003 — the jewellery catalogue: pricing rule and categories.
--
-- Priced like the garments (owner, 14 Sep 2026): a rental price per period and
-- an advance to hold the piece. The rule that forces both on a rental is widened
-- to jewellery, so an unpriced piece cannot be saved from admin any more than an
-- unpriced lehenga can.
--
-- Nothing else in the schema names a product type: the booking tables, the GiST
-- exclusion constraint and product_unavailable_ranges() key on product_id, so a
-- jewellery piece is date-exclusive through booking_items exactly like a garment
-- (BOOKING_ENGINE_SPEC §2.9). RLS needs no change: products_public_read and
-- categories_public_read filter on is_active, not on type.

alter table public.products drop constraint rental_needs_pricing;
alter table public.products add constraint rental_needs_pricing check (
  type not in ('rental', 'jewellery')
  or (rental_price is not null and prebook_charge is not null)
);

-- By piece type (owner's choice): how a customer asks for something to go with
-- an outfit. Admin can rename, reorder or deactivate them later.
insert into public.categories (section, name, slug, sort_order) values
  ('jewellery', 'Necklace Sets',       'necklace-sets',    1),
  ('jewellery', 'Maang Tikka',         'maang-tikka',      2),
  ('jewellery', 'Earrings & Jhumkas',  'earrings-jhumkas', 3),
  ('jewellery', 'Bangles & Kade',      'bangles-kade',     4),
  ('jewellery', 'Nath',                'nath',             5),
  ('jewellery', 'Haath Phool',         'haath-phool',      6),
  ('jewellery', 'Kamarbandh',          'kamarbandh',       7),
  ('jewellery', 'Payal',               'payal',            8);
