import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DeliveryAreaForm } from "@/components/delivery-area-form";
import { Disclosure, DisclosureSummary } from "@/components/ui/disclosure";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { deleteDeliveryArea, saveDeliveryArea } from "./actions";

export default async function DeliveryAreasPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; error?: string; updated?: string }> }) {
  await requireRole(["admin"]);
  const { q = "", page = "1", error, updated } = await searchParams;
  const supabase = await createClient();
  const result = await supabase.from("delivery_areas").select("id, name, fee, is_active", { count: "exact" }).order("name").order("id");
  const failed = result.error || result.count !== result.data?.length;
  const areas = failed ? [] : (result.data ?? []).filter(area => area.name.toLowerCase().includes(q.trim().toLowerCase()));
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(areas.length / pageSize));
  const requestedPage = Number(page);
  const currentPage = Math.min(pages, Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1);
  const offset = (currentPage - 1) * pageSize;
  const visible = areas.slice(offset, offset + pageSize);
  const firstPageNumber = Math.max(1, Math.min(currentPage - 2, pages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, pages) }, (_, index) => firstPageNumber + index);
  const pageHref = (number: number) => `/admin/delivery-areas?${new URLSearchParams({ ...(q ? { q } : {}), page: String(number) })}`;
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold">Delivery Areas &amp; Fees</h1><p className="mt-2 text-sm text-muted-foreground">Manage approved delivery locations and charges. Delete unused locations or deactivate those already used in orders. Existing orders retain their saved location and fee.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-500 p-4 text-sm">{error === "duplicate" ? "That location already exists (names are case-insensitive). Edit the existing location instead." : error === "invalid" ? "Check the location name and fee. Use a non-negative fee with up to two decimal places, then confirm." : error === "location-used" ? "This location is linked to existing orders and cannot be deleted. Uncheck Available at checkout to deactivate it instead." : error === "confirm-delete" ? "Confirm deletion before removing a location." : error === "delete" ? "Location could not be deleted. It may already have been removed. Refresh and try again." : "Location could not be saved. Refresh and try again."}</p>}
    {!error && updated && <p role="status" className="rounded-xl border border-green-600 p-4 text-sm">{updated === "deleted" ? "Delivery location deleted." : "Delivery location saved."}</p>}
    <Disclosure className="rounded-xl border p-5"><DisclosureSummary>+ Add delivery location</DisclosureSummary><div className="mt-5"><DeliveryAreaForm action={saveDeliveryArea} /></div></Disclosure>
    <Form action="/admin/delivery-areas" className="flex flex-wrap gap-3"><Input name="q" type="search" aria-label="Search delivery locations" defaultValue={q} placeholder="Search locations" className="max-w-md" /><Button type="submit" variant="outline">Search</Button></Form>
    {failed && <p role="alert">Delivery locations could not be loaded completely. Refresh and try again.</p>}
    {!failed && <p className="text-sm text-muted-foreground">Showing {areas.length ? offset + 1 : 0}–{Math.min(offset + pageSize, areas.length)} of {areas.length} locations · Active locations appear at checkout; inactive locations are hidden.</p>}
    <div className="space-y-3">{visible.map(area => <Disclosure key={area.id} className="rounded-xl border p-4"><DisclosureSummary><span className="break-words">{area.name} · ₱{Number(area.fee).toFixed(2)} · {area.is_active ? "Active" : "Inactive"} — Edit</span></DisclosureSummary><div className="mt-5"><DeliveryAreaForm area={area} action={saveDeliveryArea} /><div className="mt-4 border-t pt-4"><ConfirmAction action={deleteDeliveryArea} fields={{ id: area.id, confirmDelete: "yes" }} title={`Delete ${area.name}?`} description="This permanently removes the location from delivery options. This cannot be undone. Locations linked to existing orders cannot be deleted; deactivate them instead." triggerLabel="Delete location" confirmLabel="Delete location permanently" /></div></div></Disclosure>)}</div>
    {!failed && areas.length > 0 && <nav aria-label="Delivery locations pagination" className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <span className="text-sm text-muted-foreground">Page {currentPage} of {pages}</span>
      <div className="flex flex-wrap items-center gap-2">
        {currentPage > 1 ? <Button size="sm" variant="outline" render={<Link href={pageHref(currentPage - 1)} />}>Previous</Button> : <Button size="sm" variant="outline" disabled>Previous</Button>}
        {pageNumbers.map(number => <Button key={number} size="sm" variant={number === currentPage ? "default" : "outline"} render={<Link href={pageHref(number)} aria-label={`Page ${number}`} aria-current={number === currentPage ? "page" : undefined} />}>{number}</Button>)}
        {currentPage < pages ? <Button size="sm" variant="outline" render={<Link href={pageHref(currentPage + 1)} />}>Next</Button> : <Button size="sm" variant="outline" disabled>Next</Button>}
      </div>
    </nav>}
    {!failed && !areas.length && <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">No delivery locations match your search.</p>}
  </div>;
}
