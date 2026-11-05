"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { PhotoMatch } from "@/lib/menu-photo-matching";
import { importMenuItemPhoto } from "./actions";

export function PhotoImport({ matches }: { matches: PhotoMatch[] }) {
  const [pending, startTransition] = useTransition();
  const running = useRef(false);
  const [confirmed, setConfirmed] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const router = useRouter();
  const ready = matches.filter(match => match.status === "ready");

  function start() {
    if (!confirmed || running.current || !ready.length) return;
    running.current = true;
    setProgress(0);
    setBatchTotal(ready.length);
    setResults({});
    startTransition(async () => {
      try {
        for (const [index, match] of ready.entries()) {
          let message: string;
          try { message = (await importMenuItemPhoto(match.key, match.itemId!)).message; }
          catch { message = "Connection interrupted. Refresh to check whether the photo saved."; }
          setResults(current => ({ ...current, [match.key]: message }));
          setProgress(index + 1);
        }
      } finally {
        running.current = false;
        setConfirmed(false);
        router.refresh();
      }
    });
  }

  return <div className="space-y-6">
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <p className="text-sm">{ready.length} ready · {matches.filter(match => match.status === "existing").length} already have photos · {matches.filter(match => !["ready", "existing"].includes(match.status)).length} need review or have no exact match.</p>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} disabled={pending} onChange={event => setConfirmed(event.target.checked)} className="mt-1" />I reviewed the matches below. Upload only missing photos; keep existing photos, prices, servings, stock and approvals unchanged.</label>
      <Button type="button" disabled={!confirmed || pending || !ready.length} onClick={start} className="min-h-11 whitespace-normal">{pending ? `Saving ${progress}/${batchTotal}…` : `Save ${ready.length} matched photos to database`}</Button>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{pending ? "Keep this page open while each photo is saved." : progress ? `Finished ${progress} attempts. See per-photo results below; refresh to verify current database state.` : "Preview only. Nothing changes until you confirm and click Save."}</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {matches.map(match => <article key={match.key} className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative aspect-square bg-white"><Image src={`/prepared-menu-photos/${match.key}.webp`} alt={match.itemName ?? match.source} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-contain" /></div>
        <div className="space-y-2 p-4">
          <h2 className="font-semibold">{match.itemName ?? "Needs review"}</h2>
          <p className="break-words text-xs text-muted-foreground">{match.source}</p>
          <p className="text-sm font-medium">{match.status === "ready" ? "Ready — missing photo" : match.status === "existing" ? "Skipped — existing photo preserved" : `Skipped — ${match.status}`}</p>
          <p className="text-xs text-muted-foreground">{match.note}</p>
          {results[match.key] && <p role="status" className="text-sm">{results[match.key]}</p>}
        </div>
      </article>)}
    </div>
  </div>;
}
