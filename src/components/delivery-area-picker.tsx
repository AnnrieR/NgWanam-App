"use client";

import { useState } from "react";
import { Check, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { searchDeliveryAreas, type DeliveryArea } from "@/lib/delivery-areas";

const money = new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"});

export function DeliveryAreaPicker({ areas, value, onChange, failed, disabled }: { areas: DeliveryArea[]; value: string; onChange: (value: string) => void; failed: boolean; disabled: boolean }) {
  const [open,setOpen] = useState(false);
  const [query,setQuery] = useState("");
  const selected = areas.find(area => area.id===value);
  const filtered = searchDeliveryAreas(areas,query);
  return <div className="space-y-2 sm:col-span-2">
    <p id="delivery-area-label" className="text-xs font-semibold">Delivery area (required)</p>
    <Button type="button" variant="outline" aria-labelledby="delivery-area-label delivery-area-value" aria-haspopup="dialog" disabled={disabled || failed || !areas.length} onClick={() => {setQuery("");setOpen(true);}} className="h-auto min-h-11 w-full justify-start whitespace-normal text-left">
      <MapPin aria-hidden="true" className="size-4 shrink-0" /><span id="delivery-area-value">{selected ? `${selected.name} · ${money.format(selected.fee)}` : "Search and choose your exact delivery area"}</span>
    </Button>
    {failed ? <p role="alert" className="text-xs text-red-600 dark:text-red-400">Supported areas could not be loaded. Refresh checkout, or choose pick-up.</p> : !areas.length ? <p role="status" className="text-xs text-muted-foreground">No supported delivery areas are available. Pick-up is still available.</p> : <p className="text-xs leading-5 text-muted-foreground">Fee follows the approved area, not an estimated distance. If your area is missing, contact the restaurant or choose pick-up—do not select a different area.</p>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] gap-4 overflow-hidden sm:max-w-lg">
      <div className="pr-8"><DialogTitle>Choose delivery area</DialogTitle><DialogDescription>January 2026 charge guide with confirmed corrections. Select the exact area; the delivery fee is added to your order.</DialogDescription></div>
      <div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search delivery areas" type="search" autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Barangay, subdivision, road or landmark…" className="pl-9" /></div>
      <p aria-live="polite" className="text-xs text-muted-foreground">{filtered.length} supported {filtered.length===1 ? "area" : "areas"}</p>
      <div className="max-h-[45dvh] space-y-2 overflow-y-auto pr-1" aria-label="Supported delivery areas">{filtered.length ? filtered.map(area => <Button key={area.id} type="button" variant="outline" data-delivery-area={area.id} aria-pressed={area.id===value} onClick={() => {onChange(area.id);setOpen(false);}} className={`h-auto min-h-12 w-full justify-between gap-3 whitespace-normal py-3 text-left ${area.id===value ? "border-orange-500 bg-orange-500/10" : ""}`}><span className="flex items-center gap-2">{area.id===value && <Check aria-hidden="true" className="size-4 shrink-0" />}{area.name}</span><strong className="shrink-0">{money.format(area.fee)}</strong></Button>) : <p role="status" className="p-5 text-sm text-muted-foreground">No supported area matches. Try another spelling or contact the restaurant. An unlisted area cannot be submitted for delivery.</p>}</div>
    </DialogContent></Dialog>
  </div>;
}
