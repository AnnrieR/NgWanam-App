# Buong local testing guide — Ng Wanam

## 1. Start locally (existing project)

1. Open Docker Desktop; wait until running.
2. Open PowerShell:

   ```powershell
   cd "D:\Web Projects\ngwanam"
   npx supabase start
   npx supabase status
   ```

3. Keep the existing `.env.local`. Check that its local URL and publishable key match Supabase status. Admin account creation also needs the **local** `SUPABASE_SERVICE_ROLE_KEY`, server-only; never share or commit it.
4. If the app is already running at port 3000, use it. Otherwise:

   ```powershell
   npm run dev
   ```

5. Open http://localhost:3000. Studio is http://127.0.0.1:55323.

**Do not run `supabase db reset` on this working database:** it deletes orders, accounts, and other local data. For a genuinely new installation only: install dependencies with `npm ci`, copy `.env.example` to `.env.local` if missing, start Supabase, configure its keys, then run `npx supabase db reset` before starting the app. Never overwrite an existing `.env.local` just to test.

## 2. Prepare separate sessions

Use separate browser profiles/browsers, not four tabs in the same profile. Tabs share login cookies; most incognito windows also share one incognito session.

| Session | Email | Password | Expected destination |
| --- | --- | --- | --- |
| Customer | customer@ngwanam.local | NgWanam123! | /home |
| Staff | kitchen1@ngwanam.local | NgWanam123! | /staff |
| Rider | rider@ngwanam.local | NgWanam123! | /delivery/orders |
| Admin | admin@ngwanam.local | NgWanam123! | /admin |

Keep a small JPG/PNG/WebP strictly under 1 MB for delivery proof. Record every new test order number and use a contact/note such as `LOCAL TEST COD`. Do not alter unrelated seed/user orders.

## 3. Public pages, login, registration, profile

1. Logged out: open the landing page, navigation, menu previews, and chatbot; test desktop and narrow/mobile width.
2. Open `/checkout`, `/admin`, `/staff`, `/delivery/orders` while logged out: expect redirect to login.
3. Try a wrong password: expect an error without login.
4. Register a unique customer email with matching passwords: local registration should open Home without confirmation email/OTP. Try mismatched passwords too.
5. Log in using each seeded account: confirm the destinations above.
6. Open Profile; save a temporary name/contact/address change, refresh, and confirm persistence. Restore the original values afterward. If testing avatar upload, use your own test image.
7. Switch dark/light mode and navigate: preference should persist.
8. Click Log out → Cancel: stay signed in. Repeat → confirm: return to logged-out state; protected routes should require login.

## 4. Customer shopping + COD delivery order

1. Customer → Home: test search, categories, item/variant selection, prices, and available-stock indication.
2. Choose an approved, available item. In Staff/Admin Inventory, record its **on-hand (H)** and **reserved (R)** values.
3. Add quantity **2** to cart. Change quantity, remove/re-add, navigate away and back, and refresh: cart and badge should stay consistent.
4. Checkout → Delivery. Fill name, phone, complete address, and optional notes.
5. Payment choices must be **COD (Cash on Delivery)** and **Manual GCash** only — no Card.
6. Confirm item total + configured delivery fee. Submit once; record the resulting order number.
7. Expect Pending status, own-order tracking, and cleared cart.
8. Inventory must become **H unchanged, R + 2**. Available stock is **H − R**, not on-hand alone.

## 5. Staff → rider → staff completion

1. Staff → Orders: search for the new order; open details.
2. Move it through the available controls: **Pending → Confirmed → Preparing → Ready**. Customer tracking should update after refresh/within the 15-second refresh cycle.
3. Staff → Delivery: locate the Ready delivery order and assign the rider.
4. Rider → Assigned: expect assignment badge and highlighted row. If not immediate, wait 15 seconds or refresh.
5. Rider clicks **Start delivery**: expect Out for Delivery, not Completed.
6. Try Delivered without a photo: submission must be blocked.
7. Upload JPG/PNG/WebP strictly under 1 MB and submit Delivered. Expect Delivered history and a proof-photo link in authorized order details.
8. Customer tracking should say delivered/awaiting restaurant completion. Inventory is now **H − 2, R back to original**; the rider's Delivered confirmation deducted stock once.
9. Staff opens that order and clicks **Complete Order**.
10. Expect Completed with real completion time. Inventory stays **H − 2, R back to original**; Staff Completed must not deduct again. Repeat/refresh must not deduct twice.
11. Staff/Admin → completed Order Details: use **Record cash collected** for COD. Payments monitoring is GCash-only. Amount must match the order; status becomes Paid.
12. Check Admin dashboard, Orders, Reports, and Activity Logs for the resulting workflow records.

## 6. Manual GCash order

1. Make another small Customer delivery order; select Manual GCash.
2. Leave sender/number/reference blank: expect required-field validation.
3. Enter clearly labeled demo details, not a real transfer. Submit and record the order number.
4. Staff/Admin → Payments: check the entered details and manually **Verify GCash**.
5. Process delivery/completion as in section 5. Mark paid after completion and verification.
6. On a separate disposable test order, test Reject if needed. Do not reject someone else's payment.

**There is no automatic GCash gateway or processing gate.** Staff manually reviews payment; an unverified GCash order is not automatically prevented from proceeding.

## 7. Pick-up order

1. Create a small order → Checkout → Pick-up.
2. Expect restaurant location/hours, no delivery-address field, **zero delivery fee**, and `COD · Pay on Pick-up` (or Manual GCash).
3. Staff processes through Ready for Pick-up.
4. Verify no rider assignment/delivery workflow is available for this order.
5. After simulated collection, staff completes it. Stock deduction occurs once at Completed. Record payment normally.

## 8. Cancellation + stock protection

1. Create a separate Pending order; record H/R before and after placement.
2. Customer cancels using the available cancellation control.
3. Expect Cancelled history; reservation is released, **H unchanged**.
4. To test the cancelled-rider guard, use another clearly marked disposable delivery order: staff makes it Ready, assigns a rider, then staff cancels it.
5. Rider should see cancelled history and no Start/Delivered action for it. Refresh any stale rider page; an attempted stale action must fail server-side.
6. Try to order more than available stock: expect blocked checkout, no new order, no negative stock. Try an unavailable/unapproved item through the UI: it must not be purchasable.

## 9. Menu CRUD + approvals + inventory

1. Staff/Admin → Menu Management (`/menu`): test search and modal forms.
2. Create a clearly named temporary item/variant; enter valid price/serving data and upload one image. Test invalid inputs too.
3. Staff-created submission: use **Review menu submissions** from Menu Management; admin reviews it there. There must be no separate Approvals sidebar tab.
4. Confirm approved/active items appear on Customer Home; rejected/unapproved/inactive items must not be orderable.
5. Edit the test item's name/price/image, save, refresh, and confirm persistence.
6. Inventory: test available-stock calculation, authorized replenishment/adjustment controls, and movement history on the temporary item. Low-stock status must use **on-hand minus reserved**.
7. With a test order reserving that item, attempt menu deletion: expect a guard. Cancel/resolve the order before removing the temporary item.
8. Historical order names/prices should remain intact after an allowed menu deletion.

## 10. Admin modules and account controls

1. Dashboard: change Philippine date, search, status filter, and pagination. Counts/rows should match the selected date; completion counts use completion time.
2. Orders: verify Ready, Out for Delivery, Delivered/Awaiting completion, Completed, and Cancelled are separate.
3. Delivery Monitoring: search/filter assignments; only riders update actual delivery progress.
4. User Management: create one test staff, rider, and admin using unique emails/manual passwords. Log into each in a separate session; verify role destination and access.
5. Test role/access changes only on those disposable accounts; disabled accounts must not retain operational access. Keep the seeded admin active.
6. FAQ: create/edit/deactivate a temporary rule, ask a matching question, and confirm its behavior. Restore/remove your test rule afterward.
7. Reports/Activity Logs: verify figures/logs reflect your known test orders. Old seed completions lacking actual completion dates must not be invented as completed today.
8. Confirm customer cannot access `/menu` or `/admin`; staff cannot manage `/admin/users`; rider cannot enter `/staff`. Expect safe redirects/access denial.

## 11. Chatbot, tracking, persistence

1. Ask Menu, Delivery fee, Operating hours, Payment, and Delivery area suggestions. Payment should say COD/manual GCash; fee should match checkout settings.
2. Ask Track my order: expect the account's own order/status and live-tracking link, never another customer's order.
3. Watch the three-dot typing indicator; refresh/navigate away and return: same-browser account chat history remains.
4. Sign into a different account: its chat history must be separate. Tracking cards are snapshots; open live tracking for current status.

## 12. Final checks + known scope

Run in another PowerShell window:

```powershell
cd "D:\Web Projects\ngwanam"
npm run lint
npx tsc --noEmit
```

For production-build testing, stop the dev server first (`Ctrl+C`), run `npm run build`, then `npm run start`. Do not build against the same `.next` directory while dev is running. Restore dev mode afterward if preferred.

Optional read-only Studio SQL:

```sql
select count(*) as card_payments from public.payments where method='card';
select count(*) as reservation_mismatches
from public.inventory i
where i.reserved_stock <> coalesce((
  select sum(oi.quantity) from public.order_items oi
  join public.orders o on o.id=oi.order_id
  where oi.menu_variant_id=i.menu_variant_id
    and o.status in ('pending','confirmed','preparing','ready') and o.stock_deducted_at is null
),0);
select count(*) as invalid_inventory from public.inventory
where reserved_stock<0 or reserved_stock>current_stock;
```

All three counts should be **0**. Keep completed test orders as clearly labeled local demo history; do not directly delete movements or undo real stock deductions. Cancel unfinished test orders to release reservations.

### Verification scope (8 October 2026)

- Passed: lint, TypeScript, isolated optimized production build.
- Passed: 27 authenticated route responses plus anonymous/wrong-role redirects.
- Passed: browser COD/GCash checkout, pick-up switch, GCash required fields, tracking COD label, chatbot answer/history, dashboard controls, approval access, and operational account creation/login.
- Previously browser-tested in this session: rider assignment badge/highlight → proof upload → Delivered → staff Completed; authorized proof URL.
- Passed: rollback-only SQL ordering/approval/cancellation/proof/inventory guards and no GCash gate; direct Card RPC denied.
- Passed: Reports daily order count and completed-today sales match database queries; future-dated seed rows are excluded from today's figures.
- Passed: seed execution in an isolated database with current schema/reference configuration; no Card records or reservation mismatches. The existing database was not reset. This is not a full clean migration-replay test.
- Menu CRUD, FAQ saves, profile/logout, and staff assignment have earlier browser coverage; not every combination or button was re-exercised in this latest pass. Use the manual checklist above for final demo rehearsal.
- Historical seed deliveries can lack real proof photos; historical completions can lack recorded completion time. New Delivered actions require proof. Missing history is not fabricated.
- Email password recovery pages are not part of this no-email local demo verification. Use known demo passwords/manual admin-created accounts; no claim that external recovery works.
- No OAuth, external notifications, online payment gateway, LLM chatbot, automatic GCash gate, or Backup/Recovery is required or verified.

No blocking defect was found in the tested local core flows; this is not a guarantee that every possible edge case has been tested.
