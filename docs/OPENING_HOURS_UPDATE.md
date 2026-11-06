# Daily opening hours: 7:30 AM–7:00 PM

Hours displayed by the footer, landing offers, checkout pickup information, order
support and chatbot restaurant context come from `restaurant_settings`, not a
hardcoded frontend value. A web redeploy alone will not change that saved value.

Apply **only** `supabase/migrations/20261106010000_update_restaurant_opening_hours.sql`
to the existing production database using the normal administrator SQL connection.
Do not reset/reseed or blindly apply migration history: other migrations were
already installed manually. This script is safe to repeat for the requested hours.

It updates only the singleton restaurant's operating hours and the unmodified
original hours FAQ. It preserves customized FAQ text, contact information,
payment settings, users, menu, inventory, orders and payments. If the hours FAQ
was customized, review its text under Admin → Chatbot FAQ separately.

Verify privately after running:

```sql
select operating_hours from public.restaurant_settings where id = true;
select intent, response from public.chatbot_rules where intent = 'hours';
```

Expected hours: `Daily, 7:30 AM - 7:00 PM`. Refresh/reopen the public site and
checkout to fetch the saved value. No opening-time restriction, order scheduling
logic, sales collection or financial computation is added or changed.

The separate web change removes the **Completed sales today** report card and
its monetary query/calculation. It does not stop recording order/payment amounts
needed for operational processing and receipts, or erase transaction history.
