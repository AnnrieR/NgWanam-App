-- Allow administrators to delete unused locations without detaching order history.
-- RESTRICT also protects against a concurrent checkout referencing the location.
alter table public.orders drop constraint orders_delivery_area_id_fkey;
alter table public.orders add constraint orders_delivery_area_id_fkey
foreign key (delivery_area_id) references public.delivery_areas(id) on delete restrict;
grant delete on public.delivery_areas to authenticated;
-- The existing admin-only FOR ALL policy also covers DELETE.

create or replace function private.log_delivery_area()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    insert into public.activity_logs(actor_id, action, record_type, record_id)
    values ((select auth.uid()), 'delivery_area_deleted', 'delivery_areas', old.id);
    return old;
  end if;
  insert into public.activity_logs(actor_id, action, record_type, record_id)
  values ((select auth.uid()), case when tg_op='INSERT' then 'delivery_area_created' else 'delivery_area_updated' end, 'delivery_areas', new.id);
  return new;
end;
$$;
create trigger log_delivery_area_deleted after delete on public.delivery_areas
for each row execute function private.log_delivery_area();
