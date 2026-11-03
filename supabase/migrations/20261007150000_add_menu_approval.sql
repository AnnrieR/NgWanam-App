-- The adviser asked for a menu approval step: staff add an item, the admin
-- approves it, and customers must not see it until then.

-- 1. Approval state lives on the item itself.
--    The column defaults to 'approved' so the 163 items that already exist
--    keep selling the moment this runs — only *new* entries start as pending.
alter table public.menu_items
  add column if not exists approval_status text not null default 'approved';

alter table public.menu_items drop constraint if exists menu_items_approval_status_check;
alter table public.menu_items
  add constraint menu_items_approval_status_check
  check (approval_status in ('pending', 'approved', 'rejected'));

-- Who made the call, and when — filled in by the guard trigger below.
alter table public.menu_items add column if not exists decided_at timestamptz;
alter table public.menu_items add column if not exists decided_by uuid references public.profiles (id) on delete set null;

-- 2. A staff submission starts as pending. An admin creating the item is
--    already the approver, so it goes live straight away.
create or replace function public.create_menu_entry(
  p_category_id uuid, p_item_name text, p_description text, p_image_url text,
  p_is_best_seller boolean, p_requires_preorder boolean, p_variant_name text,
  p_serving_label text, p_price numeric
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_item_id uuid; v_variant_id uuid;
begin
  if not private.is_staff_or_admin() then raise exception 'Only staff can create menu entries.'; end if;
  if nullif(trim(p_item_name), '') is null or nullif(trim(p_variant_name), '') is null or nullif(trim(p_serving_label), '') is null or p_price < 0 then
    raise exception 'Menu item, variant, serving label, and non-negative price are required.';
  end if;
  if not exists (select 1 from public.categories where id = p_category_id) then raise exception 'Category not found.'; end if;
  insert into public.menu_items (
    category_id, name, description, image_url, is_best_seller, requires_preorder,
    approval_status, decided_at, decided_by
  )
  values (
    p_category_id, trim(p_item_name), nullif(trim(p_description), ''), nullif(trim(p_image_url), ''),
    p_is_best_seller, p_requires_preorder,
    case when private.is_admin() then 'approved' else 'pending' end,
    case when private.is_admin() then now() end,
    case when private.is_admin() then (select auth.uid()) end
  )
  returning id into v_item_id;
  insert into public.menu_variants (menu_item_id, name, serving_label, price)
  values (v_item_id, trim(p_variant_name), trim(p_serving_label), p_price)
  returning id into v_variant_id;
  insert into public.inventory (menu_variant_id) values (v_variant_id);
  return v_variant_id;
end;
$$;

-- 3. Customers only ever read approved items. `place_order` re-checks
--    `mi.is_active`, so a rejected item (see the admin action, which also
--    clears is_active) cannot be ordered from a stale cart either.
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
  -- Unapproved submissions and rejected items must never reach a customer.
  where mi.is_active and mv.is_active and mi.approval_status = 'approved'
  order by c.sort_order, mi.name, mv.price;
$$;

-- 4. RLS on menu_items is "staff manage menu items", so without this a staff
--    member could flip their own submission to approved with a direct UPDATE.
--    The approval columns are therefore guarded at the row level, and the
--    decision is stamped here so both approve and reject record who did it.
create function private.guard_menu_approval()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.approval_status is distinct from old.approval_status then
    if not private.is_admin() then
      raise exception 'Only an admin can approve menu items.' using errcode = '42501';
    end if;
    new.decided_at := now();
    new.decided_by := (select auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists menu_items_guard_approval on public.menu_items;
create trigger menu_items_guard_approval
  before update of approval_status on public.menu_items
  for each row execute function private.guard_menu_approval();
