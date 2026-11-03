import { Headphones, ShieldCheck, Sparkles, Truck } from "lucide-react";

export function CustomerServiceStrip() {
  return <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-4">
    {[{ icon: Truck, title: "Delivery & pick-up", text: "Choose at checkout" }, { icon: ShieldCheck, title: "COD & GCash", text: "Simple payment options" }, { icon: Sparkles, title: "Best Quality", text: "Your favorite dishes" }, { icon: Headphones, title: "Need help?", text: "Ask our chatbot" }].map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-2"><Icon className="size-6 shrink-0 text-orange-500" /><div><p className="font-semibold text-red-600 dark:text-red-400">{title}</p><p className="mt-1 text-slate-500 dark:text-slate-400">{text}</p></div></div>)}
  </div>;
}
