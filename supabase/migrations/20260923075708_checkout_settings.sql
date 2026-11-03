create or replace function public.get_checkout_settings()
returns table (delivery_fee numeric, gcash_qr_path text) language sql security definer set search_path = '' as $$
  select delivery_fee, gcash_qr_path from public.restaurant_settings where id = true;
$$;

grant execute on function public.get_checkout_settings() to anon, authenticated;
revoke execute on function public.get_checkout_settings() from public;
