revoke insert, update on public.restaurant_settings from authenticated;

create or replace function public.update_ordering_settings(p_delivery_fee numeric, p_gcash_qr_path text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_staff_or_admin() then raise exception 'Only staff can update ordering settings.'; end if;

  update public.restaurant_settings
  set delivery_fee = p_delivery_fee, gcash_qr_path = nullif(p_gcash_qr_path, '')
  where id = true;
end;
$$;

create or replace function public.update_restaurant_info(
  p_name text, p_address text, p_operating_hours text, p_phone_numbers text[],
  p_facebook_url text, p_delivery_service_areas text[]
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Only admins can update restaurant information.'; end if;

  update public.restaurant_settings
  set name = p_name,
    address = p_address,
    operating_hours = p_operating_hours,
    phone_numbers = p_phone_numbers,
    facebook_url = nullif(p_facebook_url, ''),
    delivery_service_areas = p_delivery_service_areas
  where id = true;
end;
$$;

revoke execute on function public.update_ordering_settings(numeric, text), public.update_restaurant_info(text, text, text, text[], text, text[]) from public, anon;
grant execute on function public.update_ordering_settings(numeric, text), public.update_restaurant_info(text, text, text, text[], text, text[]) to authenticated;
