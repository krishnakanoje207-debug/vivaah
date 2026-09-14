-- 0005 — the owner's jewellery categories replace the provisional ones.
--
-- 0003 seeded eight categories by piece type as a stand-in. On 14 Sep 2026 the
-- owner locked the real list, by occasion and style: Navratri, Bridal, South
-- Indian, Haldi, Mehendi, Oxidised Jewellery.
--
-- The eight provisional rows are deleted rather than deactivated: no product
-- was ever created against them (checked before writing this). The guard below
-- makes that a hard precondition, so this aborts instead of orphaning a piece
-- if one has appeared in the meantime.

do $$
begin
  if exists (
    select 1
      from public.products p
      join public.categories c on c.id = p.category_id
     where c.section = 'jewellery'
  ) then
    raise exception 'jewellery products already reference the provisional categories; migrate them first';
  end if;
end $$;

delete from public.categories where section = 'jewellery';

insert into public.categories (section, name, slug, sort_order) values
  ('jewellery', 'Navratri',           'navratri',     1),
  ('jewellery', 'Bridal',             'bridal',       2),
  ('jewellery', 'South Indian',       'south-indian', 3),
  ('jewellery', 'Haldi',              'haldi',        4),
  ('jewellery', 'Mehendi',            'mehendi',      5),
  ('jewellery', 'Oxidised Jewellery', 'oxidised',     6);
