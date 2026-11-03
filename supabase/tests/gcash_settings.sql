-- Rollback-only payment settings fixtures. Never changes real payment history.
begin;
create temporary table gcash_history_snapshot as
select 'orders' name,md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) hash from public.orders t
union all select 'payments',md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.payments t
union all select 'contacts',md5((select phone_numbers::text from public.restaurant_settings where id=true));
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.update_gcash_settings('Rollback GCash recipient','09123456789',true,(select updated_at from public.restaurant_settings where id=true));
do $$ begin
  if not exists(select 1 from public.get_checkout_settings() where gcash_enabled and gcash_account_name='Rollback GCash recipient' and gcash_account_number='09123456789') then raise exception 'Recipient not returned'; end if;
  begin
    perform public.update_gcash_settings('Bad recipient','123',true,(select updated_at from public.restaurant_settings where id=true));
    raise exception 'Bad number accepted';
  exception when check_violation then null; end;
  begin
    perform public.update_gcash_settings(null,null,true,(select updated_at from public.restaurant_settings where id=true));
    raise exception 'Empty enabled config accepted';
  exception when check_violation then null; end;
  begin
    perform public.update_gcash_settings('Stale edit','09123456789',true,'2000-01-01');
    raise exception 'Stale edit accepted';
  exception when raise_exception then if sqlerrm <> 'settings-changed' then raise; end if; end;
  begin
    perform public.update_gcash_settings('QR forgery','09123456789',true,(select updated_at from public.restaurant_settings where id=true),'https://untrusted.invalid/qr.png');
    raise exception 'External QR accepted';
  exception when raise_exception then if sqlerrm <> 'invalid-qr-selection' then raise; end if; end;
  begin
    perform public.update_ordering_settings(0,'forged-qr.png');
    raise exception 'Legacy QR bypass accepted';
  exception when raise_exception then if sqlerrm not like 'Use Admin Settings%' then raise; end if; end;
end $$;
-- Every non-admin role is denied both the new and old mutation RPCs.
do $$ declare account text; begin
  foreach account in array array['10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000005'] loop
    perform set_config('request.jwt.claim.sub',account,true);
    begin
      perform public.update_gcash_settings('Unauthorized','09123456789',true,now());
      raise exception 'Non-admin save accepted';
    exception when insufficient_privilege then null; end;
    begin
      perform public.update_ordering_settings(0,null);
      raise exception 'Non-admin legacy write accepted';
    exception when insufficient_privilege then null; end;
    begin
      update public.restaurant_settings set gcash_account_number='09999999999' where id=true;
      raise exception 'Direct table update accepted';
    exception when insufficient_privilege then null; end;
    begin
      insert into storage.objects(bucket_id,name) values('gcash-qr',account||'/11111111-1111-4111-8111-111111111111.png');
      raise exception 'Non-admin storage upload accepted';
    exception when insufficient_privilege then null; end;
  end loop;
end $$;
reset role;
savepoint inactive_admin;
select set_config('request.jwt.claim.sub','',true);
update public.profiles set is_active=false where id='10000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
  begin perform public.update_gcash_settings('Inactive','09123456789',true,now()); raise exception 'Inactive admin accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback to inactive_admin;
set local role anon;
do $$ begin
  begin perform public.get_checkout_settings(); raise exception 'Guest read accepted'; exception when insufficient_privilege then null; end;
  begin perform public.update_gcash_settings('Guest','09123456789',true,now()); raise exception 'Guest write accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Disabled GCash is rejected before any order/reservation/payment insertion.
update public.restaurant_settings set gcash_enabled=false where id=true;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
do $$ begin
  begin
    perform public.place_order('[]','Test','09000000000','',null,null,null,'gcash','Sender','09123456789','TEST','pickup',null,null);
    raise exception 'Disabled GCash order accepted';
  exception when raise_exception then if sqlerrm not like 'GCash is not configured%' then raise; end if; end;
end $$;
reset role;
do $$ begin
  if not exists(select 1 from storage.buckets where id='gcash-qr' and file_size_limit=1048575 and allowed_mime_types=array['image/png','image/jpeg','image/webp']) then raise exception 'QR storage limits missing'; end if;
  if not exists(select 1 from public.activity_logs where action='gcash_settings_updated' and actor_id='10000000-0000-0000-0000-000000000001') then raise exception 'Audit missing'; end if;
  if (select hash from gcash_history_snapshot where name='orders') is distinct from (select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.orders t) then raise exception 'Orders changed'; end if;
  if (select hash from gcash_history_snapshot where name='payments') is distinct from (select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.payments t) then raise exception 'Payments changed'; end if;
  if (select hash from gcash_history_snapshot where name='contacts') is distinct from (select md5(phone_numbers::text) from public.restaurant_settings where id=true) then raise exception 'Contacts changed'; end if;
end $$;
rollback;
