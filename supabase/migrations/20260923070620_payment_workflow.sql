create or replace function public.update_payment_status(p_payment_id uuid, p_next_status public.payment_status)
returns void language plpgsql security definer set search_path = '' as $$
declare v_method public.payment_method; v_payment_status public.payment_status; v_order_status public.order_status;
begin
  if not private.is_staff_or_admin() then raise exception 'Only staff can update payments.'; end if;
  select p.method, p.status, o.status into v_method, v_payment_status, v_order_status
  from public.payments p join public.orders o on o.id = p.order_id
  where p.id = p_payment_id for update of p;
  if not found then raise exception 'Payment not found.'; end if;
  if v_payment_status = 'pending' and v_method = 'gcash' and p_next_status in ('verified', 'rejected') then
    update public.payments set status = p_next_status,
      verified_by = case when p_next_status = 'verified' then (select auth.uid()) else null end,
      verified_at = case when p_next_status = 'verified' then now() else null end
    where id = p_payment_id;
    return;
  end if;
  if v_order_status = 'completed' and p_next_status = 'paid' and (
    (v_method = 'cod' and v_payment_status = 'pending')
    or (v_method = 'gcash' and v_payment_status = 'verified')
  ) then
    update public.payments set status = 'paid' where id = p_payment_id;
    return;
  end if;
  raise exception 'This payment status change is not allowed.';
end;
$$;

grant execute on function public.update_payment_status(uuid, public.payment_status) to authenticated;
revoke execute on function public.update_payment_status(uuid, public.payment_status) from public, anon;
