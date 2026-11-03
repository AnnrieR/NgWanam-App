-- Keep the legacy enum value for migration compatibility, but never allow
-- a new Card payment to be recorded (including direct RPC calls).
alter table public.payments add constraint supported_payment_methods
  check (method in ('cod','gcash'));

do $$
declare definition text; changed text;
begin
  definition:=pg_get_functiondef('public.place_order(jsonb,text,text,text,text,text,timestamptz,public.payment_method,text,text,text,text)'::regprocedure);
  changed:=replace(definition,
    'v_order_type := coalesce(p_order_type, ''delivery'');',
    'if p_payment_method is null or p_payment_method not in (''cod'',''gcash'') then raise exception ''Choose COD or manual GCash.''; end if; v_order_type := coalesce(p_order_type, ''delivery'');');
  if changed=definition then raise exception 'Payment guard anchor missing.'; end if;
  execute changed;
end $$;

-- Update only the stock FAQ response; preserve any administrator customization.
update public.chatbot_rules
set response='Ng Wanam accepts COD (Cash on Delivery) and manual GCash. For pick-up orders, pay when collecting. GCash details are shown at checkout.',
  keywords=array_append(keywords,'cod')
where response='Ng Wanam accepts cash on delivery and GCash. GCash details are shown when configured by the restaurant.';
