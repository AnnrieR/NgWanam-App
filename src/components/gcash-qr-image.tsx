"use client";

/* eslint-disable @next/next/no-img-element -- Supabase Storage public URL is configured per installation. */
import { useState } from "react";

export function GcashQrImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p role="alert" className="text-sm text-destructive">GCash QR could not be loaded. Use the displayed account number and verify the recipient in GCash.</p>
    : <div className="mx-auto w-full max-w-64 rounded-xl border bg-white p-4"><img src={src} alt="GCash payment QR code" className="max-h-80 w-full object-contain" onError={() => setFailed(true)} /></div>;
}
