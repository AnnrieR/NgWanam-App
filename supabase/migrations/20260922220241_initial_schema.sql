create schema if not exists private;

create type public.profile_role as enum ('customer', 'staff', 'delivery', 'admin');
create type public.order_status as enum ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
create type public.payment_method as enum ('cod', 'gcash');
create type public.payment_status as enum ('pending', 'verified', 'rejected', 'paid');
create type public.delivery_status as enum ('assigned', 'out_for_delivery', 'delivered');
create type public.inventory_movement_type as enum ('reservation', 'release', 'completion', 'manual_adjustment');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  role public.profile_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order smallint not null unique check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  name text not null,
  description text,
  image_url text,
  is_best_seller boolean not null default false,
  requires_preorder boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);

create table public.menu_variants (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  serving_label text not null,
  serving_min smallint,
  serving_max smallint,
  price numeric(10,2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (serving_min is null or serving_min > 0),
  check (serving_max is null or serving_max > 0),
  check (serving_min is null or serving_max is null or serving_min <= serving_max),
  unique (menu_item_id, name)
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  menu_variant_id uuid not null unique references public.menu_variants(id) on delete cascade,
  current_stock integer not null default 0 check (current_stock >= 0),
  reserved_stock integer not null default 0 check (reserved_stock >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  updated_at timestamptz not null default now(),
  check (reserved_stock <= current_stock)
);

create table public.restaurant_settings (
  id boolean primary key default true check (id),
  name text not null,
  address text not null,
  operating_hours text not null,
  phone_numbers text[] not null,
  facebook_url text,
  delivery_service_areas text[] not null,
  delivery_fee numeric(10,2) check (delivery_fee is null or delivery_fee >= 0),
  gcash_qr_path text,
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid not null references public.profiles(id),
  status public.order_status not null default 'pending',
  contact_name text not null,
  contact_phone text not null,
  delivery_address text not null,
  note_to_staff text,
  note_to_driver text,
  required_at timestamptz,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  delivery_fee numeric(10,2) not null check (delivery_fee >= 0),
  total numeric(10,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal + delivery_fee)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_variant_id uuid not null references public.menu_variants(id),
  item_name text not null,
  variant_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  subtotal numeric(10,2) not null check (subtotal = quantity * unit_price),
  unique (order_id, menu_variant_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount numeric(10,2) not null check (amount >= 0),
  gcash_sender_name text,
  gcash_number text,
  gcash_reference_number text,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (method = 'cod' and gcash_sender_name is null and gcash_number is null and gcash_reference_number is null)
    or (method = 'gcash' and gcash_sender_name is not null and gcash_number is not null and gcash_reference_number is not null)
  )
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  assigned_to uuid references public.profiles(id),
  status public.delivery_status not null default 'assigned',
  assigned_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory(id),
  order_id uuid references public.orders(id),
  quantity integer not null check (quantity <> 0),
  movement_type public.inventory_movement_type not null,
  performed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.chatbot_rules (
  id uuid primary key default gen_random_uuid(),
  intent text not null unique,
  keywords text[] not null,
  response text not null,
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  record_type text not null,
  record_id uuid,
  created_at timestamptz not null default now()
);

create index orders_customer_created_idx on public.orders (customer_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index deliveries_assigned_status_idx on public.deliveries (assigned_to, status);
create index inventory_movements_inventory_created_idx on public.inventory_movements (inventory_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_menu_items_updated_at before update on public.menu_items for each row execute function public.set_updated_at();
create trigger set_menu_variants_updated_at before update on public.menu_variants for each row execute function public.set_updated_at();
create trigger set_inventory_updated_at before update on public.inventory for each row execute function public.set_updated_at();
create trigger set_settings_updated_at before update on public.restaurant_settings for each row execute function public.set_updated_at();
create trigger set_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger set_deliveries_updated_at before update on public.deliveries for each row execute function public.set_updated_at();

create or replace function public.create_customer_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_customer_profile();

create or replace function public.protect_customer_profile()
returns trigger language plpgsql as $$
begin
  if (select auth.uid()) = old.id and (
    new.id is distinct from old.id or new.email is distinct from old.email or
    new.role is distinct from old.role or new.is_active is distinct from old.is_active
  ) then
    raise exception 'Customers cannot change their account role or access status.';
  end if;
  return new;
end;
$$;
create trigger protect_customer_profile before update on public.profiles for each row execute function public.protect_customer_profile();

create or replace function private.is_staff_or_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('staff', 'admin') and is_active
  );
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and is_active
  );
$$;

create or replace function public.place_order(
  p_cart jsonb, p_contact_name text, p_contact_phone text, p_delivery_address text,
  p_note_to_staff text, p_note_to_driver text, p_required_at timestamptz,
  p_payment_method public.payment_method, p_gcash_sender_name text default null,
  p_gcash_number text default null, p_gcash_reference_number text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_customer_id uuid := (select auth.uid());
  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2);
  v_item record;
  v_variant record;
begin
  if v_customer_id is null then raise exception 'Please sign in before placing an order.'; end if;
  if jsonb_typeof(p_cart) <> 'array' or jsonb_array_length(p_cart) = 0 then raise exception 'Your cart is empty.'; end if;
  select delivery_fee into v_delivery_fee from public.restaurant_settings where id = true;
  if v_delivery_fee is null then raise exception 'Delivery fee is not configured.'; end if;
  for v_item in select variant_id, sum(quantity)::integer quantity from jsonb_to_recordset(p_cart) as x(variant_id uuid, quantity integer) group by variant_id loop
    if v_item.quantity <= 0 then raise exception 'Item quantity must be positive.'; end if;
    select mv.id, mv.name variant_name, mv.price, mi.name item_name, i.id inventory_id, i.current_stock, i.reserved_stock
    into v_variant from public.menu_variants mv join public.menu_items mi on mi.id = mv.menu_item_id
    join public.inventory i on i.menu_variant_id = mv.id
    where mv.id = v_item.variant_id and mv.is_active and mi.is_active for update of i;
    if not found then raise exception 'This item is no longer available.'; end if;
    if v_variant.current_stock - v_variant.reserved_stock < v_item.quantity then
      raise exception 'Only % serving(s) are currently available.', greatest(v_variant.current_stock - v_variant.reserved_stock, 0);
    end if;
    v_subtotal := v_subtotal + v_variant.price * v_item.quantity;
  end loop;
  insert into public.orders (customer_id, contact_name, contact_phone, delivery_address, note_to_staff, note_to_driver, required_at, subtotal, delivery_fee, total)
  values (v_customer_id, p_contact_name, p_contact_phone, p_delivery_address, nullif(p_note_to_staff, ''), nullif(p_note_to_driver, ''), p_required_at, v_subtotal, v_delivery_fee, v_subtotal + v_delivery_fee)
  returning id into v_order_id;
  for v_item in select variant_id, sum(quantity)::integer quantity from jsonb_to_recordset(p_cart) as x(variant_id uuid, quantity integer) group by variant_id loop
    select mv.name variant_name, mv.price, mi.name item_name, i.id inventory_id into v_variant
    from public.menu_variants mv join public.menu_items mi on mi.id = mv.menu_item_id join public.inventory i on i.menu_variant_id = mv.id where mv.id = v_item.variant_id;
    insert into public.order_items (order_id, menu_variant_id, item_name, variant_name, quantity, unit_price, subtotal)
    values (v_order_id, v_item.variant_id, v_variant.item_name, v_variant.variant_name, v_item.quantity, v_variant.price, v_variant.price * v_item.quantity);
    update public.inventory set reserved_stock = reserved_stock + v_item.quantity where id = v_variant.inventory_id;
    insert into public.inventory_movements (inventory_id, order_id, quantity, movement_type, performed_by)
    values (v_variant.inventory_id, v_order_id, v_item.quantity, 'reservation', v_customer_id);
  end loop;
  insert into public.payments (order_id, method, amount, gcash_sender_name, gcash_number, gcash_reference_number)
  values (v_order_id, p_payment_method, v_subtotal + v_delivery_fee,
    case when p_payment_method = 'gcash' then nullif(p_gcash_sender_name, '') end,
    case when p_payment_method = 'gcash' then nullif(p_gcash_number, '') end,
    case when p_payment_method = 'gcash' then nullif(p_gcash_reference_number, '') end);
  return v_order_id;
end;
$$;

create or replace function public.update_order_status(p_order_id uuid, p_next_status public.order_status)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype; v_delivery_status public.delivery_status; v_item record;
begin
  if not private.is_staff_or_admin() then raise exception 'Only staff can update order status.'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if p_next_status = 'cancelled' and v_order.status not in ('completed', 'cancelled') then
    update public.orders set status = 'cancelled' where id = p_order_id;
    for v_item in select oi.quantity, i.id inventory_id from public.order_items oi join public.inventory i on i.menu_variant_id = oi.menu_variant_id where oi.order_id = p_order_id loop
      update public.inventory set reserved_stock = reserved_stock - v_item.quantity where id = v_item.inventory_id;
      insert into public.inventory_movements (inventory_id, order_id, quantity, movement_type, performed_by) values (v_item.inventory_id, p_order_id, -v_item.quantity, 'release', (select auth.uid()));
    end loop;
    return;
  end if;
  if (v_order.status, p_next_status) not in (('pending','confirmed'), ('confirmed','preparing'), ('preparing','ready'), ('ready','completed')) then raise exception 'This order status change is not allowed.'; end if;
  if p_next_status = 'completed' then
    select status into v_delivery_status from public.deliveries where order_id = p_order_id;
    if v_delivery_status is distinct from 'delivered' then raise exception 'A delivery must be marked delivered before completion.'; end if;
    for v_item in select oi.quantity, i.id inventory_id from public.order_items oi join public.inventory i on i.menu_variant_id = oi.menu_variant_id where oi.order_id = p_order_id loop
      update public.inventory set current_stock = current_stock - v_item.quantity, reserved_stock = reserved_stock - v_item.quantity where id = v_item.inventory_id;
      insert into public.inventory_movements (inventory_id, order_id, quantity, movement_type, performed_by) values (v_item.inventory_id, p_order_id, -v_item.quantity, 'completion', (select auth.uid()));
    end loop;
  end if;
  update public.orders set status = p_next_status where id = p_order_id;
end;
$$;

create or replace function public.update_inventory_stock(p_inventory_id uuid, p_current_stock integer, p_minimum_stock integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_staff_or_admin() then raise exception 'Only staff can update inventory.'; end if;
  if p_current_stock < 0 or p_minimum_stock < 0 then raise exception 'Stock quantities cannot be negative.'; end if;
  update public.inventory set current_stock = p_current_stock, minimum_stock = p_minimum_stock
  where id = p_inventory_id and reserved_stock <= p_current_stock;
  if not found then raise exception 'Current stock cannot be lower than reserved stock.'; end if;
end;
$$;

create or replace view public.menu_catalog as
select c.name category_name, c.sort_order category_sort_order, mi.id menu_item_id, mi.name item_name, mi.description, mi.image_url, mi.is_best_seller, mi.requires_preorder,
  mv.id variant_id, mv.name variant_name, mv.serving_label, mv.serving_min, mv.serving_max, mv.price,
  case when i.current_stock - i.reserved_stock <= 0 then 'unavailable' when i.current_stock - i.reserved_stock <= i.minimum_stock then 'low_stock' else 'available' end availability_status
from public.categories c join public.menu_items mi on mi.category_id = c.id join public.menu_variants mv on mv.menu_item_id = mi.id join public.inventory i on i.menu_variant_id = mv.id
where mi.is_active and mv.is_active;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.deliveries enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.chatbot_rules enable row level security;
alter table public.activity_logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.menu_catalog to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.orders, public.order_items, public.payments, public.deliveries to authenticated;
grant select, insert, update on public.categories, public.menu_items, public.menu_variants, public.restaurant_settings, public.chatbot_rules, public.activity_logs to authenticated;
grant select on public.inventory to authenticated;
grant select, insert on public.inventory_movements to authenticated;
grant execute on function public.place_order(jsonb, text, text, text, text, text, timestamptz, public.payment_method, text, text, text) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.update_inventory_stock(uuid, integer, integer) to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_staff_or_admin(), private.is_admin() to authenticated;
revoke execute on function public.place_order(jsonb, text, text, text, text, text, timestamptz, public.payment_method, text, text, text) from public, anon;
revoke execute on function public.update_order_status(uuid, public.order_status) from public, anon;
revoke execute on function public.update_inventory_stock(uuid, integer, integer) from public, anon;
revoke execute on function private.is_staff_or_admin(), private.is_admin() from public, anon;

create policy "customers read their own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id or (select private.is_staff_or_admin()));
create policy "customers update their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "staff manage menu" on public.categories for all to authenticated using ((select private.is_staff_or_admin())) with check ((select private.is_staff_or_admin()));
create policy "staff manage menu items" on public.menu_items for all to authenticated using ((select private.is_staff_or_admin())) with check ((select private.is_staff_or_admin()));
create policy "staff manage menu variants" on public.menu_variants for all to authenticated using ((select private.is_staff_or_admin())) with check ((select private.is_staff_or_admin()));
create policy "staff view inventory" on public.inventory for select to authenticated using ((select private.is_staff_or_admin()));
create policy "staff manage settings" on public.restaurant_settings for all to authenticated using ((select private.is_staff_or_admin())) with check ((select private.is_staff_or_admin()));
create policy "customers read own orders" on public.orders for select to authenticated using ((select auth.uid()) = customer_id or (select private.is_staff_or_admin()));
create policy "customers read own items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = (select auth.uid()) or (select private.is_staff_or_admin()))));
create policy "customers read own payment" on public.payments for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())) or (select private.is_staff_or_admin()));
create policy "customers read own delivery" on public.deliveries for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())) or assigned_to = (select auth.uid()) or (select private.is_staff_or_admin()));
create policy "staff view movements" on public.inventory_movements for select to authenticated using ((select private.is_staff_or_admin()));
create policy "staff add movements" on public.inventory_movements for insert to authenticated with check ((select private.is_staff_or_admin()));
create policy "admin manage chatbot rules" on public.chatbot_rules for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin read activity logs" on public.activity_logs for select to authenticated using ((select private.is_admin()));
