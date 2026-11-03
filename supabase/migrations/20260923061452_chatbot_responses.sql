insert into public.chatbot_rules (intent, keywords, response) values
  ('hours', array['hours', 'open', 'closing'], 'Ng Wanam Food House is open daily from 6:30 AM to 7:30 PM.'),
  ('location', array['location', 'address', 'where'], 'Ng Wanam Food House is at 20D Evangelista St., Barangay 23, Batangas City.'),
  ('delivery', array['delivery', 'deliver', 'area'], 'Delivery availability depends on your location. Add your delivery address during checkout to place an order.'),
  ('ordering', array['order', 'checkout', 'how to buy'], 'Open the menu, add available items to your cart, then sign in to complete checkout.'),
  ('payment', array['gcash', 'cash on delivery', 'payment'], 'Ng Wanam accepts cash on delivery and GCash. GCash details are shown when configured by the restaurant.')
on conflict (intent) do nothing;

create or replace function public.match_chatbot_rule(p_message text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_response text;
begin
  select r.response into v_response
  from public.chatbot_rules r
  cross join lateral unnest(r.keywords) as k(keyword)
  where r.is_active and position(lower(k.keyword) in lower(p_message)) > 0
  order by length(k.keyword) desc
  limit 1;
  return coalesce(v_response, 'I can help with the menu, delivery, operating hours, payment, or how to order.');
end;
$$;

grant execute on function public.match_chatbot_rule(text) to anon, authenticated;
revoke execute on function public.match_chatbot_rule(text) from public;
