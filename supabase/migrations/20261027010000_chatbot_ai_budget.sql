-- Durable request ceilings, not billing promises. No orders, inventory, payments,
-- account records or old chat logs are modified by this migration.
create table private.chatbot_ai_usage (
  scope text not null,
  usage_day date not null,
  day_attempts integer not null default 0 check(day_attempts >= 0),
  minute_start timestamptz not null,
  minute_attempts integer not null default 0 check(minute_attempts >= 0),
  primary key (scope, usage_day)
);
alter table private.chatbot_ai_usage enable row level security;
revoke all on private.chatbot_ai_usage from public, anon, authenticated, service_role;

create function public.consume_chatbot_ai_budget(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_day date := (v_now at time zone 'UTC')::date;
  v_minute timestamptz := date_trunc('minute', v_now);
  v_global private.chatbot_ai_usage%rowtype;
  v_user private.chatbot_ai_usage%rowtype;
begin
  if not exists(select 1 from public.profiles where id = p_user_id and is_active) then return false; end if;
  -- One shared transaction lock prevents concurrent requests across processes
  -- from racing either the global or per-account ceiling.
  perform pg_catalog.pg_advisory_xact_lock(2701002026::bigint);
  delete from private.chatbot_ai_usage where usage_day < v_day - 7;
  insert into private.chatbot_ai_usage(scope,usage_day,minute_start)
    values ('global',v_day,v_minute),('user:' || p_user_id::text,v_day,v_minute)
    on conflict do nothing;
  update private.chatbot_ai_usage set minute_start=v_minute,minute_attempts=0
    where usage_day=v_day and scope in ('global','user:' || p_user_id::text) and minute_start<>v_minute;
  select * into v_global from private.chatbot_ai_usage where scope='global' and usage_day=v_day;
  select * into v_user from private.chatbot_ai_usage where scope='user:' || p_user_id::text and usage_day=v_day;
  if v_global.day_attempts>=100 or v_global.minute_attempts>=5
    or v_user.day_attempts>=25 or v_user.minute_attempts>=3 then return false; end if;
  update private.chatbot_ai_usage set day_attempts=day_attempts+1,minute_attempts=minute_attempts+1
    where usage_day=v_day and scope in ('global','user:' || p_user_id::text);
  return true;
end $$;
-- Browsers cannot drain/reset the shared budget or choose another user.
revoke all on function public.consume_chatbot_ai_budget(uuid) from public, anon, authenticated;
grant execute on function public.consume_chatbot_ai_budget(uuid) to service_role;
