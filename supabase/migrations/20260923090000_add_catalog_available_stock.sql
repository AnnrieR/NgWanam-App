drop view public.menu_catalog;

create view public.menu_catalog as
select c.name category_name, c.sort_order category_sort_order, mi.id menu_item_id, mi.name item_name, mi.description, mi.image_url, mi.is_best_seller, mi.requires_preorder,
  mv.id variant_id, mv.name variant_name, mv.serving_label, mv.serving_min, mv.serving_max, mv.price,
  i.current_stock - i.reserved_stock as available_stock,
  case when i.current_stock - i.reserved_stock <= 0 then 'unavailable' when i.current_stock - i.reserved_stock <= i.minimum_stock then 'low_stock' else 'available' end availability_status
from public.categories c join public.menu_items mi on mi.category_id = c.id join public.menu_variants mv on mv.menu_item_id = mi.id join public.inventory i on i.menu_variant_id = mv.id
where mi.is_active and mv.is_active;

grant select on public.menu_catalog to anon, authenticated;
