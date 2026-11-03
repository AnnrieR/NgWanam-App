"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OptionProps = React.OptionHTMLAttributes<HTMLOptionElement>;
/** Declarative option data, never rendered as a native browser option. */
export function SelectOption(props: OptionProps) { void props; return null; }

export function FormSelect({ children, value, defaultValue, onChange, className, name, required, disabled, id, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const options = React.Children.toArray(children).filter(React.isValidElement).map(child => (child as React.ReactElement<OptionProps>).props);
  const items = options.map(option => ({ value: String(option.value ?? ""), label: option.children }));
  return <Select name={name} required={required} disabled={disabled} items={items}
    value={value === undefined ? undefined : String(value)} defaultValue={defaultValue === undefined ? "" : String(defaultValue)}
    onValueChange={(next) => { const target = { value: String(next ?? ""), name: name ?? "" }; onChange?.({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>); }}>
    <SelectTrigger id={id} aria-label={props["aria-label"]} aria-describedby={props["aria-describedby"]} className={className}><SelectValue /></SelectTrigger>
    <SelectContent alignItemWithTrigger={false}>{options.map((option, index) => <SelectItem key={`${option.value}-${index}`} value={String(option.value ?? "")} disabled={option.disabled}>{option.children}</SelectItem>)}</SelectContent>
  </Select>;
}
