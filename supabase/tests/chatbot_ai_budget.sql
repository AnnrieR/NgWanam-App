-- Rollback only. Never sends a provider request or changes operational records.
begin;
do $$
declare
  v_user uuid := '10000000-0000-0000-0000-000000000005';
  v_day date := (clock_timestamp() at time zone 'UTC')::date;
  v_before integer;
begin
  if has_function_privilege('anon','public.consume_chatbot_ai_budget(uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.consume_chatbot_ai_budget(uuid)','EXECUTE') then
    raise exception 'Browser roles must not invoke AI budget RPC';
  end if;
  if not has_function_privilege('service_role','public.consume_chatbot_ai_budget(uuid)','EXECUTE') then
    raise exception 'Server budget permission missing';
  end if;
  if has_table_privilege('anon','private.chatbot_ai_usage','SELECT')
    or has_table_privilege('authenticated','private.chatbot_ai_usage','SELECT')
    or has_table_privilege('authenticated','private.chatbot_ai_usage','UPDATE')
    or has_table_privilege('service_role','private.chatbot_ai_usage','UPDATE') then
    raise exception 'Private budget table exposed';
  end if;
  if not exists(select 1 from public.profiles where id=v_user and is_active) then
    raise exception 'Local active test customer is required';
  end if;
  delete from private.chatbot_ai_usage where usage_day=v_day;
  if not public.consume_chatbot_ai_budget(v_user) or not public.consume_chatbot_ai_budget(v_user)
    or not public.consume_chatbot_ai_budget(v_user) then raise exception 'First 3 attempts should pass'; end if;
  if public.consume_chatbot_ai_budget(v_user) then raise exception 'Per-user minute limit bypassed'; end if;
  if (select day_attempts from private.chatbot_ai_usage where scope='global' and usage_day=v_day)<>3
    then raise exception 'Denied attempt consumed budget'; end if;
  update private.chatbot_ai_usage set minute_start=minute_start-interval '2 minutes';
  update private.chatbot_ai_usage set day_attempts=24 where scope='user:'||v_user::text and usage_day=v_day;
  if not public.consume_chatbot_ai_budget(v_user) then raise exception '25th daily attempt should pass'; end if;
  if public.consume_chatbot_ai_budget(v_user) then raise exception 'Per-user daily limit bypassed'; end if;
  update private.chatbot_ai_usage set day_attempts=0,minute_attempts=0;
  update private.chatbot_ai_usage set minute_attempts=5 where scope='global' and usage_day=v_day;
  if public.consume_chatbot_ai_budget(v_user) then raise exception 'Global minute limit bypassed'; end if;
  update private.chatbot_ai_usage set minute_attempts=0,day_attempts=100 where scope='global' and usage_day=v_day;
  if public.consume_chatbot_ai_budget(v_user) then raise exception 'Global daily limit bypassed'; end if;
  select count(*) into v_before from private.chatbot_ai_usage;
  if public.consume_chatbot_ai_budget('ffffffff-ffff-ffff-ffff-ffffffffffff') then raise exception 'Unknown account allowed'; end if;
  if (select count(*) from private.chatbot_ai_usage)<>v_before then raise exception 'Unknown account created budget rows'; end if;
end $$;
-- Real service-role execution is permitted (daily ceiling currently denies).
set local role service_role;
select public.consume_chatbot_ai_budget('10000000-0000-0000-0000-000000000005');
reset role;
rollback;
