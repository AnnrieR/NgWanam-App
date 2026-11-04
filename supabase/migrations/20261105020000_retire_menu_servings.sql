-- Delete from the menu without rewriting order lines, stock or audit history.
alter table public.menu_variants add column retired_at timestamptz;
alter table public.menu_variants add constraint retired_servings_not_on_sale
  check (retired_at is null or not is_active);
alter table public.menu_variants drop constraint menu_variants_menu_item_id_name_key;
create unique index menu_variants_current_name_key
  on public.menu_variants(menu_item_id,name) where retired_at is null;

create function public.delete_menu_variant(p_menu_variant_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_staff_or_admin() then
    raise exception 'Only staff or admin can delete servings.' using errcode='42501';
  end if;
  update public.menu_variants set is_active=false,retired_at=now()
    where id=p_menu_variant_id and retired_at is null;
  if not found then raise exception 'Serving not found or already deleted.'; end if;
end;
$$;
revoke all on function public.delete_menu_variant(uuid) from public,anon;
grant execute on function public.delete_menu_variant(uuid) to authenticated;
