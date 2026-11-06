"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { cn } from "@/lib/utils";

export function PasswordInput({ id, className, ...props }: React.ComponentProps<typeof Input>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const label = props.name === "confirmPassword" ? "confirm password" : "password";

  return <div className="relative min-w-0">
    <Input {...props} id={inputId} type={visible ? "text" : "password"} className={cn("pr-12", className)} />
    <Button type="button" variant="ghost" size="icon" disabled={props.disabled}
      aria-label={`${visible ? "Hide" : "Show"} ${label}`} aria-controls={inputId} aria-pressed={visible}
      className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      onClick={() => setVisible(current => !current)}>
      {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
    </Button>
  </div>;
}
