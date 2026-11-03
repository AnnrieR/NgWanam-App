-- Forward-only: no catalog reseed or historical order changes.
grant insert, update on public.delivery_areas to authenticated;
create policy "admins manage delivery areas" on public.delivery_areas
for all to authenticated using ((select private.is_admin()))
with check ((select private.is_admin()));
-- DELETE remains ungranted. Retire locations by setting is_active=false.
create unique index delivery_areas_normalized_name_key
on public.delivery_areas (lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));

create function private.validate_delivery_area()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.name := regexp_replace(btrim(new.name), '\s+', ' ', 'g');
  if length(new.name) not between 2 and 160 or new.name ~ '[[:cntrl:]]'
     or new.fee < 0 or new.fee > 99999999.99 or new.fee::text = 'NaN' then
    raise exception 'invalid-delivery-area' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_delivery_area before insert or update on public.delivery_areas
for each row execute function private.validate_delivery_area();

create function private.log_delivery_area()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.activity_logs(actor_id, action, record_type, record_id)
  values ((select auth.uid()), case when tg_op='INSERT' then 'delivery_area_created' else 'delivery_area_updated' end, 'delivery_areas', new.id);
  return new;
end;
$$;
create trigger log_delivery_area after insert or update on public.delivery_areas
for each row execute function private.log_delivery_area();
revoke all on function private.validate_delivery_area(), private.log_delivery_area() from public, anon, authenticated;
