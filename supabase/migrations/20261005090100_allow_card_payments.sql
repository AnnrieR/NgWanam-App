alter table public.payments drop constraint payments_check;
alter table public.payments add constraint payments_check check (
  (method in ('cod', 'card') and gcash_sender_name is null and gcash_number is null and gcash_reference_number is null)
  or (method = 'gcash' and gcash_sender_name is not null and gcash_number is not null and gcash_reference_number is not null)
);

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
    (v_method in ('cod', 'card') and v_payment_status = 'pending')
    or (v_method = 'gcash' and v_payment_status = 'verified')
  ) then
    update public.payments set status = 'paid' where id = p_payment_id;
    return;
  end if;
  raise exception 'This payment status change is not allowed.';
end;
$$;
