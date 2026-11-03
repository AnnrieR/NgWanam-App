"use client";
import { ConfirmButton } from "@/components/confirm-button";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Headphones, Minus, Plus, ShieldCheck, ShoppingBag, Sparkles, Trash2, Truck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CustomerChatCard } from "@/components/customer-chat-card";
import { MenuImage } from "@/components/menu-image";
import { useCart } from "@/hooks/use-cart";
import type { CartItem } from "@/lib/cart";
import { addCartRecommendation, cartRecommendations, type CartProduct } from "@/lib/cart-catalog";

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function CartView({ catalog, catalogFailed = false }: {
  catalog: CartProduct[]; catalogFailed?: boolean;
}) {
  const { cart, save, isHydrated } = useCart();
  const [notice, setNotice] = useState("");
  const products = new Map(catalog.map((product) => [product.variant_id, product]));
  const priceOf = (item: CartItem) => Number(products.get(item.variant_id)?.price ?? item.price);
  const stockOf = (item: CartItem) => Number(products.get(item.variant_id)?.available_stock ?? 0);
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + priceOf(item) * item.quantity, 0);
  const unavailable = cart.some((item) => !products.has(item.variant_id) || item.quantity > stockOf(item));
  const recommendations = cartRecommendations(catalog, cart);

  function changeQuantity(item: CartItem, amount: number) {
    const next = item.quantity + amount;
    if (next < 1) { save(cart.filter((entry) => entry.variant_id !== item.variant_id)); return; }
    if (amount > 0 && next > stockOf(item)) return;
    save(cart.map((entry) => entry.variant_id === item.variant_id ? { ...entry, quantity: next, price: priceOf(item), available_stock: stockOf(item) } : entry));
  }

  function add(product: CartProduct) {
    const updated = addCartRecommendation(cart, product);
    if (!updated) { setNotice("No more servings available for that dish."); return; }
    save(updated);
    setNotice(`${product.item_name} added to your cart.`);
  }

  if (!isHydrated) return <div aria-label="Loading cart" className="space-y-5"><div className="h-12 w-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /><div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /></div>;

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div><h1 className="text-3xl font-bold tracking-tight">Your Cart <span className="text-base font-medium">({quantity} {quantity === 1 ? "item" : "items"})</span></h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review your items and proceed to checkout.</p></div>
            {cart.length > 0 && <ConfirmButton variant="ghost" onConfirm={() => { save([]); setNotice("Cart cleared."); }} title="Clear your cart?" description="This removes all items from your cart. Existing orders are not affected." confirmLabel="Clear cart" className="mt-2 flex shrink-0 items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"><Trash2 className="size-4" />Clear Cart</ConfirmButton>}
          </header>
          {catalogFailed && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">Unable to check current prices and stock. Refresh before checking out.</p>}
          {unavailable && !catalogFailed && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">Some items are unavailable or exceed current stock. Reduce their quantity or remove them before checking out.</p>}
          {cart.length ? <div className="space-y-3">
            {cart.map((item) => {
              const product = products.get(item.variant_id);
              return (
                <article key={item.variant_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:gap-4 sm:p-4">
                  <div className="w-20 shrink-0 sm:w-28"><MenuImage src={product?.image_url} name={item.item_name} className="aspect-square rounded-lg" /></div>
                  <div className="min-w-0 flex-1"><h2 className="text-sm font-bold">{product?.item_name ?? item.item_name}</h2><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{product?.description || product?.serving_label || item.variant_name}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{product?.variant_name ?? item.variant_name}</p><p className="mt-1 text-sm font-bold text-red-600 dark:text-red-400">{money.format(priceOf(item))}</p>{!product || stockOf(item) < 1 ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">Unavailable</p> : item.quantity > stockOf(item) && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Only {stockOf(item)} available</p>}</div>
                  <div className="ml-auto flex items-center gap-3">
                    <ConfirmButton variant="ghost" aria-label={`Remove ${item.item_name} from cart`} onConfirm={() => save(cart.filter((entry) => entry.variant_id !== item.variant_id))} title={`Remove ${item.item_name}?`} description="This item will be removed from your cart." className="rounded-full border border-slate-200 p-2 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:hover:bg-red-950"><Trash2 className="size-4" /></ConfirmButton>
                    <div className="flex items-center rounded-full border border-slate-200 dark:border-slate-700">
                      {item.quantity === 1 ? <ConfirmButton variant="ghost" aria-label={`Remove one ${item.item_name}`} className="p-2.5" onConfirm={() => changeQuantity(item, -1)} title={`Remove ${item.item_name}?`} description="Removing the last serving removes this item from your cart."><Minus className="size-4" /></ConfirmButton> : <Button variant="ghost" type="button" aria-label={`Remove one ${item.item_name}`} className="p-2.5" onClick={() => changeQuantity(item, -1)}><Minus className="size-4" /></Button>}
                      <span className="min-w-7 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button variant="ghost" type="button" aria-label={`Add one ${item.item_name}`} disabled={item.quantity >= stockOf(item) || catalogFailed} className="p-2.5 disabled:opacity-30" onClick={() => changeQuantity(item, 1)}><Plus className="size-4" /></Button>
                    </div>
                    <div className="min-w-20 text-right"><p className="text-sm font-bold">{money.format(priceOf(item) * item.quantity)}</p>{item.quantity > 1 && <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{money.format(priceOf(item))} each</p>}</div>
                  </div>
                </article>
              );
            })}
          </div> : <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center dark:border-slate-700"><ShoppingBag className="mx-auto size-10 text-red-500" /><h2 className="mt-3 text-xl font-bold">Your cart is empty</h2><p className="my-3 text-sm text-slate-500 dark:text-slate-400">Find your favorites on Home, or try a suggestion below.</p><Button render={<Link href="/home" />}>Browse dishes</Button></div>}

          <section className="mt-6" aria-label="Recommended menu items">
            <h2 className="mb-3 text-base font-bold">You may also like</h2>
            <p role="status" className="mb-2 text-sm text-green-700 dark:text-green-400">{notice}</p>
            {recommendations.length ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {recommendations.map((product) => <article key={product.variant_id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><MenuImage name={product.item_name} src={product.image_url} /><div className="flex flex-1 flex-col p-3 text-center"><h3 className="text-xs font-bold">{product.item_name}</h3><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{product.serving_label}</p><p className="my-2 text-sm font-bold text-red-600 dark:text-red-400">{money.format(Number(product.price))}</p><Button variant="ghost" type="button" onClick={() => add(product)} className="mt-auto flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold hover:bg-orange-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label={`Add ${product.item_name} to cart`}><Plus className="size-3.5 text-red-600" />Add</Button></div></article>)}
            </div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">No additional dishes available right now. <Link className="text-red-600 dark:text-red-400" href="/home">Browse Home</Link></p>}
          </section>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-0">
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-6 text-lg font-bold">Order Summary</h2>
            <div className="space-y-4 text-sm"><div className="flex justify-between gap-2"><span>Items ({quantity} {quantity === 1 ? "item" : "items"})</span><span className="font-semibold">{money.format(subtotal)}</span></div><div className="flex justify-between gap-2"><span>Delivery Fee</span><span className="text-right">Calculated at checkout</span></div><div className="flex justify-between gap-2 border-t border-slate-200 pt-5 font-bold dark:border-slate-700"><span>Subtotal before delivery</span><span className="text-red-600 dark:text-red-400">{money.format(subtotal)}</span></div></div>
            {cart.length > 0 && <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">Choose your supported delivery area at checkout for the exact fee and total. Pick-up has no delivery fee.</p>}
            <div className="mt-6 space-y-3">
              {cart.length > 0 && !unavailable && !catalogFailed ? <Link href="/checkout" className="flex items-center justify-center gap-3 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700">Proceed to Checkout<ArrowRight className="size-4" /></Link> : <Button variant="ghost" disabled className="w-full rounded-lg bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500 dark:bg-slate-800">Proceed to Checkout</Button>}
              <Link href="/home" className="flex items-center justify-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><ArrowLeft className="size-4" />Continue Shopping</Link>
            </div>
          </section>
          <CustomerChatCard />
        </aside>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-4">
        {[{ icon: Truck, title: "Delivery & pick-up", text: "Choose at checkout" }, { icon: ShieldCheck, title: "COD & GCash", text: "Simple payment options" }, { icon: Sparkles, title: "Best Quality", text: "Your favorite dishes" }, { icon: Headphones, title: "Need help?", text: "Ask our chatbot" }].map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-2"><Icon className="size-6 shrink-0 text-orange-500" /><div><p className="font-semibold text-red-600 dark:text-red-400">{title}</p><p className="mt-1 text-slate-500 dark:text-slate-400">{text}</p></div></div>)}
      </div>
    </div>
  );
}
