"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { importMenuPhoto, type PhotoImportResult } from "./actions";
import type { ImportCategory } from "@/lib/menu-photo-import";

export function PhotoImportForm({ categories, fingerprint, available, choices }: { categories: ImportCategory[]; fingerprint: string; available: boolean; choices: { key: string; name: string; disabled: boolean; similar: string[] }[] }) {
  const [result, setResult] = useState<PhotoImportResult>({});
  const [busy, setBusy] = useState(false);
  const lockRef = useRef(false);
  const router = useRouter();
  return <div className="grid gap-4">
    <form className="grid gap-4 rounded-xl border p-5" aria-busy={busy} onSubmit={event => {
      event.preventDefault(); if (lockRef.current) return;
      const data = new FormData(event.currentTarget);
      lockRef.current = true; setBusy(true); setResult({});
      startTransition(async () => {
        try { setResult(await importMenuPhoto(data)); }
        catch { setResult({ error: "Could not confirm import. Refresh the comparison before retrying." }); }
        finally { lockRef.current = false; setBusy(false); router.refresh(); }
      });
    }}>
      <input type="hidden" name="fingerprint" value={fingerprint} />
      <fieldset className="grid gap-4" disabled={busy || !available}>
        <div className="grid gap-2"><p className="text-sm font-semibold">Select missing items to import</p>
          {choices.map(choice => <label className="flex items-start gap-2 text-sm" key={choice.key}>
            <input type="checkbox" name="itemKey" value={choice.key} disabled={choice.disabled} defaultChecked={!choice.disabled && !choice.similar.length} />
            <span>{choice.name}{choice.disabled ? " — existing; skipped" : choice.similar.length > 0 ? ` — review similar existing: ${choice.similar.join(', ')}. Leave unchecked if already represented.` : ""}</span>
          </label>)}
        </div>
        {([['pancitCategory','Category for Pancit / noodles / pasta'],['chickenCategory','Category for Chicken']] as const).map(([name,label]) =>
          <label className="grid gap-2 text-sm" key={name}>{label}
            <select className="rounded-lg border bg-background p-2" name={name} required defaultValue="">
              <option value="" disabled>Select existing category</option>
              {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>)}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirmed" value="yes" required />
          I approve importing only missing items, publishing them after setup, and starting each new serving at 15 stock. Existing items, prices and stock remain unchanged.
        </label>
        <Button type="submit" disabled={busy || !available}>{busy ? "Importing… Do not close this page" : "Import missing items"}</Button>
      </fieldset>
    </form>
    {result.error && <p role="alert" className="rounded-xl border border-destructive p-4 text-sm text-destructive">{result.error}</p>}
    {result.outcomes && <div role="status" aria-live="polite" className="rounded-xl border p-4 text-sm">
      <p className="mb-3 font-semibold">{result.outcomes.filter(row => row.status === 'created').length} imported · {result.outcomes.filter(row => row.status === 'skipped').length} skipped · {result.outcomes.filter(row => row.status === 'failed').length} failed</p>
      <ul className="grid gap-2">{result.outcomes.map(row => <li key={row.name}><strong>{row.name}: {row.status}</strong> — {row.message}</li>)}</ul>
    </div>}
  </div>;
}
