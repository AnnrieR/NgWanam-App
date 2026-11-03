drop view public.menu_catalog;

alter function public.set_updated_at() set search_path = '';
alter function public.protect_customer_profile() set search_path = '';

create or replace function public.get_menu_catalog()
returns table (
  category_name text, category_sort_order smallint, menu_item_id uuid, item_name text,
  description text, image_url text, is_best_seller boolean, requires_preorder boolean,
  variant_id uuid, variant_name text, serving_label text, serving_min smallint,
  serving_max smallint, price numeric, available_stock integer, availability_status text
)
language sql security definer set search_path = '' as $$
  select c.name, c.sort_order, mi.id, mi.name, mi.description, mi.image_url, mi.is_best_seller, mi.requires_preorder,
    mv.id, mv.name, mv.serving_label, mv.serving_min, mv.serving_max, mv.price,
    i.current_stock - i.reserved_stock,
    case when i.current_stock - i.reserved_stock <= 0 then 'unavailable' when i.current_stock - i.reserved_stock <= i.minimum_stock then 'low_stock' else 'available' end
  from public.categories c
  join public.menu_items mi on mi.category_id = c.id
  join public.menu_variants mv on mv.menu_item_id = mi.id
  join public.inventory i on i.menu_variant_id = mv.id
  where mi.is_active and mv.is_active
  order by c.sort_order, mi.name, mv.price;
$$;

revoke execute on function public.get_menu_catalog() from public;
grant execute on function public.get_menu_catalog() to anon, authenticated;
