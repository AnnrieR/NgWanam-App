-- Approved January 2026 delivery-charge guide, with owner-confirmed conflicts.
-- No updates/backfill to historical orders, stock or payment amounts.
create table public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check(length(btrim(name))>0),
  fee numeric(10,2) not null check(fee>=0),
  is_active boolean not null default true,
  source text not null default 'January 2026 delivery guide'
);
alter table public.delivery_areas enable row level security;
revoke all on public.delivery_areas from public,anon,authenticated;
grant select on public.delivery_areas to authenticated;
create policy "active accounts read approved delivery areas" on public.delivery_areas for select to authenticated
using(is_active and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active));

insert into public.delivery_areas(name,fee) values
  ('Batangas City Hall',70),('Batangas National High School',70),('Baymall',70),('BDO P. Burgos',70),
  ('Barangay 11',70),('Barangay 14',70),('Barangay 18',70),('Barangay 21',70),('Barangay 22',70),
  ('Barangay 23',70),('Barangay 24',70),('Barangay 13',70),('Barangay 6',70),('BSU Bayan',70),
  ('Metrobank V. Luna',70),('Ms. Philippines',70),('Nuciti Mall',70),('P. Zamora',70),('Vergara St.',70),
  ('Alangilan',100),('Balagtas',100),('Bolbok',100),('Barangay 1',100),('Barangay 12',100),('Barangay 19',100),
  ('Barangay 2',100),('Barangay 3',100),('Barangay 20',100),('Barangay 8',100),('Calero',100),('Calicanto',100),
  ('D. Silang',100),('Golden Gate Hospital',100),('Gulod Labac',100),('Jesus Nazareth Hospital',100),
  ('Kumintang',100),('Lawas',100),('Libjo',100),('Malitam',100),('Mt. View Park Subd.',100),
  ('Villa Neneng Subd.',100),('P. Dandan',100),('P. Herrera',100),('Pallocan West',100),
  ('Salvador St., Sta. Rita',100),('St. Patrick Hospital',100),('Sta. Fe Road, Sta. Rita',100),
  ('Sta. Rita Karsada',100),('Tambubong, Sta. Rita',100),('Tingga Labac',100),
  ('Barangay 4',100),('Barangay 5',100),('Barangay 7',100),('Barangay 9',100),('Barangay 10',100),
  ('GC Berberabe',120),('Buenafe, Balagtas',120),('Buenafe Subd., Balagtas',120),('Danglayan, San Pascual',120),
  ('Gulod Itaas',120),('Hinch Ville Subd., San Pascual',120),('Mendoza Road, Sta. Rita',120),
  ('Pallocan East',120),('Pulo, Balagtas',120),('San Antonio',120),('San Pascual Chevron',120),
  ('San Pascual Highway',120),('San Pascual Municipal Hall',120),('San Pascual Poblacion',120),('San Pascual Public Market',120),
  ('Banaba South',150),('Ambulong',150),('Balagtas - Sitio 7',150),('Balete',150),('Banaba A-Pool',150),
  ('Banaba Center',150),('Banaba West',150),('Banaba East',150),('Bauan Biayan / Aplaya',150),
  ('Bauan Doctors Hospital',150),('Caltex Road, Sta. Rita',150),('Camella Solomiente',150),('Concepcion',150),
  ('Dalig',150),('Dumantay',150),('Greenwoods Phase 1',150),('Greenwoods Subd.',150),
  ('Hinch Ville, Sta. Rita Karsada',150),('Mahabang Parang',150),('Nangkaan, San Pascual',150),
  ('Sampaga',180),('Sampaga West',180),('San Isidro',180),('San Pascual Alitagtag Road',180),('Shell Refinery',180),
  ('Soro-Soro Karsada',180),('Sta. Rita - Purok 6, 7 Pataas',180),('Sta. Rita Aplaya',180),('Tabangao',180),
  ('Tabangao Brgy. Hall',180),('Tingga Itaas',180),('Tingga Purok 2',180),('Tulo',180),
  ('Villa Mercedes, Sta. Rita',180),('Vista de Oro, Sta. Rita',180),
  ('Balimbing, San Pascual',200),('Bayanan, San Pascual',200),('Bucal',200),('Dagatan',200),
  ('Del Mar, San Pascual',200),('Dumuclay',200),('Greenwoods Phase 4 - Wide',200),('Laurel, San Pascual',200),
  ('Maapas',200),('Mahacot West',200),('Paharang East',200),('Paharang West',200),('Pinamucan',200),
  ('San Andres Proper, Bauan',200),('San Isidro - Malalim',200),('San Jose, San Pascual',200),('San Pascual Sambat',200),
  ('San Pedro, Batangas',200),('Simlong Malapit',200),('Soro-Soro Ibaba',200),('Soro-Soro Ilaya',200),
  ('Soro-Soro Mercedes Homes',200),('Sto. Niño',200),
  ('Alagao, Bauan - Near',250),('Alalum',250),('Bauan - As Is',250),('Bauan - Balayong',250),('Bauan - Bolo',250),
  ('Bauan - Cupang',250),('Bauan - Manghinao',250),('Bauan - San Miguel',250),('Bauan - San Roque',250),
  ('Bauan Inicbulan',250),('Conde Labac',250),('Dahilig',250),('Del Pilar, San Pascual',250),('JG Summit',250),
  ('Mahabang Dahilig',250),('Natunuan, San Pascual',250),('Pagsahingin',250),('San Mateo, San Pascual',250),
  ('Sico',250),('Simlong Malayo',250),('Sinala',250);
update public.delivery_areas set source='Owner-confirmed October 2026; January 2026 guide conflict resolved'
where name in ('Camella Solomiente','Greenwoods Phase 1','Greenwoods Subd.','Nangkaan, San Pascual','Mahabang Dahilig');

alter table public.orders add column delivery_area_id uuid references public.delivery_areas(id) on delete set null;
alter table public.orders add column delivery_area_name text;

-- Replace, not overload: old delivery callers cannot bypass area selection.
-- Defaulted new arguments keep legacy pick-up calls valid; delivery requires a quote.
drop function public.place_order(jsonb,text,text,text,text,text,timestamptz,public.payment_method,text,text,text,text);
create function public.place_order(
  p_cart jsonb,p_contact_name text,p_contact_phone text,p_delivery_address text,
  p_note_to_staff text,p_note_to_driver text,p_required_at timestamptz,p_payment_method public.payment_method,
  p_gcash_sender_name text,p_gcash_number text,p_gcash_reference_number text,p_order_type text default 'delivery',
  p_delivery_area_id uuid default null,p_expected_delivery_fee numeric default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_customer uuid:=(select auth.uid()); v_order uuid; v_subtotal numeric(10,2):=0; v_fee numeric(10,2);
  v_area public.delivery_areas%rowtype; v_type text:=coalesce(p_order_type,'delivery'); v_item record; v_variant record;
begin
  if not exists(select 1 from public.profiles where id=v_customer and role='customer' and is_active) then raise exception 'Only active customers can place orders.'; end if;
  if v_type not in('delivery','pickup') then raise exception 'Choose delivery or pick up.'; end if;
  if p_payment_method is null or p_payment_method not in('cod','gcash') then raise exception 'Choose COD or manual GCash.'; end if;
  if coalesce(btrim(p_contact_name),'')='' or coalesce(btrim(p_contact_phone),'')='' then raise exception 'Enter your contact details.'; end if;
  if p_cart is null or jsonb_typeof(p_cart)<>'array' then raise exception 'Your cart is empty or invalid.'; end if;
  if jsonb_array_length(p_cart)=0 then raise exception 'Your cart is empty.'; end if;
  if exists(select 1 from jsonb_to_recordset(p_cart) as x(variant_id uuid,quantity integer) where variant_id is null or quantity is null or quantity<=0) then raise exception 'Item quantity must be positive and a variant is required.'; end if;
  if v_type='pickup' then v_fee:=0;
  else
    if coalesce(btrim(p_delivery_address),'')='' then raise exception 'Enter a complete delivery address.'; end if;
    select * into v_area from public.delivery_areas where id=p_delivery_area_id and is_active for share;
    if not found then raise exception 'Choose a supported delivery area. Refresh checkout if your area is missing.'; end if;
    v_fee:=v_area.fee;
    -- The client quote is compared, never used as the charged amount.
    if p_expected_delivery_fee is distinct from v_fee then raise exception 'Delivery fee changed or could not be confirmed. Refresh checkout and review the total before placing your order.'; end if;
  end if;
  for v_item in select variant_id,sum(quantity)::integer quantity from jsonb_to_recordset(p_cart) as x(variant_id uuid,quantity integer) group by variant_id order by variant_id loop
    select mv.name variant_name,mv.price,mi.name item_name,i.id inventory_id,i.current_stock,i.reserved_stock
    into v_variant from public.menu_variants mv join public.menu_items mi on mi.id=mv.menu_item_id join public.inventory i on i.menu_variant_id=mv.id
    where mv.id=v_item.variant_id and mv.is_active and mi.is_active and mi.approval_status='approved' for update of i;
    if not found then raise exception 'This item is no longer available.'; end if;
    if v_variant.current_stock-v_variant.reserved_stock<v_item.quantity then raise exception 'Only % serving(s) are currently available.',greatest(v_variant.current_stock-v_variant.reserved_stock,0); end if;
    v_subtotal:=v_subtotal+v_variant.price*v_item.quantity;
  end loop;
  insert into public.orders(customer_id,order_type,contact_name,contact_phone,delivery_address,note_to_staff,note_to_driver,required_at,subtotal,delivery_fee,total,delivery_area_id,delivery_area_name)
  values(v_customer,v_type,btrim(p_contact_name),btrim(p_contact_phone),case when v_type='delivery' then v_area.name||' — '||btrim(p_delivery_address) end,
    nullif(p_note_to_staff,''),case when v_type='delivery' then nullif(p_note_to_driver,'') end,p_required_at,v_subtotal,v_fee,v_subtotal+v_fee,
    case when v_type='delivery' then v_area.id end,case when v_type='delivery' then v_area.name end) returning id into v_order;
  for v_item in select variant_id,sum(quantity)::integer quantity from jsonb_to_recordset(p_cart) as x(variant_id uuid,quantity integer) group by variant_id order by variant_id loop
    select mv.name variant_name,mv.price,mi.name item_name,i.id inventory_id into v_variant
    from public.menu_variants mv join public.menu_items mi on mi.id=mv.menu_item_id join public.inventory i on i.menu_variant_id=mv.id where mv.id=v_item.variant_id;
    insert into public.order_items(order_id,menu_variant_id,item_name,variant_name,quantity,unit_price,subtotal)
    values(v_order,v_item.variant_id,v_variant.item_name,v_variant.variant_name,v_item.quantity,v_variant.price,v_variant.price*v_item.quantity);
    update public.inventory set reserved_stock=reserved_stock+v_item.quantity where id=v_variant.inventory_id;
    insert into public.inventory_movements(inventory_id,order_id,quantity,movement_type,performed_by) values(v_variant.inventory_id,v_order,v_item.quantity,'reservation',v_customer);
  end loop;
  insert into public.payments(order_id,method,amount,gcash_sender_name,gcash_number,gcash_reference_number)
  values(v_order,p_payment_method,v_subtotal+v_fee,case when p_payment_method='gcash' then nullif(btrim(p_gcash_sender_name),'') end,
    case when p_payment_method='gcash' then nullif(btrim(p_gcash_number),'') end,case when p_payment_method='gcash' then nullif(btrim(p_gcash_reference_number),'') end);
  return v_order;
end $$;
revoke all on function public.place_order(jsonb,text,text,text,text,text,timestamptz,public.payment_method,text,text,text,text,uuid,numeric) from public,anon;
grant execute on function public.place_order(jsonb,text,text,text,text,text,timestamptz,public.payment_method,text,text,text,text,uuid,numeric) to authenticated;

-- Retire the flat-fee chatbot answer, without replacing edited FAQ records.
create or replace function public.match_chatbot_rule(p_message text)
returns text language plpgsql security definer set search_path='' as $$
declare v_response text;
begin
  if lower(coalesce(p_message,'')) like '%delivery fee%' then
    return 'Delivery fees depend on the supported area selected at checkout. Search and choose your exact area to see its approved fee and order total. Pick-up has no delivery fee. If your area is not listed, contact the restaurant; do not select a different area.';
  end if;
  select r.response into v_response from public.chatbot_rules r cross join lateral unnest(r.keywords) as k(keyword)
  where r.is_active and length(trim(k.keyword))>0 and position(lower(k.keyword) in lower(coalesce(p_message,'')))>0
  order by length(k.keyword) desc,r.intent limit 1;
  return coalesce(v_response,'I can help with the menu, delivery, operating hours, payment, or how to order.');
end $$;
