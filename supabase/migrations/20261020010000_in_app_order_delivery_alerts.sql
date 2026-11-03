-- Forward-only alerts. No historical orders are replayed or modified.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  recipient_role public.profile_role not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_recipient_created_idx on public.notifications(recipient_id,created_at desc,id);
create index notifications_unread_idx on public.notifications(recipient_id) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from public,anon,authenticated;
grant select on public.notifications to authenticated;
create policy "recipients read own role alerts" on public.notifications for select to authenticated
using(recipient_id=(select auth.uid()) and exists(select 1 from public.profiles p
  where p.id=(select auth.uid()) and p.is_active and p.role=recipient_role));

create function public.mark_notifications_read(p_notification_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=(select auth.uid()) and is_active) then
    raise exception 'An active account is required.';
  end if;
  update public.notifications n set read_at=now() from public.profiles p
  where n.recipient_id=(select auth.uid()) and p.id=n.recipient_id and p.role=n.recipient_role
    and n.read_at is null and (p_notification_id is null or n.id=p_notification_id);
end $$;
revoke all on function public.mark_notifications_read(uuid) from public,anon;
grant execute on function public.mark_notifications_read(uuid) to authenticated;

create function private.notify_order_delivery_event()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_order public.orders%rowtype; v_kind text; v_message text; v_customer boolean:=false;
  v_operations boolean:=false; v_rider uuid;
begin
  if tg_table_name='orders' then
    v_order:=new;
    if tg_op='INSERT' then
      v_kind:='order_placed'; v_message:='New order #NW-'||new.order_number||' is waiting for confirmation.'; v_operations:=true;
    elsif old.status is distinct from new.status then
      v_kind:='order_'||new.status;
      v_message:='Order #NW-'||new.order_number||': '||replace(new.status::text,'_',' ')||'.'; v_customer:=true;
      if new.status='cancelled' then select assigned_to into v_rider from public.deliveries where order_id=new.id; end if;
    else return new; end if;
  else
    select * into v_order from public.orders where id=new.order_id;
    if not found then return new; end if;
    if tg_op='INSERT' then
      v_kind:='delivery_assigned'; v_message:='A rider has been assigned to order #NW-'||v_order.order_number||'.';
      v_customer:=true; v_rider:=new.assigned_to;
    elsif old.status is distinct from new.status then
      v_kind:='delivery_'||new.status;
      v_message:=case when new.status='out_for_delivery' then 'Order #NW-'||v_order.order_number||' is out for delivery.'
        when new.status='delivered' then 'Order #NW-'||v_order.order_number||' has been delivered. Awaiting restaurant completion.'
        else 'Delivery for order #NW-'||v_order.order_number||': '||replace(new.status::text,'_',' ')||'.' end;
      v_customer:=true; v_operations:=new.status='delivered';
    else return new; end if;
  end if;
  insert into public.notifications(recipient_id,recipient_role,order_id,kind,message)
  select p.id,p.role,v_order.id,v_kind,
    case when p.role='delivery' and v_kind='delivery_assigned' then 'New delivery assignment: order #NW-'||v_order.order_number||'. Open Deliveries to review and start.'
      when p.role='delivery' and v_kind='order_cancelled' then 'Order #NW-'||v_order.order_number||' was cancelled. Do not deliver.'
      else v_message end
  from public.profiles p where p.is_active and (
    (v_customer and p.id=v_order.customer_id and p.role='customer')
    or (v_operations and p.role in ('staff','admin'))
    or (p.id=v_rider and p.role='delivery')
  );
  return new;
end $$;
revoke all on function private.notify_order_delivery_event() from public,anon,authenticated;
create trigger notify_order_insert after insert on public.orders for each row execute function private.notify_order_delivery_event();
create trigger notify_order_status after update of status on public.orders for each row when(old.status is distinct from new.status) execute function private.notify_order_delivery_event();
create trigger notify_delivery_insert after insert on public.deliveries for each row execute function private.notify_order_delivery_event();
create trigger notify_delivery_status after update of status on public.deliveries for each row when(old.status is distinct from new.status) execute function private.notify_order_delivery_event();

alter publication supabase_realtime add table public.notifications;
