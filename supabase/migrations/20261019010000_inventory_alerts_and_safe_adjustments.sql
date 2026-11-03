-- Existing inventory RLS continues to protect Realtime subscriptions.
do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='inventory') then
    alter publication supabase_realtime add table public.inventory;
  end if;
end $$;

-- Reject stale edits instead of overwriting a reservation or completion that
-- arrived while a staff member was editing a stock/threshold field.
create or replace function public.update_inventory_stock_checked(
  p_inventory_id uuid, p_current_stock integer, p_minimum_stock integer,
  p_expected_updated_at timestamptz
) returns void language plpgsql security definer set search_path='' as $$
declare v_updated_at timestamptz;
begin
  if not private.is_staff_or_admin() then raise exception 'Only staff or admin can update inventory.'; end if;
  if p_current_stock is null or p_minimum_stock is null or p_current_stock<0 or p_minimum_stock<0 then
    raise exception 'Stock and threshold must be non-negative integers.';
  end if;
  select updated_at into v_updated_at from public.inventory where id=p_inventory_id for update;
  if not found then raise exception 'Inventory serving not found.'; end if;
  if p_expected_updated_at is null or v_updated_at is distinct from p_expected_updated_at then
    raise exception 'Stock changed since this form was loaded. Refresh and review before saving.';
  end if;
  perform public.update_inventory_stock(p_inventory_id,p_current_stock,p_minimum_stock);
end $$;
revoke all on function public.update_inventory_stock_checked(uuid,integer,integer,timestamptz) from public,anon;
grant execute on function public.update_inventory_stock_checked(uuid,integer,integer,timestamptz) to authenticated;
