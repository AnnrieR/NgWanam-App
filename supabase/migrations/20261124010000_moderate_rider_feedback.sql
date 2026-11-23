-- Additive: preserve every original rating/comment and all order/payment history.
-- Legacy feedback is pending and NOT opted in for public use.
alter table public.delivery_ratings
  add column review_status text not null default 'pending' check (review_status in ('pending','approved','private')),
  add column allow_public boolean not null default false,
  add column public_quote text check (public_quote is null or char_length(public_quote) <= 500),
  add column reviewed_by uuid references public.profiles(id),
  add column reviewed_at timestamptz,
  add constraint approved_feedback_has_review check (review_status <> 'approved' or
    (allow_public and rating >= 4 and nullif(btrim(public_quote),'') is not null and reviewed_by is not null and reviewed_at is not null));

-- Private raw feedback: its author and active administrators only.
-- Aggregate internal rider scores still include ALL valid submissions unchanged.
drop policy "authorized users read delivery ratings" on public.delivery_ratings;
create policy "authors and admins read private delivery ratings" on public.delivery_ratings
for select to authenticated using (exists(select 1 from public.profiles p
  where p.id=(select auth.uid()) and p.is_active and (p.id=customer_id or p.role='admin')));

-- Keep the old three-argument RPC for older clients (no public consent).
-- Reuse its ownership, delivered-order and duplicate-rating validation atomically.
create function public.submit_delivery_rating_with_consent(p_order_id uuid,p_rating integer,p_comment text,p_allow_public boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.submit_delivery_rating(p_order_id,p_rating,p_comment);
  update public.delivery_ratings r set allow_public=coalesce(p_allow_public,false)
    from public.deliveries d where r.delivery_id=d.id and d.order_id=p_order_id and r.customer_id=(select auth.uid());
end $$;

create function public.get_admin_rider_feedback()
returns table(id uuid,order_number bigint,rider_id uuid,rider_name text,customer_name text,rating integer,comment text,
  created_at timestamptz,review_status text,allow_public boolean,public_quote text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin' and is_active) then
    raise exception 'Only active administrators can review rider feedback.';
  end if;
  return query select r.id,o.order_number,r.rider_id,rider.full_name,customer.full_name,r.rating,r.comment,
    r.created_at,r.review_status,r.allow_public,r.public_quote
    from public.delivery_ratings r join public.deliveries d on d.id=r.delivery_id
    join public.orders o on o.id=d.order_id
    join public.profiles rider on rider.id=r.rider_id join public.profiles customer on customer.id=r.customer_id
    order by r.created_at desc;
end $$;

create function public.moderate_rider_feedback(p_rating_id uuid,p_decision text,p_public_quote text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_rating public.delivery_ratings%rowtype; v_quote text:=nullif(btrim(p_public_quote),'');
begin
  if not exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin' and is_active) then
    raise exception 'Only active administrators can moderate rider feedback.';
  end if;
  if p_decision is null or p_decision not in ('approved','private','pending') then raise exception 'Invalid review decision.'; end if;
  select * into v_rating from public.delivery_ratings where id=p_rating_id for update;
  if not found then raise exception 'Feedback not found.'; end if;
  if p_decision='approved' and (not v_rating.allow_public or v_rating.rating<4 or v_quote is null or char_length(v_quote)>500
    or nullif(btrim(v_rating.comment),'') is null) then
    raise exception 'Public testimonials require customer consent, 4-5 stars and a reviewed comment.';
  end if;
  update public.delivery_ratings set review_status=p_decision,
    public_quote=case when p_decision='approved' then v_quote else null end,
    reviewed_by=(select auth.uid()),reviewed_at=now() where id=p_rating_id;
end $$;

-- No raw names, customer/rider/order IDs, contacts or private comments returned.
create function public.get_public_rider_testimonials()
returns table(id uuid,customer_initials text,rating integer,quote text)
language sql stable security definer set search_path='' as $$
  select r.id,
    coalesce((select string_agg(upper(left(part,1))||'.','' order by position)
      from unnest(regexp_split_to_array(btrim(regexp_replace(coalesce(p.full_name,''),'[^[:alpha:] ]','','g')),'\s+'))
        with ordinality as names(part,position) where part<>'' and position<=3),'Customer'),
    r.rating,r.public_quote
  from public.delivery_ratings r join public.profiles p on p.id=r.customer_id
  where r.review_status='approved' and r.allow_public and r.rating>=4
    and r.public_quote is not null and p.deleted_at is null
  order by r.reviewed_at desc,r.id limit 12;
$$;

revoke all on function public.submit_delivery_rating_with_consent(uuid,integer,text,boolean) from public,anon;
revoke all on function public.get_admin_rider_feedback() from public,anon;
revoke all on function public.moderate_rider_feedback(uuid,text,text) from public,anon;
revoke all on function public.get_public_rider_testimonials() from public;
grant execute on function public.submit_delivery_rating_with_consent(uuid,integer,text,boolean) to authenticated;
grant execute on function public.get_admin_rider_feedback() to authenticated;
grant execute on function public.moderate_rider_feedback(uuid,text,text) to authenticated;
grant execute on function public.get_public_rider_testimonials() to anon,authenticated;
