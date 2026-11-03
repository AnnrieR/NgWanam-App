create index activity_logs_created_idx on public.activity_logs (created_at desc);

create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_action text;
begin
  if tg_table_name = 'orders' then
    v_action := case when tg_op = 'INSERT' then 'order_created' else format('order_status:%s', new.status) end;
  elsif tg_table_name = 'payments' then
    v_action := format('payment_status:%s', new.status);
  elsif tg_table_name = 'deliveries' then
    v_action := format('delivery_status:%s', new.status);
  elsif tg_table_name = 'inventory' then
    v_action := 'inventory_updated';
  else
    v_action := 'profile_access_updated';
  end if;

  insert into public.activity_logs (actor_id, action, record_type, record_id)
  values ((select auth.uid()), v_action, tg_table_name, new.id);
  return new;
end;
$$;

create trigger log_order_created after insert on public.orders for each row execute function public.log_activity();
create trigger log_order_status after update of status on public.orders for each row when (old.status is distinct from new.status) execute function public.log_activity();
create trigger log_payment_status after update of status on public.payments for each row when (old.status is distinct from new.status) execute function public.log_activity();
create trigger log_delivery_created after insert on public.deliveries for each row execute function public.log_activity();
create trigger log_delivery_status after update of status on public.deliveries for each row when (old.status is distinct from new.status) execute function public.log_activity();
create trigger log_inventory_updated after update of current_stock, reserved_stock, minimum_stock on public.inventory for each row execute function public.log_activity();
create trigger log_profile_access after update of role, is_active on public.profiles for each row when (old.role is distinct from new.role or old.is_active is distinct from new.is_active) execute function public.log_activity();

revoke execute on function public.log_activity() from public, anon, authenticated;
