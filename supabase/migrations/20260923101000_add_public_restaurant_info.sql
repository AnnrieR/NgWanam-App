create or replace function public.get_restaurant_info()
returns table (
  name text, address text, operating_hours text, phone_numbers text[],
  facebook_url text, delivery_service_areas text[]
)
language sql security definer set search_path = '' as $$
  select name, address, operating_hours, phone_numbers, facebook_url, delivery_service_areas
  from public.restaurant_settings
  where id = true;
$$;

revoke execute on function public.get_restaurant_info() from public;
grant execute on function public.get_restaurant_info() to anon, authenticated;
