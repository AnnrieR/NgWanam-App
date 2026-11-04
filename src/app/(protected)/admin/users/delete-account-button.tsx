"use client";

import { createContext, startTransition, useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { deleteAccount } from "../actions";

const DeleteNoticeContext = createContext<(message: string) => void>(() => {});

export function AccountDeletionFeedback({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState("");
  return <DeleteNoticeContext.Provider value={setNotice}>
    {notice && <p role="status" aria-live="polite" className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">{notice}</p>}
    {children}
  </DeleteNoticeContext.Provider>;
}

export function DeleteAccountButton({ profileId, name }: { profileId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lockRef = useRef(false);
  const notify = useContext(DeleteNoticeContext);
  const router = useRouter();
  return <>
    <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => { setError(""); notify(""); setOpen(true); }}>Delete account</Button>
    <AlertDialog open={open} onOpenChange={next => { if (!lockRef.current) setOpen(next); }}>
      <AlertDialogContent>
        <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
        <AlertDialogDescription>Permanently remove login access and personal profile details. Anonymized transaction history is retained. Accounts with unfinished orders or deliveries cannot be deleted.</AlertDialogDescription>
        <form aria-busy={busy} className="mt-4" onSubmit={event => {
          event.preventDefault();
          if (lockRef.current) return;
          const data = new FormData(event.currentTarget);
          lockRef.current = true; setBusy(true); setError("");
          startTransition(async () => {
            try {
              const result = await deleteAccount(data);
              if (!result.ok) setError(`${result.error}${result.reference ? ` Reference: ${result.reference}` : ""}`);
              else {
                setOpen(false);
                notify(result.warning ?? "Account deleted. Login access removed; anonymized transaction history retained.");
              }
              // Refresh also on partial failure so the inactive state is accurate.
              router.refresh();
            } catch {
              setError("We could not confirm deletion. Refresh User Management and check the web server logs before retrying.");
            } finally {
              lockRef.current = false; setBusy(false);
            }
          });
        }}>
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="confirmed" value="yes" />
          {error && <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={busy}>{busy ? "Deleting…" : "Delete account permanently"}</Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
