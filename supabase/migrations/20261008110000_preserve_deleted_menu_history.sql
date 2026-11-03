-- SET NULL must be compatible with column nullability. No historical line
-- names, prices or movement quantities are deleted or changed.
alter table public.order_items alter column menu_variant_id drop not null;
alter table public.inventory_movements alter column inventory_id drop not null;
alter table public.inventory_movements drop constraint inventory_movements_inventory_id_fkey;
alter table public.inventory_movements add constraint inventory_movements_inventory_id_fkey
  foreign key (inventory_id) references public.inventory(id) on delete set null;
