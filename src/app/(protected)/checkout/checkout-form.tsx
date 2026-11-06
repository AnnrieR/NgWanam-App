"use client";

import { Form } from "@/components/ui/form";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/form-input";
import { Textarea } from "@/components/ui/textarea";
import { Disclosure, DisclosureSummary } from "@/components/ui/disclosure";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Info, MapPin, PhilippinePeso, Phone, UserRound, Wallet } from "lucide-react";
import { useActionState, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { MenuImage } from "@/components/menu-image";
import { CustomerChatCard } from "@/components/customer-chat-card";
import { CustomerServiceStrip } from "@/components/customer-service-strip";
import { useCart } from "@/hooks/use-cart";
import type { CartProduct } from "@/lib/cart-catalog";
import { placeOrder, type CheckoutState } from "./actions";
import { DeliveryAreaPicker } from "@/components/delivery-area-picker";
import type { DeliveryArea } from "@/lib/delivery-areas";
import { gcashIsAvailable } from "@/lib/gcash-settings";
import { GcashQrImage } from "@/components/gcash-qr-image";
import { discountIdReminder, discountReviewNotice, type DiscountRequest } from "@/lib/discount-request";

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const panel = "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900";
const input = "w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-900";
const label = "grid min-w-0 gap-2 text-xs font-semibold";
const initialState: CheckoutState = {};

export function CheckoutForm({ defaultContactName, defaultContactPhone, defaultAddress, deliveryAreas, areasFailed, gcashQrPath, gcashAccountName, gcashAccountNumber, gcashEnabled = false, pickupAddress, pickupHours, catalog, catalogFailed = false }: {
  defaultContactName?: string | null; defaultContactPhone?: string | null; defaultAddress?: string | null;
  deliveryAreas: DeliveryArea[]; areasFailed: boolean; gcashQrPath: string | null; pickupAddress?: string | null;
  pickupHours?: string | null; gcashAccountName?: string | null; gcashAccountNumber?: string | null; gcashEnabled?: boolean; catalog: CartProduct[]; catalogFailed?: boolean;
}) {
  const { cart, isHydrated } = useCart();
  const [orderType, setOrderType] = useState("delivery");
  const [deliveryAreaId,setDeliveryAreaId] = useState("");
  const selectedArea = deliveryAreas.find(area => area.id===deliveryAreaId);
  const [payment, setPayment] = useState("cod");
  const [note, setNote] = useState("");
  const [discountRequest, setDiscountRequest] = useState<DiscountRequest>("none");
  const [state, formAction, isPending] = useActionState(placeOrder, initialState);
  const products = new Map(catalog.map((product) => [product.variant_id, product]));
  const priceOf = (id: string, fallback: number) => Number(products.get(id)?.price ?? fallback);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + priceOf(item.variant_id, item.price) * item.quantity, 0);
  const fee = orderType === "pickup" ? 0 : areasFailed ? null : selectedArea?.fee ?? null;
  const total = fee === null ? null : subtotal + fee;
  const invalidStock = cart.some((item) => !products.has(item.variant_id) || item.quantity > Number(products.get(item.variant_id)?.available_stock ?? 0));
  const gcashAvailable = gcashIsAvailable({ enabled: gcashEnabled, accountName: gcashAccountName ?? null, accountNumber: gcashAccountNumber ?? null });
  const selectedPayment = payment === "gcash" && !gcashAvailable ? "cod" : payment;

  if (!isHydrated) return <div className="h-80 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" aria-label="Loading checkout" />;
  if (!cart.length) return <div className="py-16"><h1 className="text-3xl font-bold">Your cart is empty</h1><p className="my-4 text-slate-500 dark:text-slate-400">Choose your favorite dishes before checking out.</p><Button render={<Link href="/home" />}>Browse dishes</Button></div>;

  return <div className="mx-auto max-w-[1200px]">
    <header className="mb-5"><h1 className="text-3xl font-bold">Checkout</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review your order and complete your payment.</p></header>
    <Form action={formAction} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <input name="cart" type="hidden" value={JSON.stringify(cart.map(({ variant_id, quantity }) => ({ variant_id, quantity })))} />
      <input name="deliveryAreaId" type="hidden" value={orderType === "delivery" ? deliveryAreaId : ""} />
      <input name="expectedDeliveryFee" type="hidden" value={fee ?? ""} />
      <div className="min-w-0 space-y-4">
        <section className={panel}><h2 className="mb-4 text-base font-bold">{orderType === "pickup" ? "Pick-up Details" : "Delivery Details"}</h2>
          <RadioGroup name="orderType" value={orderType} onValueChange={value => setOrderType(String(value))} className="mb-5 flex flex-wrap gap-4 text-sm">{["delivery", "pickup"].map((type) => <Label key={type} className="flex items-center gap-2"><RadioGroupItem value={type} />{type === "pickup" ? "Pick-up (no delivery fee)" : "Delivery"}</Label>)}</RadioGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            {orderType === "delivery" && <DeliveryAreaPicker areas={deliveryAreas} value={deliveryAreaId} onChange={setDeliveryAreaId} failed={areasFailed} disabled={isPending} />}
            <Label className={label}>Full Name<div className="relative"><UserRound className="absolute left-3 top-3 size-4 text-slate-400" /><Input className={`${input} pl-9`} name="contactName" autoComplete="name" defaultValue={defaultContactName ?? ""} required /></div></Label>
            <Label className={label}>Contact Number<div className="relative"><Phone className="absolute left-3 top-3 size-4 text-slate-400" /><Input className={`${input} pl-9`} name="contactPhone" type="tel" autoComplete="tel" defaultValue={defaultContactPhone ?? ""} required /></div></Label>
            {orderType === "delivery" ? <Label className={`${label} sm:col-span-2`}>Complete Delivery Address<div className="relative"><MapPin className="absolute left-3 top-3 size-4 text-slate-400" /><Input className={`${input} pl-9`} name="deliveryAddress" autoComplete="street-address" defaultValue={defaultAddress ?? ""} required /></div><span className="font-normal text-slate-500 dark:text-slate-400">Enter house/building number, street, barangay and landmark. Your address must belong to the selected area. Area selection is not a map or address-validation service.</span></Label>
              : <div className="rounded-lg bg-orange-50 p-3 text-sm dark:bg-orange-950/30 sm:col-span-2"><p className="font-semibold">Pick up at Ng Wanam Food House</p><p className="mt-1">{pickupAddress}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{pickupHours}</p></div>}
            <Label className={`${label} sm:col-span-2`}>Order Notes (Optional)<Textarea className={`${input} min-h-20 resize-y`} name={orderType === "delivery" ? "noteToDriver" : "noteToStaff"} maxLength={150} value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Please call upon arrival, leave at the gate, etc." /><span className="text-right font-normal text-slate-400">{note.length}/150</span></Label>
          </div>
          <Disclosure className="mt-4 text-xs"><DisclosureSummary className="cursor-pointer font-semibold text-slate-500 dark:text-slate-400">Requested time & kitchen instructions (optional)</DisclosureSummary><div className="mt-3 grid gap-4 sm:grid-cols-2"><Label className={label}>Requested Time<Input name="requiredAt" type="datetime-local" className={input} /><span className="font-normal text-slate-500 dark:text-slate-400">A request, not a guaranteed delivery time.</span></Label>{orderType === "delivery" && <Label className={label}>Note to Kitchen<Textarea name="noteToStaff" className={input} maxLength={150} /></Label>}</div></Disclosure>
        </section>
        <section className={panel} aria-labelledby="discount-request-title">
          <h2 id="discount-request-title" className="mb-2 text-base font-bold">PWD / Senior Citizen discount request</h2>
          <p className="mb-4 text-xs leading-5 text-muted-foreground">Select an option if you would like staff to review your eligibility for a discount. This is a request, not an approved discount.</p>
          <RadioGroup name="discountRequest" value={discountRequest} disabled={isPending} onValueChange={value => setDiscountRequest(value as DiscountRequest)} aria-labelledby="discount-request-title" className="grid gap-3 sm:grid-cols-3">
            {[{ value: "none", text: "No request" }, { value: "pwd", text: "PWD" }, { value: "senior", text: "Senior Citizen" }].map(option => <Label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm"><RadioGroupItem value={option.value} />{option.text}</Label>)}
          </RadioGroup>
          <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs leading-5 text-orange-950 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-100">
            <p className="font-semibold">ID requirement for PWD / Senior Citizen requests</p>
            <p>{discountIdReminder}</p>
            <p className="mt-1">{discountReviewNotice}</p>
          </div>
          {discountRequest !== "none" && <div className="mt-3 space-y-3">
            <p role="status" className="text-xs leading-5 text-muted-foreground">{discountRequest === "pwd" ? "PWD" : "Senior Citizen"} discount review will be included in your order notes for staff. The amount shown remains unchanged.</p>
            <Label className="flex items-start gap-2 text-xs leading-5"><Input type="checkbox" name="discountIdAcknowledged" required disabled={isPending} />I understand that a valid ID must be ready and the ID owner must be present.</Label>
          </div>}
        </section>
        <section className={panel}><h2 className="mb-4 text-base font-bold">Payment Method</h2><RadioGroup name="paymentMethod" value={selectedPayment} onValueChange={value => setPayment(String(value))} className="grid gap-3 sm:grid-cols-2">
          {[{ value: "cod", icon: PhilippinePeso, title: orderType === "pickup" ? "COD · Pay on Pick-up" : "COD (Cash on Delivery)", text: "Pay in cash upon receiving your order." }, { value: "gcash", icon: Wallet, title: "Manual GCash", text: "Send payment via GCash and enter payment details." }].map(({ value, icon: Icon, title, text }) => <Label key={value} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${selectedPayment === value ? "border-red-500" : "border-slate-200 dark:border-slate-700"}`}><RadioGroupItem value={value} disabled={value === "gcash" && !gcashAvailable} /><Icon aria-hidden="true" className="size-6 shrink-0 text-red-500" /><span><span className="block text-xs font-bold">{title}</span><span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{value === "gcash" && !gcashAvailable ? "Not configured / unavailable" : text}</span></span></Label>)}
          </RadioGroup>
          {selectedPayment === "gcash" && <div className="mt-5 overflow-hidden rounded-lg border border-orange-200 dark:border-orange-900"><p className="flex items-center gap-2 bg-orange-50 p-3 text-xs dark:bg-orange-950/30"><Info className="size-4 text-orange-500" />Please enter your GCash payment details manually.</p><div className="space-y-3 p-3"><p className="text-xs" data-gcash-recipient>Send payment to <strong>{gcashAccountName}</strong>: {gcashAccountNumber}</p><p className="text-xs text-muted-foreground">Verify this recipient in GCash before sending money. The fields below are your sender details, not the restaurant&apos;s account.</p>{gcashQrPath && <GcashQrImage key={gcashQrPath} src={gcashQrPath} />}<div className="grid gap-3 sm:grid-cols-3"><Label className={label}>Name of Sender<Input name="gcashSenderName" className={input} required /></Label><Label className={label}>Sender GCash Number<Input name="gcashNumber" className={input} type="tel" required /></Label><Label className={label}>Reference Number<Input name="gcashReferenceNumber" className={input} required /></Label></div><p className="text-xs text-slate-500 dark:text-slate-400">Payment is verified by staff after you place the order.</p></div></div>}
        </section>
        <Link href="/cart" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm dark:border-slate-700"><ArrowLeft className="size-4" />Back to Cart</Link>
      </div>
      <aside className="min-w-0 space-y-4 xl:sticky xl:top-0"><section className={panel}><h2 className="mb-5 text-lg font-bold">Order Summary</h2><div className="space-y-4">{cart.map((item) => <div key={item.variant_id} className="flex items-center gap-2"><div className="w-11 shrink-0"><MenuImage name={item.item_name} src={products.get(item.variant_id)?.image_url} className="aspect-square rounded-lg" /></div><div className="min-w-0 flex-1 text-xs"><p className="font-semibold">{item.item_name}</p><p className="mt-1 text-slate-500 dark:text-slate-400">{money.format(priceOf(item.variant_id, item.price))} × {item.quantity}</p></div><span className="text-xs font-semibold">{money.format(priceOf(item.variant_id, item.price) * item.quantity)}</span></div>)}</div>
        <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-700"><div className="flex justify-between"><span>Subtotal ({count} {count === 1 ? "item" : "items"})</span><span className="font-semibold">{money.format(subtotal)}</span></div><div className="flex justify-between gap-3"><span>{orderType === "pickup" ? "Pick-up Fee" : "Delivery Fee"}</span><span data-checkout-fee>{fee === null ? "Select an area" : money.format(fee)}</span></div>{orderType === "delivery" && selectedArea && <p className="text-xs text-muted-foreground">Selected area: {selectedArea.name}</p>}<div className="flex justify-between border-t border-slate-200 pt-4 font-bold dark:border-slate-700"><span>Total</span><span data-checkout-total className="text-lg text-red-600 dark:text-red-400">{total === null ? "—" : money.format(total)}</span></div></div>
        {(invalidStock || catalogFailed) && <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">Current stock or prices could not be confirmed. Please review your cart.</p>}
        {fee === null && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{areasFailed || !deliveryAreas.length ? "Delivery areas unavailable. Refresh checkout or choose pick-up." : "Select your exact supported area to calculate delivery fee and total."}</p>}
        {state.error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        <Button type="submit" disabled={isPending || fee === null || invalidStock || catalogFailed} className="mt-5 w-full rounded-lg bg-red-600 text-white hover:bg-red-700">{isPending ? "Placing order..." : "Place Order"}<ArrowRight className="size-4" /></Button>
      </section><CustomerChatCard /></aside>
    </Form>
    <CustomerServiceStrip />
  </div>;
}
