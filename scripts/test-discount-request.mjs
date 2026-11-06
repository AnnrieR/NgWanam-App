import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import * as icons from "lucide-react";

function load(file, mocks, hooks = React) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", "require", output)(loaded, loaded.exports, name => {
    if (name === "react") return hooks;
    if (name === "react/jsx-runtime") return jsx;
    assert(Object.hasOwn(mocks, name), `Unexpected import ${name}`); return mocks[name];
  });
  return loaded.exports;
}
const discount = load("src/lib/discount-request.ts", {});
assert.equal(discount.withDiscountRequest("Keep my notes", "none"), "Keep my notes");
for (const type of ["pwd", "senior"]) {
  const note = discount.withDiscountRequest("Keep my notes", type);
  assert(note.endsWith("Keep my notes"));
  assert(note.includes(discount.discountIdReminder) && note.includes(discount.discountReviewNotice));
  assert.equal(discount.discountRequestFromNote(note), type);
}
assert.equal(discount.discountRequestFromNote(null), null);
assert.equal(discount.discountRequestFromNote("Ordinary old order notes"), null);
let rpcCalls = [];
const actions = load("src/app/(protected)/checkout/actions.ts", {
  "next/navigation": { redirect: url => { throw Error(`redirect:${url}`); } },
  "@/lib/auth": { requireRole: async roles => assert.deepEqual(roles, ["customer"]) },
  "@/lib/discount-request": discount,
  "@/lib/supabase/server": { createClient: async () => ({ rpc: async (name, args) => { assert.equal(name, "place_order"); rpcCalls.push(args); return { data: "order-id", error: null }; } }) },
});
function form(patch = {}) {
  const result = new FormData();
  for (const [key, value] of Object.entries({ contactName: "Test Customer", contactPhone: "09123456789", deliveryAddress: "Test address", orderType: "delivery", paymentMethod: "cod", deliveryAreaId: "10000000-0000-0000-0000-000000000001", expectedDeliveryFee: "50", cart: JSON.stringify([{ variant_id: "variant-1", quantity: 2 }]), noteToStaff: "No onions", noteToDriver: "Call on arrival", ...patch })) result.set(key, value);
  return result;
}
for (const orderType of ["delivery", "pickup"]) {
  for (const paymentMethod of ["cod", "gcash"]) {
    const common = { orderType, paymentMethod, gcashSenderName: "Sender", gcashNumber: "09123456789", gcashReferenceNumber: "test-reference" };
    await assert.rejects(actions.placeOrder({}, form(common)), /redirect:\/orders\/order-id/);
    const baseline = rpcCalls.at(-1);
    for (const type of ["pwd", "senior", "none"]) {
      await assert.rejects(actions.placeOrder({}, form({ ...common, discountRequest: type, discountIdAcknowledged: "on", discountAmount: "99999", total: "1" })), /redirect:\/orders\/order-id/);
      const payload = rpcCalls.at(-1);
      assert.deepEqual({ ...payload, p_note_to_staff: baseline.p_note_to_staff, p_note_to_driver: baseline.p_note_to_driver }, baseline, "Only existing notes may change; all pricing/payment/cart/RPC args must remain identical");
      if (type !== "none") assert.equal(discount.discountRequestFromNote(payload.p_note_to_staff), type);
      if (orderType === "delivery" && type !== "none") assert.equal(discount.discountRequestFromNote(payload.p_note_to_driver), type);
      if (orderType === "pickup") assert.equal(payload.p_note_to_driver, baseline.p_note_to_driver);
    }
  }
}
rpcCalls = [];
for (const patch of [{ discountRequest: "pwd" }, { discountRequest: "senior", discountIdAcknowledged: "no" }, { discountRequest: "approved" }]) assert((await actions.placeOrder({}, form(patch))).error);
assert.equal(rpcCalls.length, 0);

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
const noop = () => null;
const state = [];
let cursor = 0;
const hooks = { ...React, useState: initial => {
  const index = cursor++;
  if (!(index in state)) state[index] = initial;
  return [state[index], value => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
}, useActionState: () => [{}, noop, false] };
const checkout = load("src/app/(protected)/checkout/checkout-form.tsx", {
  "@/components/ui/form": { Form: noop }, "@/components/ui/label": { Label: noop }, "@/components/ui/form-input": { Input: noop },
  "@/components/ui/textarea": { Textarea: noop }, "@/components/ui/disclosure": { Disclosure: noop, DisclosureSummary: noop },
  "next/link": { default: noop }, "lucide-react": icons, "@/components/ui/radio-group": { RadioGroup: noop, RadioGroupItem: noop },
  "@/components/ui/button": { Button: noop }, "@/components/menu-image": { MenuImage: noop },
  "@/components/customer-chat-card": { CustomerChatCard: noop }, "@/components/customer-service-strip": { CustomerServiceStrip: noop },
  "@/hooks/use-cart": { useCart: () => ({ isHydrated: true, cart: [{ variant_id: "variant-1", item_name: "Test dish", price: 99, quantity: 2 }] }) },
  "./actions": { placeOrder: noop }, "@/components/delivery-area-picker": { DeliveryAreaPicker: noop },
  "@/lib/gcash-settings": { gcashIsAvailable: () => true }, "@/components/gcash-qr-image": { GcashQrImage: noop }, "@/lib/discount-request": discount,
}, hooks);
const render = () => { cursor = 0; return nodes(checkout.CheckoutForm({ deliveryAreas: [{ id: "area-1", name: "Area", fee: 50 }], areasFailed: false, gcashQrPath: null, catalog: [{ variant_id: "variant-1", price: 120, available_stock: 10 }] })); };
const byName = (tree, name) => tree.find(node => node.props?.name === name);
let tree = render();
assert(!byName(tree, "discountIdAcknowledged"));
assert.equal(byName(tree, "discountRequest").props.value, "none");
assert(tree.some(node => node.type === icons.PhilippinePeso), "COD must render the Philippine peso icon");
tree.find(node => node.props?.areas).props.onChange("area-1");
for (const orderType of ["delivery", "pickup"]) {
  tree = render(); byName(tree, "orderType").props.onValueChange(orderType);
  for (const type of ["none", "pwd", "senior"]) {
    tree = render(); byName(tree, "discountRequest").props.onValueChange(type); tree = render();
    const total = tree.find(node => Object.hasOwn(node.props ?? {}, "data-checkout-total"));
    const expected = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(orderType === "delivery" ? 290 : 240);
    assert.equal(total.props.children, expected, "Discount request must not affect catalog prices, subtotal, delivery fee or total");
    if (type !== "none") assert(byName(tree, "discountIdAcknowledged").props.required && tree.some(node => node.props?.role === "status"));
  }
}
const notice = load("src/components/discount-request-notice.tsx", { "lucide-react": icons, "@/lib/discount-request": discount });
assert.equal(notice.DiscountRequestNotice({ staffNote: "Legacy note", driverNote: null }), null);
for (const type of ["pwd", "senior"]) {
  const banner = notice.DiscountRequestNotice({ staffNote: discount.withDiscountRequest("", type) });
  assert.equal(banner.props.role, "status");
  assert(JSON.stringify(banner).includes("ID owner must be present"));
}
for (const file of ["src/app/(protected)/orders/[orderId]/page.tsx", "src/app/(protected)/orders/[orderId]/customer-order-tracking.tsx"]) assert(fs.readFileSync(file, "utf8").includes("<DiscountRequestNotice"));
console.log("PASS discount-review requests: None/PWD/Senior options, ID presence notice/acknowledgment, customer/staff/rider banners, original notes retained, invalid/unacknowledged requests blocked, legacy forms preserved, COD peso icon, delivery/pick-up and COD/GCash payloads unchanged except notes, online totals unchanged. Mocked UI/RPC only; no real orders/payments.");
