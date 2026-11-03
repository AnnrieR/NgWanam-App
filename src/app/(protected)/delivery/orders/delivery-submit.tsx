"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function DeliverySubmit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button size="sm" type="submit" disabled={pending}>{pending ? "Saving..." : children}</Button>;
}
