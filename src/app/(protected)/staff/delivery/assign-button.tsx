"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function AssignButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="sm" disabled={pending}>{pending ? "Assigning..." : "Assign rider"}</Button>;
}
