-- Read-only assertions, transaction rolled back. No account/stock fixtures.
begin;
do $$
begin
  if exists (
    select 1 from public.menu_items
    where is_active and (name ilike '%siomai%' or description ilike '%siomai%')
  ) then
    raise exception 'Siomai or siomai-containing offer remains on sale';
  end if;
  if exists (
    select 1 from public.menu_variants v
    join public.menu_items mi on mi.id = v.menu_item_id
    where v.is_active
      and (mi.name ilike '%siomai%' or mi.description ilike '%siomai%')
  ) then
    raise exception 'Siomai serving remains active';
  end if;
end $$;
rollback;
