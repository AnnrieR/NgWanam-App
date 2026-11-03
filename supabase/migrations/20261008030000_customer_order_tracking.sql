-- Expose only the assigned rider's contact and this customer's order timeline,
-- not the staff profile table or the full internal activity log.
create or replace function public.get_order_tracking(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.orders where id = p_order_id and customer_id = auth.uid()
  ) then
    raise exception 'Order not accessible.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'milestones', coalesce((
      select jsonb_object_agg(s.action, s.at) from (
        select action, min(created_at) as at from public.activity_logs
        where record_type = 'orders' and record_id = p_order_id
        group by action
      ) s
    ), '{}'::jsonb),
    'rider', (
      select jsonb_build_object('name', p.full_name, 'phone', p.phone)
      from public.deliveries d join public.profiles p on p.id = d.assigned_to
      where d.order_id = p_order_id
    )
  ) into result;
  return result;
end;
$$;
revoke execute on function public.get_order_tracking(uuid) from public, anon;
grant execute on function public.get_order_tracking(uuid) to authenticated;
