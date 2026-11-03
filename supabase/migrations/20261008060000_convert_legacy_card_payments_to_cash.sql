-- Card is no longer offered. Convert the existing demo records to Cash (cod),
-- retaining each payment's order, amount, status, and verification details.
with converted as (
  update public.payments set method = 'cod'
  where method = 'card'
  returning id
)
insert into public.activity_logs(actor_id, action, record_type, record_id)
select null, 'payment_method:card_to_cash', 'payments', id from converted;
