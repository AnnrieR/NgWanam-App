-- Siomai is no longer sold. Retire standalone items and complete offers that
-- include it (e.g. SM1); do not silently change a combo's advertised recipe.
-- Keep IDs, variants, stock/reservations and historical order snapshots intact
-- so already-placed orders can still be fulfilled or cancelled normally.
update public.menu_variants v
set is_active = false
from public.menu_items mi
where mi.id = v.menu_item_id
  and (mi.name ilike '%siomai%' or mi.description ilike '%siomai%')
  and v.is_active;

update public.menu_items
set is_active = false
where (name ilike '%siomai%' or description ilike '%siomai%')
  and is_active;
