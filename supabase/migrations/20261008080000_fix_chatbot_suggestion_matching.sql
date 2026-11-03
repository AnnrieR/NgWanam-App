-- Make the built-in payment suggestion more specific than the generic "order"
-- keyword, without replacing administrator-edited responses.
update public.chatbot_rules set keywords=array_append(keywords,'pay for')
where intent='payment' and not ('pay for'=any(keywords));

insert into public.chatbot_rules(intent,keywords,response)
values ('menu',array['menu','dishes','food available'],
  'Browse Home for approved dishes, serving sizes, current prices, and available stock. Add available items to your cart to order.')
on conflict(intent) do nothing;

-- The fee answer uses the actual local checkout setting, not a hard-coded fee.
create or replace function public.match_chatbot_rule(p_message text)
returns text language plpgsql security definer set search_path='' as $$
declare v_response text; v_fee numeric;
begin
  if lower(coalesce(p_message,'')) like '%delivery fee%' then
    select delivery_fee into v_fee from public.restaurant_settings where id=true;
    return case when v_fee is null then 'Delivery fee is not configured yet. Pick-up has no delivery fee.'
      else 'The delivery fee is ' || chr(8369) || to_char(v_fee,'FM999999990.00') || '. Pick-up has no delivery fee.' end;
  end if;
  select r.response into v_response from public.chatbot_rules r
  cross join lateral unnest(r.keywords) as k(keyword)
  where r.is_active and length(trim(k.keyword))>0
    and position(lower(k.keyword) in lower(coalesce(p_message,'')))>0
  order by length(k.keyword) desc,r.intent
  limit 1;
  return coalesce(v_response,'I can help with the menu, delivery, operating hours, payment, or how to order.');
end $$;
