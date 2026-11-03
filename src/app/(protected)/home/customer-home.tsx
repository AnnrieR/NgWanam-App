"use client";

import { Form } from "@/components/ui/form";

import { Input } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";
import { FormSelect, SelectOption } from "@/components/ui/form-select";

import Image from "next/image";
import Link from "next/link";
import { Beef, CakeSlice, CookingPot, Drumstick, Fish, Flame, GlassWater, Grid2X2, Heart, Headphones, Leaf, Sandwich, ShieldCheck, ShoppingCart, Soup, Sparkles, Truck, UsersRound, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";
import { CustomerChatCard } from "@/components/customer-chat-card";
import { MenuImage } from "@/components/menu-image";
import { useCart } from "@/hooks/use-cart";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

export type HomeVariant = {
  menu_item_id: string; item_name: string; description: string | null; image_url: string | null;
  category_name: string; is_best_seller: boolean; requires_preorder: boolean;
  variant_id: string; variant_name: string; serving_label: string; price: number; available_stock: number;
};
const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function categoryIcon(category: string) {
  const name = category.toLowerCase();
  if (name === "all") return Grid2X2;
  if (/family|party|salo|bilao/.test(name)) return UsersRound;
  if (/pancit|noodle/.test(name)) return CookingPot;
  if (/chicken/.test(name)) return Drumstick;
  if (/pork|beef/.test(name)) return Beef;
  if (/seafood|fish/.test(name)) return Fish;
  if (/sandwich/.test(name)) return Sandwich;
  if (/drink|beverage/.test(name)) return GlassWater;
  if (/dessert|sweet/.test(name)) return CakeSlice;
  if (/vegetable/.test(name)) return Leaf;
  if (/soup/.test(name)) return Soup;
  if (/grill/.test(name)) return Flame;
  return UtensilsCrossed;
}

export function CustomerHome({ name, query, variants }: { name: string; query: string; variants: HomeVariant[] }) {
  const [category, setCategory] = useState("All");
  const [all, setAll] = useState(false);
  const [notice, setNotice] = useState("");
  const [pendingAdd, setPendingAdd] = useState<HomeVariant | null>(null);
  const { cart, save, isHydrated } = useCart();
  const dishes = useMemo(() => {
    const map = new Map<string, HomeVariant[]>();
    for (const variant of variants) map.set(variant.menu_item_id, [...(map.get(variant.menu_item_id) ?? []), variant]);
    return [...map.values()].sort((a, b) => Number(b[0].is_best_seller) - Number(a[0].is_best_seller));
  }, [variants]);
  const categories = [...new Set(variants.map((variant) => variant.category_name))];
  const filtered = dishes.filter(([dish]) => (category === "All" || dish.category_name === category) && `${dish.item_name} ${dish.category_name} ${dish.description ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const showAll = all || Boolean(query) || category !== "All";

  function add(variant: HomeVariant) {
    const existing = cart.find((item) => item.variant_id === variant.variant_id);
    if ((existing?.quantity ?? 0) >= variant.available_stock) { setNotice("You already have all available servings in your cart."); return; }
    save(existing ? cart.map((item) => item.variant_id === variant.variant_id ? { ...item, quantity: item.quantity + 1, price: Number(variant.price), available_stock: variant.available_stock } : item)
      : [...cart, { variant_id: variant.variant_id, item_name: variant.item_name, variant_name: variant.variant_name, price: Number(variant.price), available_stock: variant.available_stock, quantity: 1 }]);
    setNotice(`${variant.item_name} added to cart.`);
  }

  return (
    <div className="space-y-5">
      <Form action="/home" method="get" role="search" className="md:hidden"><Input name="q" type="search" aria-label="Search dishes" defaultValue={query} placeholder="Search food or categories..." className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800" /></Form>
      <section aria-label="Welcome to Ng Wanam" className="relative isolate overflow-hidden rounded-3xl border border-[#ffc42f]/20 bg-[radial-gradient(ellipse_at_30%_0%,#d63b0d_0%,#a71c04_55%,#400d0a_100%)] px-6 py-8 text-white lg:px-9 lg:py-10">
        <div className="relative z-10 lg:w-[56%]">
          <p className="text-sm font-medium text-white/85">Hello, {name.split(" ")[0]}! Welcome to your table.</p>
          <p className="mt-5 text-[10px] font-bold tracking-[0.2em] text-[#ffc42f] uppercase">Ng Wanam · Since 2014</p>
          <h1 className="mt-3 font-display text-3xl leading-tight text-[#ffc42f] xl:text-4xl">The Original and Best Pancit in Town</h1>
          <p className="mt-3 text-base text-white/90">Home-style Filipino food in Batangas City.</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/10 px-3 py-2"><Truck aria-hidden="true" className="size-4 text-[#ffc42f]" />Delivery &amp; pick-up</span><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/10 px-3 py-2"><UtensilsCrossed aria-hidden="true" className="size-4 text-[#ffc42f]" />Freshly prepared favorites</span></div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] lg:block">
          <div className="absolute top-8 right-6 size-56 rounded-full border border-[#ffc42f]/20 xl:size-72" />
          <Image src="/landing/pancit.webp" alt="" width={850} height={812} sizes="(min-width: 1024px) 350px, 1px" className="absolute -top-10 -right-14 w-[90%] rotate-12 object-contain drop-shadow-2xl" />
          <Image src="/landing/sweet-sour-chicken.webp" alt="" width={750} height={591} sizes="(min-width: 1024px) 300px, 1px" className="absolute -bottom-8 right-6 w-[85%] -rotate-12 object-contain drop-shadow-2xl" />
        </div>
      </section>
      <section aria-label="Menu categories"><h2 className="mb-3 text-lg font-bold">Categories</h2><div className="flex gap-2 overflow-x-auto pb-2">
        {["All", ...categories].map((item) => { const Icon = categoryIcon(item); return <Button variant="ghost" key={item} onClick={() => setCategory(item)} type="button" aria-pressed={category === item} className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-3 text-sm ${category === item ? "border-[#bd2507] bg-[#bd2507] text-white hover:bg-[#a71c04] hover:text-white dark:bg-[#bd2507] dark:text-white dark:hover:bg-[#a71c04]" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}><Icon aria-hidden="true" className={`size-4 ${category === item ? "text-[#ffc42f]" : "text-orange-500"}`} />{item}</Button>; })}
      </div></section>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_230px]">
        <section>
          <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{showAll ? "Our Menu" : "Popular Dishes"}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{query ? `Results for “${query}”` : "Customer favorites you'll love"}</p></div><Button variant="ghost" type="button" onClick={() => { setAll(!all); setCategory("All"); }} className="text-sm font-medium text-red-600 dark:text-red-400">{showAll ? "Popular dishes" : "View all menu →"}</Button></div>
          <p role="status" className="mb-3 text-sm text-green-700 dark:text-green-400">{notice}</p>
          {filtered.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(showAll ? filtered : filtered.slice(0, 5)).map((options) => <DishCard key={options[0].menu_item_id} options={options} add={setPendingAdd} ready={isHydrated} />)}</div> : <p className="rounded-xl bg-slate-50 p-6 dark:bg-slate-800">No dishes match this search.</p>}
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-4">
            {[{ icon: Truck, title: "Delivery & pick-up", text: "Choose at checkout" }, { icon: ShieldCheck, title: "COD & GCash", text: "Simple payment options" }, { icon: Sparkles, title: "Best Quality", text: "Your favorite dishes" }, { icon: Headphones, title: "Need help?", text: "Ask our chatbot" }].map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-2"><Icon className="size-6 shrink-0 text-orange-500" /><div><p className="font-semibold text-red-600 dark:text-red-400">{title}</p><p className="mt-1 text-slate-500 dark:text-slate-400">{text}</p></div></div>)}
          </div>
        </section>
        <CustomerChatCard />
      </div>
      {query && <Link href="/home" className="inline-block text-sm text-red-600 dark:text-red-400">Clear search</Link>}
      <AlertDialog open={pendingAdd !== null} onOpenChange={open => { if (!open) setPendingAdd(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add this item to your cart?</AlertDialogTitle>
            <AlertDialogDescription>Check the dish and serving below before adding it. You can review quantities in your cart.</AlertDialogDescription>
          </AlertDialogHeader>
          {pendingAdd && <div className="rounded-xl border bg-muted/40 p-4 text-sm">
            <p className="font-semibold">{pendingAdd.item_name}</p>
            <p className="mt-1 text-muted-foreground">{pendingAdd.variant_name} · {pendingAdd.serving_label}</p>
            <p className="mt-3 font-bold">1 serving · {money.format(Number(pendingAdd.price))}</p>
            {pendingAdd.requires_preorder && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Pre-order required</p>}
          </div>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!isHydrated || !pendingAdd} onClick={() => { if (pendingAdd && isHydrated) { add(pendingAdd); setPendingAdd(null); } }}>Confirm add</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DishCard({ options, add, ready }: { options: HomeVariant[]; add: (variant: HomeVariant) => void; ready: boolean }) {
  const [selected, setSelected] = useState(options[0].variant_id);
  const [favorite, setFavorite] = useState(false);
  const variant = options.find((option) => option.variant_id === selected) ?? options[0];
  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <MenuImage name={variant.item_name} src={variant.image_url} />
      <Button variant="ghost" type="button" aria-label={`Favorite ${variant.item_name}`} aria-pressed={favorite} onClick={() => setFavorite(!favorite)} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-600"><Heart className={`size-4 ${favorite ? "fill-current" : ""}`} /></Button>
      <div className="flex flex-1 flex-col p-3"><h3 className="text-sm font-bold">{variant.item_name}</h3><p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{variant.description || variant.category_name}</p>
        <FormSelect aria-label={`Serving size for ${variant.item_name}`} value={selected} onChange={(event) => setSelected(event.target.value)} className="my-2 w-full rounded border border-slate-200 bg-transparent p-1 text-xs dark:border-slate-600 dark:bg-slate-800">{options.map((option) => <SelectOption key={option.variant_id} value={option.variant_id}>{option.serving_label}</SelectOption>)}</FormSelect>
        <p className="mb-2 font-bold text-red-600 dark:text-red-400">{money.format(Number(variant.price))}</p>
        {variant.requires_preorder && <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">Pre-order required</p>}
        <Button variant="ghost" disabled={!ready || variant.available_stock <= 0} type="button" onClick={() => add(variant)} className="mt-auto flex items-center justify-center gap-2 rounded-md bg-red-600 px-2 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-slate-400"><ShoppingCart className="size-3.5" />{variant.available_stock > 0 ? "Add to cart" : "Out of stock"}</Button>
      </div>
    </article>
  );
}
