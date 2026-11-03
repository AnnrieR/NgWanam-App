create or replace function private.can_access_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_staff_or_admin())
    or exists (
      select 1 from public.orders o
      where o.id = p_order_id and o.customer_id = (select auth.uid())
    )
    or exists (
      select 1 from public.deliveries d
      where d.order_id = p_order_id and d.assigned_to = (select auth.uid())
    );
$$;

grant execute on function private.can_access_order(uuid) to authenticated;
revoke execute on function private.can_access_order(uuid) from public, anon;

drop policy "customers read own orders" on public.orders;
drop policy "customers read own items" on public.order_items;
drop policy "customers read own payment" on public.payments;
drop policy "customers read own delivery" on public.deliveries;

create policy "users read accessible orders"
on public.orders for select to authenticated
using ((select private.can_access_order(id)));

create policy "users read accessible order items"
on public.order_items for select to authenticated
using ((select private.can_access_order(order_id)));

create policy "users read accessible payments"
on public.payments for select to authenticated
using ((select private.can_access_order(order_id)));

create policy "users read accessible deliveries"
on public.deliveries for select to authenticated
using ((select private.can_access_order(order_id)));
