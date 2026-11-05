"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { menuGroups, type MenuGroup } from "@/lib/approved-menu-photo";
import { importMenuPhoto, type PhotoImportResult } from "./actions";
import type { ImportCategory, ImportOutcome } from "@/lib/menu-photo-import";

const defaultCategoryNames: Partial<Record<MenuGroup,string>> = {
  family: "Family Sizes", party: "Party Trays - Pre-order", salo: "Salo-Salo Trays",
  suki: "Suki Meals", pancitMeals: "Pancit Meals", riceMeals: "Plain Rice Meals",
};

export function PhotoImportForm({ categories, fingerprint, choices }: { categories: ImportCategory[]; fingerprint: string; choices: {
  key: string; name: string; disabled: boolean; similar: string[]; newGroup?: MenuGroup;
}[] }) {
  const [result, setResult] = useState<PhotoImportResult>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const lockRef = useRef(false);
  const router = useRouter();
  const available = choices.some(choice => !choice.disabled);
  const neededGroups = [...new Set(choices.flatMap(choice => choice.newGroup && !choice.disabled ? [choice.newGroup] : []))];
  return <div className="grid gap-4">
    <form className="grid gap-4 rounded-xl border p-5" aria-busy={busy} onSubmit={event => {
      event.preventDefault(); if (lockRef.current) return;
      const data = new FormData(event.currentTarget);
      const keys = data.getAll("itemKey").map(String);
      if (!keys.length) { setResult({ error: "Select at least one missing item or serving." }); return; }
      lockRef.current = true; setBusy(true); setResult({});
      startTransition(async () => {
        const outcomes: ImportOutcome[] = [];
        let nextFingerprint = fingerprint;
        try {
          // One click, small sequential requests to avoid long proxy/server timeouts.
          for (let offset = 0; offset < keys.length; offset += 5) {
            const batch = new FormData();
            for (const [key,value] of data.entries()) if (key !== "itemKey") batch.append(key,value);
            for (const key of keys.slice(offset,offset+5)) batch.append("itemKey",key);
            batch.set("fingerprint",nextFingerprint);
            setProgress(`Saving items ${offset+1}–${Math.min(offset+5,keys.length)} of ${keys.length}…`);
            const response = await importMenuPhoto(batch);
            outcomes.push(...response.outcomes ?? []);
            setResult({ ...response, outcomes: [...outcomes] });
            if (response.error || response.outcomes?.some(row => row.status === "failed")) break;
            if (!response.nextFingerprint) break;
            nextFingerprint = response.nextFingerprint;
          }
        } catch {
          setResult({ error: "Could not confirm completion. Refresh before retrying. Earlier successful batches remain saved; existing stocks will not be reset.", outcomes });
        } finally { lockRef.current = false; setBusy(false); setProgress(""); router.refresh(); }
      });
    }}>
      <fieldset className="grid gap-4" disabled={busy || !available}>
        <div className="grid gap-2"><p className="text-sm font-semibold">Missing items and serving sizes — Photos 1–15</p>
          {choices.map(choice => <label className="flex items-start gap-2 text-sm" key={choice.key}>
            <input type="checkbox" name="itemKey" value={choice.key} disabled={choice.disabled} defaultChecked={!choice.disabled && !choice.similar.length} />
            <span>{choice.name}{choice.similar.length ? ` — similar existing: ${choice.similar.join(', ')}. Review before selecting.` : ""}</span>
          </label>)}
        </div>
        {neededGroups.map(group => <label className="grid gap-2 text-sm" key={group}>Category for new {menuGroups[group]} items
          <select className="rounded-lg border bg-background p-2" name={`category:${group}`} defaultValue={categories.find(category => category.name.toLowerCase() === (defaultCategoryNames[group] ?? group).toLowerCase())?.id ?? ""}>
            <option value="">Choose existing category (required only if selected)</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>)}
        <p className="text-xs text-muted-foreground">Use Add category on the Menu page if a category is missing. Existing items keep their current categories and approval status.</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirmed" value="yes" required />
          Add only missing items/servings, with 15 stock per new serving. Preserve existing prices, stock, inactive/retired servings and transaction history. Publish newly created items after setup.
        </label>
        <Button type="submit" disabled={busy || !available}>{busy ? "Bulk adding… Keep this page open" : "Bulk add selected"}</Button>
      </fieldset>
    </form>
    {progress && <p role="status">{progress}</p>}
    {result.error && <p role="alert" className="rounded-xl border border-destructive p-4 text-sm text-destructive">{result.error}</p>}
    {result.outcomes && <div role="status" aria-live="polite" className="rounded-xl border p-4 text-sm">
      <p className="mb-3 font-semibold">{result.outcomes.filter(row => row.status === 'created').length} items added/extended · {result.outcomes.filter(row => row.status === 'skipped').length} skipped · {result.outcomes.filter(row => row.status === 'failed').length} failed</p>
      <ul className="grid gap-2">{result.outcomes.map(row => <li key={row.name}><strong>{row.name}: {row.status}</strong> — {row.message}</li>)}</ul>
    </div>}
  </div>;
}
