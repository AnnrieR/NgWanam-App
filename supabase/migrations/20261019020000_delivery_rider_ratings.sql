create table public.delivery_ratings (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null unique references public.deliveries(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  rider_id uuid not null references public.profiles(id),
  rating integer not null check(rating between 1 and 5),
  comment text check(comment is null or char_length(comment)<=500),
  created_at timestamptz not null default now()
);
create index delivery_ratings_rider_id_idx on public.delivery_ratings(rider_id);
alter table public.delivery_ratings enable row level security;
revoke all on public.delivery_ratings from public,anon,authenticated;
grant select on public.delivery_ratings to authenticated;
-- Writes are available only through the ownership/eligibility-checked RPC.
revoke insert,update,delete on public.delivery_ratings from authenticated;
create policy "authorized users read delivery ratings" on public.delivery_ratings for select to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active)
  and (customer_id=(select auth.uid()) or rider_id=(select auth.uid()) or (select private.is_staff_or_admin())));

create or replace function public.submit_delivery_rating(p_order_id uuid,p_rating integer,p_comment text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_delivery uuid; v_rider uuid;
begin
  if not exists(select 1 from public.profiles where id=(select auth.uid()) and role='customer' and is_active) then
    raise exception 'Only an active customer can rate a delivery.';
  end if;
  if p_rating is null or p_rating<1 or p_rating>5 then raise exception 'Choose a whole-number rating from 1 to 5.'; end if;
  if char_length(coalesce(p_comment,''))>500 then raise exception 'Comment must be at most 500 characters.'; end if;
  select d.id,d.assigned_to into v_delivery,v_rider from public.deliveries d join public.orders o on o.id=d.order_id
    where o.id=p_order_id and o.customer_id=(select auth.uid()) and o.order_type='delivery'
      and o.status in ('ready','completed') and d.status='delivered' and d.assigned_to is not null
    for update of d,o;
  if not found then raise exception 'Only your own successfully delivered order can be rated.'; end if;
  if exists(select 1 from public.delivery_ratings where delivery_id=v_delivery) then raise exception 'This delivery has already been rated.'; end if;
  insert into public.delivery_ratings(delivery_id,customer_id,rider_id,rating,comment)
  values(v_delivery,(select auth.uid()),v_rider,p_rating,nullif(btrim(p_comment),''));
end $$;

-- Customers may see their assigned rider's display name without broadening
-- profile RLS or exposing rider/customer profile records globally.
create or replace function public.get_delivery_rating_context(p_order_id uuid)
returns table(rider_name text,rating integer,comment text,can_rate boolean)
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=(select auth.uid()) and role='customer' and is_active) then return; end if;
  return query select coalesce(p.full_name,'Your rider'),r.rating,r.comment,
    (o.status in ('ready','completed') and d.status='delivered' and d.assigned_to is not null and r.id is null)
    from public.orders o join public.deliveries d on d.order_id=o.id
    left join public.profiles p on p.id=d.assigned_to left join public.delivery_ratings r on r.delivery_id=d.id
    where o.id=p_order_id and o.customer_id=(select auth.uid()) and o.order_type='delivery';
end $$;

create or replace function public.get_rider_rating_summaries()
returns table(rider_id uuid,average_rating numeric,rating_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active and p.role in ('staff','admin','delivery')) then
    raise exception 'Rider ratings are available only to authorized operational accounts.';
  end if;
  return query select r.rider_id,round(avg(r.rating),1),count(*) from public.delivery_ratings r
    where private.is_staff_or_admin() or r.rider_id=(select auth.uid()) group by r.rider_id;
end $$;

revoke all on function public.submit_delivery_rating(uuid,integer,text) from public,anon;
revoke all on function public.get_delivery_rating_context(uuid) from public,anon;
revoke all on function public.get_rider_rating_summaries() from public,anon;
grant execute on function public.submit_delivery_rating(uuid,integer,text) to authenticated;
grant execute on function public.get_delivery_rating_context(uuid) to authenticated;
grant execute on function public.get_rider_rating_summaries() to authenticated;
