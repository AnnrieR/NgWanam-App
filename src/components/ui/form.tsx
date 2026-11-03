"use client";

import { useState } from "react";

/** Preserve native form transport/React actions; show validation in-app, not
 * browser tooltip popups. Server actions remain the security boundary. */
export function Form({ children, onSubmit, onInput, ...props }: React.ComponentProps<"form">) {
  const [error, setError] = useState("");
  return <form {...props} noValidate onSubmit={event => {
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      event.preventDefault();
      const invalid = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input:invalid, textarea:invalid, select:invalid");
      const field = invalid?.getAttribute("aria-label") || Array.from(invalid?.labels?.[0]?.childNodes ?? [])
        .filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(" ").trim();
      const message = invalid?.validationMessage || "Check the required fields before continuing.";
      setError(field ? `${field}: ${message}` : message);
      invalid?.focus();
      return;
    }
    setError("");
    onSubmit?.(event);
  }} onInput={event => {
    if (error && event.currentTarget.checkValidity()) setError("");
    onInput?.(event);
  }}>
    {/* Validation is a full-width row, never an extra column in grid forms. */}
    {error && <p role="alert" className="col-span-full mb-4 min-w-0 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive [overflow-wrap:anywhere]">{error}</p>}
    {children}
  </form>;
}
