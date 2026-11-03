-- Dedicated payment recipient; never infer a wallet from restaurant phone numbers.
alter table public.restaurant_settings
  add column gcash_account_name text,
  add column gcash_account_number text,
  add column gcash_enabled boolean not null default false,
  add constraint gcash_recipient_valid check (
    (gcash_account_name is null or (length(btrim(gcash_account_name)) between 2 and 120 and gcash_account_name !~ '[[:cntrl:]]'))
    and (gcash_account_number is null or gcash_account_number ~ '^09[0-9]{9}$')
    and (not gcash_enabled or (gcash_account_name is not null and gcash_account_number is not null))
  );

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('gcash-qr','gcash-qr',true,1048575,array['image/png','image/jpeg','image/webp']);
create policy "admins read payment QR uploads" on storage.objects for select to authenticated
using(bucket_id='gcash-qr' and (select private.is_admin()));
create policy "admins upload payment QR" on storage.objects for insert to authenticated
with check(bucket_id='gcash-qr' and (select private.is_admin()) and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "admins clean unused payment QR" on storage.objects for delete to authenticated
using(bucket_id='gcash-qr' and (select private.is_admin())
  and not exists(select 1 from public.restaurant_settings s where s.gcash_qr_path=storage.objects.name));

create function public.update_gcash_settings(
  p_account_name text, p_account_number text, p_enabled boolean,
  p_expected_updated_at timestamptz, p_qr_path text default null, p_remove_qr boolean default false
) returns void language plpgsql security definer set search_path='' as $$
declare s public.restaurant_settings%rowtype; v_name text:=nullif(btrim(p_account_name),''); v_number text:=nullif(btrim(p_account_number),'');
begin
  if not private.is_admin() then raise exception 'Only active admins can update GCash settings.' using errcode='42501'; end if;
  if p_enabled is null or p_remove_qr is null
    or (v_name is not null and (length(v_name) not between 2 and 120 or v_name ~ '[[:cntrl:]]'))
    or (v_number is not null and v_number !~ '^09[0-9]{9}$')
    or (p_enabled and (v_name is null or v_number is null)) then
    raise exception 'invalid-gcash-recipient' using errcode='23514';
  end if;
  select * into s from public.restaurant_settings where id=true for update;
  if not found then raise exception 'settings-unavailable'; end if;
  if p_expected_updated_at is distinct from s.updated_at then raise exception 'settings-changed'; end if;
  if p_remove_qr and p_qr_path is not null then raise exception 'invalid-qr-selection'; end if;
  if p_qr_path is not null and (
    p_qr_path !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}\.(png|jpeg|webp)$')
    or not exists(select 1 from storage.objects where bucket_id='gcash-qr' and name=p_qr_path)
  ) then raise exception 'invalid-qr-selection'; end if;
  update public.restaurant_settings set gcash_account_name=v_name, gcash_account_number=v_number,
    gcash_enabled=p_enabled, gcash_qr_path=case when p_remove_qr then null when p_qr_path is not null then p_qr_path else s.gcash_qr_path end
  where id=true;
  insert into public.activity_logs(actor_id,action,record_type)
  values(auth.uid(),'gcash_settings_updated','restaurant_settings');
end;
$$;
revoke all on function public.update_gcash_settings(text,text,boolean,timestamptz,text,boolean) from public,anon;
grant execute on function public.update_gcash_settings(text,text,boolean,timestamptz,text,boolean) to authenticated;

-- Close the old staff-accessible QR mutation path. Legacy delivery-fee updates
-- remain admin-only and cannot change payment instructions through this RPC.
create or replace function public.update_ordering_settings(p_delivery_fee numeric,p_gcash_qr_path text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'Only active admins can update ordering settings.' using errcode='42501'; end if;
  if nullif(p_gcash_qr_path,'') is distinct from (select gcash_qr_path from public.restaurant_settings where id=true) then
    raise exception 'Use Admin Settings to change GCash details.';
  end if;
  update public.restaurant_settings set delivery_fee=p_delivery_fee where id=true;
end;
$$;

drop function public.get_checkout_settings();
create function public.get_checkout_settings()
returns table(delivery_fee numeric,gcash_qr_path text,gcash_account_name text,gcash_account_number text,gcash_enabled boolean)
language sql security definer set search_path='' as $$
  select s.delivery_fee,s.gcash_qr_path,s.gcash_account_name,s.gcash_account_number,s.gcash_enabled
  from public.restaurant_settings s where s.id=true
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active);
$$;
revoke all on function public.get_checkout_settings() from public,anon;
grant execute on function public.get_checkout_settings() to authenticated;

-- Fail closed for direct RPC callers too; leave reservation/COD/history logic intact.
do $$
declare definition text; anchor text:='if p_payment_method is null or p_payment_method not in(''cod'',''gcash'') then raise exception ''Choose COD or manual GCash.''; end if;';
begin
  select pg_get_functiondef(oid) into definition from pg_proc
  where pronamespace='public'::regnamespace and proname='place_order';
  if definition is null or position(anchor in definition)=0 then raise exception 'GCash ordering guard anchor missing'; end if;
  execute replace(definition,anchor,anchor || E'\n  if p_payment_method=''gcash'' and not exists(select 1 from public.restaurant_settings where id=true and gcash_enabled and gcash_account_name is not null and gcash_account_number is not null) then raise exception ''GCash is not configured or is temporarily unavailable. Choose COD or refresh checkout.''; end if;');
end $$;
