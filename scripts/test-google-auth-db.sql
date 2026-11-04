do $$
declare
  local_id uuid := gen_random_uuid(); google_id uuid := gen_random_uuid();
  v_count integer;
begin
  insert into auth.users(id,email,email_confirmed_at) values(local_id,'owner@gmail.com',now());
  insert into public.profiles(id) values(local_id);
  insert into auth.identities(user_id,provider,provider_id,identity_data)
    values(local_id,'email',local_id::text,'{}');
  -- Atomic expression index covers Google/SSO rows as well as local accounts.
  begin
    insert into auth.users(id,email) values(gen_random_uuid(),' OWNER@gmail.com ');
    raise exception 'FAIL duplicate email accepted';
  exception when unique_violation then null; end;
  begin
    insert into auth.identities(user_id,provider,provider_id,identity_data)
      values(local_id,'google','owner-sub','{"email":"owner@gmail.com","email_verified":true}');
    raise exception 'FAIL automatic link accepted';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  -- Editable metadata or a confirmed timestamp does not verify Google identity.
  insert into auth.users(id,email,raw_app_meta_data) values(google_id,'new@gmail.com','{"provider":"google"}');
  foreach v_count in array array[1,2,3] loop
    begin
      insert into auth.identities(user_id,provider,provider_id,identity_data)
        values(google_id,'google','new-sub',case v_count when 1 then '{"email":"new@gmail.com","email_verified":false}'::jsonb when 2 then '{"email":"new@gmail.com","email_verified":"true"}'::jsonb else '{"email":"new@gmail.com"}'::jsonb end);
      raise exception 'FAIL unverified identity accepted';
    exception when raise_exception then
      if sqlerrm like 'FAIL%' then raise; end if;
    end;
  end loop;
  insert into auth.identities(user_id,provider,provider_id,identity_data)
    values(google_id,'google','new-sub','{"email":"new@gmail.com","email_verified":true}');
  update auth.identities set identity_data='{"email":"new@gmail.com","email_verified":true}' where user_id=google_id;
  begin
    update auth.identities set identity_data='{"email":"new@gmail.com","email_verified":false}' where user_id=google_id;
    raise exception 'FAIL unverified returning Google login accepted';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  -- Session-only and stale-password approvals fail even if the user is logged in.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',local_id,'amr',jsonb_build_array(jsonb_build_object('method','oauth','timestamp',extract(epoch from now()))))::text,true);
  begin
    perform public.approve_google_link(); raise exception 'FAIL oauth-only approval';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',local_id,'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())-120)))::text,true);
  begin
    perform public.approve_google_link(); raise exception 'FAIL stale password approval';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',local_id,'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()))))::text,true);
  update public.profiles set is_active=false where id=local_id;
  begin
    perform public.approve_google_link(); raise exception 'FAIL inactive account approval';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  update public.profiles set is_active=true where id=local_id;
  update auth.users set email_confirmed_at=null where id=local_id;
  begin
    perform public.approve_google_link(); raise exception 'FAIL unconfirmed account approval';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  update auth.users set email_confirmed_at=now() where id=local_id;
  perform public.approve_google_link();
  begin
    insert into auth.identities(user_id,provider,provider_id,identity_data)
      values(local_id,'google','wrong-sub','{"email":"wrong@gmail.com","email_verified":true}');
    raise exception 'FAIL different email linked';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  update private.google_identity_permissions set expires_at=now()-interval '1 second' where user_id=local_id;
  begin
    insert into auth.identities(user_id,provider,provider_id,identity_data)
      values(local_id,'google','owner-sub','{"email":"owner@gmail.com","email_verified":true}');
    raise exception 'FAIL expired approval accepted';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  perform public.approve_google_link();
  insert into auth.identities(user_id,provider,provider_id,identity_data)
    values(local_id,'google','owner-sub','{"email":"owner@gmail.com","email_verified":true}');
  if exists(select 1 from private.google_identity_permissions where user_id=local_id) then raise exception 'FAIL approval not consumed'; end if;
  begin
    insert into auth.identities(user_id,provider,provider_id,identity_data)
      values(local_id,'google','owner-sub2','{"email":"owner@gmail.com","email_verified":true}');
    raise exception 'FAIL approval reused';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  if has_table_privilege('authenticated','private.google_identity_permissions','INSERT') or
    has_function_privilege('anon','public.approve_google_link()','EXECUTE') then raise exception 'FAIL permission leak'; end if;
  if not public.google_auth_ready() then raise exception 'FAIL readiness'; end if;
end;
$$;
select 'GOOGLE_DB_GUARDS_PASS';
