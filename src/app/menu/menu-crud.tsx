"use client";

import { Form } from "@/components/ui/form";

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { FormSelect, SelectOption } from "@/components/ui/form-select";

import { createContext, startTransition, useContext, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { CheckCircle2, X } from "lucide-react";
import { ConfirmAction } from "@/components/confirm-action";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Textarea } from "@/components/ui/textarea";
import { MenuImage } from "@/components/menu-image";

import { createMenuCategory, createMenuEntry, createMenuVariant, deleteMenuItem, deleteMenuVariant, updateMenuVariant, updateMenuItem, type MenuSaveResult } from "./actions";

export type MenuVariant = { id: string; name: string; servingLabel: string; price: number; isActive: boolean };

export type MenuRow = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string;
  category: string;
  isBestSeller: boolean;
  requiresPreorder: boolean;
  isActive: boolean;
  approvalStatus: string;
  variants: MenuVariant[];
};

export type CategoryOption = { id: string; name: string };

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const statusFor = (row: MenuRow) =>
  row.approvalStatus === "pending"
    ? { label: "Pending approval", className: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400" }
    : row.approvalStatus === "rejected"
      ? { label: "Rejected", className: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" }
      : row.isActive
        ? { label: "Active", className: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" }
        : { label: "Inactive", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" };

const labelClass = "grid gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300";
const fieldClass = "h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-slate-800";
const areaClass = "min-h-20 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-slate-800";

const MenuSaveContext = createContext<{
  busy: boolean;
  setBusy: (busy: boolean) => void;
  lockRef: RefObject<boolean>;
  onSuccess: (message: string) => void;
} | null>(null);

/** Native onSubmit avoids React's automatic action-form reset on failed saves,
 * preserving text, selections, checkboxes and the selected upload for a retry. */
function MenuSaveForm({ action, children, className }: {
  action: (form: FormData) => Promise<MenuSaveResult>;
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(MenuSaveContext);
  const [error, setError] = useState("");
  if (!context) throw new Error("MenuSaveForm requires a menu save context");
  const { busy, setBusy, lockRef, onSuccess } = context;
  return <Form className={className} aria-busy={busy} onSubmit={event => {
    event.preventDefault();
    if (lockRef.current) return;
    const data = new FormData(event.currentTarget);
    lockRef.current = true;
    setBusy(true);
    setError("");
    startTransition(async () => {
      try {
        const result = await action(data);
        if (result.ok) onSuccess(result.message);
        else setError(result.error);
      } catch {
        setError("We could not confirm the save. Your inputs have been kept. Check the menu list before retrying if the connection was interrupted.");
      } finally {
        lockRef.current = false;
        setBusy(false);
      }
    });
  }}>
    <fieldset disabled={busy} className="contents">{children}</fieldset>
    {error && <p role="alert" className="col-span-full mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
  </Form>;
}

function SaveButton({ children, className, creating = false }: { children: React.ReactNode; className?: string; creating?: boolean }) {
  const busy = useContext(MenuSaveContext)?.busy ?? false;
  return <Button className={className} disabled={busy} size="sm" type="submit">{busy ? creating ? "Creating…" : "Saving…" : children}</Button>;
}

/**
 * The Menu tab itself: one row per menu item, searchable, with an Add modal
 * that collects everything the row stores (category, name, description, first
 * serving, price, flags) and Edit / Delete in the last column.
 *
 * Variant prices live inside the Edit modal rather than in the row, because
 * `updateMenuVariant` acts on a single variant - so each serving keeps its own
 * tiny form instead of the modal pretending one submit covers every price.
 */
export function MenuCrud({ categories, rows, servingDeletionAvailable = false }: { categories: CategoryOption[]; rows: MenuRow[]; servingDeletionAvailable?: boolean }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ mode: "create" } | { mode: "edit"; row: MenuRow } | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const lockRef = useRef(false);
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
  const noticeId = useRef(0);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        row.category.toLowerCase().includes(needle) ||
        (row.description ?? "").toLowerCase().includes(needle) ||
        row.variants.some((variant) => variant.name.toLowerCase().includes(needle) || variant.servingLabel.toLowerCase().includes(needle)),
    );
  }, [query, rows]);

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pending = rows.filter((row) => row.approvalStatus === "pending").length;
  const inactive = rows.filter((row) => !row.isActive).length;

  return (
    <MenuSaveContext.Provider value={{ busy, setBusy, lockRef, onSuccess: message => {
      setEditing(null);
      setCategoryOpen(false);
      setNotice({ id: ++noticeId.current, message });
    } }}>
    <div>
      <div role="status" aria-live="polite" aria-atomic="true" className="pointer-events-none fixed top-4 right-4 z-[100] max-w-[calc(100vw-2rem)] sm:max-w-sm">
        {notice && <div key={notice.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900 shadow-lg dark:border-green-800 dark:bg-green-950 dark:text-green-100">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 [overflow-wrap:anywhere]">{notice.message}</p>
          <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)} className="shrink-0 rounded p-1 focus-visible:outline-2"><X className="size-4" aria-hidden="true" /></button>
        </div>}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          aria-label="Search menu"
          className="max-w-xs"
          onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          placeholder="Search item, category, description, or serving"
          type="search"
          value={query}
        />
        <p className="text-sm text-muted-foreground">
          {visible.length} of {rows.length} items
          {pending > 0 && <span className="ml-2 text-amber-600 dark:text-amber-400">{pending} pending</span>}
          {inactive > 0 && <span className="ml-2 text-slate-500 dark:text-slate-400">{inactive} inactive</span>}
        </p>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => setCategoryOpen(true)} size="sm" type="button" variant="outline">Add category</Button>
          <Button onClick={() => setEditing({ mode: "create" })} size="sm" type="button">Add menu</Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">No menu item matches that search.</p>
      ) : (
        <div className="rounded-2xl border border-stone-200 dark:border-slate-700">
          <Table className="w-full table-fixed text-left text-xs [&_td]:whitespace-normal [&_td]:[overflow-wrap:anywhere] [&_th]:whitespace-normal">
            <TableHeader className="border-b border-stone-200 bg-stone-50/70 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              <TableRow>
                <TableHead className="px-4 py-3 font-semibold">Item</TableHead>
                <TableHead className="hidden w-[16%] px-3 py-3 font-semibold md:table-cell">Category</TableHead>
                <TableHead className="hidden w-[28%] px-3 py-3 font-semibold sm:table-cell">Serving &amp; price</TableHead>
                <TableHead className="hidden w-[20%] px-3 py-3 font-semibold xl:table-cell">Description</TableHead>
                <TableHead className="w-[116px] px-3 py-3 text-right font-semibold lg:w-[148px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => {
                const status = statusFor(row);
                return (
                  <TableRow className="border-b border-stone-100 last:border-0 dark:border-slate-800" key={row.id}>
                    <TableCell className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{row.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {row.isBestSeller && <span className="mr-1 font-medium text-amber-600 dark:text-amber-400">Best seller</span>}
                        {row.requiresPreorder && <span className="font-medium text-sky-600 dark:text-sky-400">Pre-order</span>}
                        {!row.isBestSeller && !row.requiresPreorder && "—"}
                      </p>
                      <p className="mt-1 text-muted-foreground md:hidden">{row.category}</p>
                      <span className={`mt-2 inline-flex rounded-sm px-2 py-1 font-medium ${status.className}`}>{status.label}</span>
                      <ul className="mt-2 space-y-1 sm:hidden">
                        {row.variants.map((variant) => <li key={variant.id} className={variant.isActive ? "" : "text-muted-foreground line-through"}>
                          {variant.name} · {variant.servingLabel} <strong>{currency.format(variant.price)}</strong>
                        </li>)}
                      </ul>
                    </TableCell>
                    <TableCell className="hidden px-3 py-3 text-slate-600 md:table-cell dark:text-slate-400">{row.category}</TableCell>
                    <TableCell className="hidden px-3 py-3 sm:table-cell">
                      <ul className="space-y-1">
                        {row.variants.map((variant) => (
                          <li className={variant.isActive ? "" : "text-slate-400 line-through dark:text-slate-500"} key={variant.id}>
                            {variant.name} · {variant.servingLabel}{" "}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{currency.format(variant.price)}</span>
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="hidden px-3 py-3 text-slate-600 xl:table-cell dark:text-slate-400">
                      <span className="line-clamp-2">{row.description || "—"}</span>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="flex flex-col items-end justify-end gap-2 lg:flex-row lg:items-center">
                        <Button onClick={() => setEditing({ mode: "edit", row })} size="sm" type="button" variant="outline">Edit</Button>
                        <ConfirmAction action={deleteMenuItem} fields={{ menuItemId: row.id }} title={`Delete ${row.name}?`} description="This removes the item, serving sizes and stock rows. Past order names/prices remain. Items reserved by unfinished orders cannot be deleted." />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <nav aria-label="Menu pagination" className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted-foreground">
            <span aria-live="polite">Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, visible.length)} of {visible.length} items</span>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="outline" type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
              <span>Page {currentPage} of {pages}</span>
              <Button size="sm" variant="outline" type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button>
            </div>
          </nav>
        </div>
      )}

      {categoryOpen && (
        <Modal onClose={() => setCategoryOpen(false)} description="Categories group the menu - Pancit, Drinks, Desserts, and so on." title="Add category">
          <MenuSaveForm action={createMenuCategory}>
            <Label className={`${labelClass} mb-4`}>Category name
              <Input autoFocus className={fieldClass} name="name" placeholder="e.g. Snacks" required />
            </Label>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setCategoryOpen(false)} size="sm" type="button" variant="outline">Cancel</Button>
              <SaveButton creating>Create category</SaveButton>
            </div>
          </MenuSaveForm>
        </Modal>
      )}

      {editing && (
        <Modal
          onClose={() => setEditing(null)}
          description={
            editing.mode === "create"
              ? "Everything the row stores. A staff submission starts as pending until an admin approves it."
              : "Item details live here; each serving keeps its own price form below."
          }
          title={editing.mode === "create" ? "Add menu item" : `Edit ${editing.row.name}`}
        >
          {editing.mode === "create" ? (
            <CreateForm categories={categories} onCancel={() => setEditing(null)} />
          ) : (
            <EditForms categories={categories} row={editing.row} servingDeletionAvailable={servingDeletionAvailable} onCancel={() => setEditing(null)} />
          )}
        </Modal>
      )}

    </div>
    </MenuSaveContext.Provider>
  );
}

function Modal({ children, description, onClose, title }: { children: React.ReactNode; description: string; onClose: () => void; title: string }) {
  const busy = useContext(MenuSaveContext)?.busy ?? false;
  return (
      <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent showCloseButton={!busy} className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <div className="mb-5">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="mt-1 text-sm">{description}</DialogDescription>
        </div>
        {children}
      </DialogContent>
      </Dialog>
  );
}

function CategorySelect({ categories, defaultValue }: { categories: CategoryOption[]; defaultValue?: string }) {
  return (
    <FormSelect className={fieldClass} defaultValue={defaultValue ?? ""} name="categoryId" required>
      <SelectOption disabled value="">Choose category</SelectOption>
      {categories.map((category) => (
        <SelectOption key={category.id} value={category.id}>{category.name}</SelectOption>
      ))}
    </FormSelect>
  );
}

function ImageUpload({ current, name = "Menu photo" }: { current?: string | null; name?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  return (
    <div className="grid gap-2 sm:col-span-2">
      <Label className={labelClass}>Upload image (optional)
        <Input name="image" type="file" accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            const invalid = file && (file.size >= 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type));
            event.target.setCustomValidity(invalid ? "Choose one JPG, PNG, or WebP image smaller than 1 MB." : "");
            if (invalid) event.target.checkValidity();
            setPreview(file && !invalid ? URL.createObjectURL(file) : null);
          }} />
      </Label>
      <p className="text-xs text-muted-foreground">One image per menu · JPG, PNG, or WebP · smaller than 1 MB. Uploading a new image replaces the current one.</p>
      {(preview || current) && <div className="w-40"><MenuImage key={preview || current} name={name} src={preview || current} className="rounded-xl" /></div>}
    </div>
  );
}

function CreateForm({ categories, onCancel }: { categories: CategoryOption[]; onCancel: () => void }) {
  return (
    <MenuSaveForm action={createMenuEntry}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className={labelClass}>Category<CategorySelect categories={categories} /></Label>
        <Label className={labelClass}>Item name<Input className={fieldClass} name="itemName" required /></Label>
        <Label className={`${labelClass} sm:col-span-2`}>Description<Textarea className={areaClass} name="description" placeholder="What makes it worth ordering" /></Label>
        <ImageUpload />
        <Label className={labelClass}>First serving name<Input className={fieldClass} name="variantName" placeholder="Regular" required /></Label>
        <Label className={labelClass}>Serving label<Input className={fieldClass} name="servingLabel" placeholder="Good for 1" required /></Label>
        <Label className={labelClass}>Price (PHP)<Input className={fieldClass} min="0" name="price" required step="0.01" type="number" /></Label>
        <div className="flex flex-col justify-end gap-2 text-sm font-medium">
          <Label className="flex items-center gap-2"><Input name="isBestSeller" type="checkbox" /> Best seller</Label>
          <Label className="flex items-center gap-2"><Input name="requiresPreorder" type="checkbox" /> Requires pre-order</Label>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onCancel} size="sm" type="button" variant="outline">Cancel</Button>
        <SaveButton creating>Create menu item</SaveButton>
      </div>
    </MenuSaveForm>
  );
}

function DeleteServing({ variant }: { variant: MenuVariant }) {
  const [open, setOpen] = useState(false);
  const busy = useContext(MenuSaveContext)?.busy ?? false;
  return <>
    <Button aria-label={`Delete serving ${variant.name} ${variant.servingLabel}`} disabled={busy} size="sm" type="button" variant="destructive" onClick={() => setOpen(true)}>Delete</Button>
    <AlertDialog open={open} onOpenChange={next => { if (!busy) setOpen(next); }}>
      <AlertDialogContent>
        <AlertDialogTitle>Delete {variant.name} · {variant.servingLabel}?</AlertDialogTitle>
        <AlertDialogDescription>This removes this serving size and price from the menu. Existing orders, stock records and history are kept. Other serving sizes are not deleted.</AlertDialogDescription>
        <MenuSaveForm action={deleteMenuVariant} className="mt-5">
          <input name="variantId" type="hidden" value={variant.id} />
          <input name="confirmed" type="hidden" value="yes" />
          <div className="flex justify-end gap-2">
            <Button disabled={busy} type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={busy} type="submit" variant="destructive">{busy ? "Deleting…" : "Delete serving"}</Button>
          </div>
        </MenuSaveForm>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

function EditForms({ categories, onCancel, row, servingDeletionAvailable }: { categories: CategoryOption[]; onCancel: () => void; row: MenuRow; servingDeletionAvailable: boolean }) {
  const busy = useContext(MenuSaveContext)?.busy ?? false;
  return (
    <div>
      <MenuSaveForm action={updateMenuItem}>
        <input name="menuItemId" type="hidden" value={row.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Label className={labelClass}>Category<CategorySelect categories={categories} defaultValue={row.categoryId} /></Label>
          <Label className={labelClass}>Item name<Input className={fieldClass} defaultValue={row.name} name="itemName" required /></Label>
          <Label className={`${labelClass} sm:col-span-2`}>Description<Textarea className={areaClass} defaultValue={row.description ?? ""} name="description" /></Label>
          <ImageUpload current={row.imageUrl} name={row.name} />
          <div className="flex flex-col justify-end gap-2 text-sm font-medium sm:col-span-2">
            <Label className="flex items-center gap-2"><Input defaultChecked={row.isActive} name="isActive" type="checkbox" /> Active (visible to customers)</Label>
            <Label className="flex items-center gap-2"><Input defaultChecked={row.isBestSeller} name="isBestSeller" type="checkbox" /> Best seller</Label>
            <Label className="flex items-center gap-2"><Input defaultChecked={row.requiresPreorder} name="requiresPreorder" type="checkbox" /> Requires pre-order</Label>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <SaveButton>Save item details</SaveButton>
        </div>
      </MenuSaveForm>

      <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Serving sizes &amp; price</h3>
        <div className="space-y-3">
          {row.variants.map((variant) => (
            <div className="flex flex-wrap items-center gap-3" key={variant.id}>
            <MenuSaveForm action={updateMenuVariant} className="flex flex-wrap items-center gap-3">
              <input name="variantId" type="hidden" value={variant.id} />
              <Input aria-label="Serving name" defaultValue={variant.name} name="variantName" required className="w-36" />
              <Input aria-label="Serving label" defaultValue={variant.servingLabel} name="servingLabel" required className="w-36" />
              <Input aria-label={`Price for ${variant.name} ${variant.servingLabel}`} className="h-8 w-28 text-xs" defaultValue={variant.price} min="0" name="price" required step="0.01" type="number" />
              <Label className="flex items-center gap-1.5 text-xs font-medium"><Input defaultChecked={variant.isActive} name="isActive" type="checkbox" /> On sale</Label>
              <SaveButton className="h-8 rounded-md px-3 text-xs">Save</SaveButton>
            </MenuSaveForm>
            {servingDeletionAvailable ? <DeleteServing variant={variant} /> : <Button disabled size="sm" type="button" variant="outline" title="Requires the serving-delete database update">Delete</Button>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">Prices save on their own button - each serving is a separate record.</p>
        {!servingDeletionAvailable && <p className="mt-2 text-xs text-muted-foreground">Serving Delete is temporarily unavailable until its database update is installed. Adding and editing servings still work.</p>}
        <MenuSaveForm action={createMenuVariant} className="mt-4 grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
          <input name="menuItemId" type="hidden" value={row.id} />
          <h4 className="text-sm font-semibold sm:col-span-2">Add serving size</h4>
          <Label className={labelClass}>Serving name<Input name="variantName" required placeholder="Large" /></Label>
          <Label className={labelClass}>Serving label<Input name="servingLabel" required placeholder="Good for 3" /></Label>
          <Label className={labelClass}>Price (PHP)<Input name="price" required type="number" min="0" step="0.01" /></Label>
          <SaveButton className="self-end" creating>Add serving</SaveButton>
        </MenuSaveForm>
      </div>

      <div className="mt-6 flex justify-end">
        <Button disabled={busy} onClick={onCancel} size="sm" type="button" variant="outline">Close</Button>
      </div>
    </div>
  );
}
