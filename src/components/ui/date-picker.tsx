"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FormSelect, SelectOption } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";

function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function DatePicker({ value, defaultValue, name, id, type, onChange, onInput, onBlur, className, disabled, min, max, required, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [local, setLocal] = React.useState(String(defaultValue ?? ""));
  const selectedValue = String(value ?? local);
  const selected = selectedValue ? new Date(`${selectedValue.slice(0, 10)}T12:00:00`) : undefined;
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(selected ?? new Date());
  const withTime = type === "datetime-local";
  function change(next: string) {
    setLocal(next);
    const target = { value: next, name: name ?? "" };
    const event = { target, currentTarget: target } as React.ChangeEvent<HTMLInputElement>;
    onChange?.(event); onInput?.(event);
  }
  const isDisabled = (date: Date) => Boolean((min && dateString(date) < String(min).slice(0, 10)) || (max && dateString(date) > String(max).slice(0, 10)));
  return <>
    {name && <input type="hidden" name={name} value={selectedValue} />}
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) setMonth(selected ?? new Date()); }}>
      <PopoverTrigger render={<Button id={id} type="button" variant="outline" className={className} disabled={disabled} aria-label={props["aria-label"] ?? "Choose date"} aria-required={required} aria-describedby={props["aria-describedby"]} onBlur={() => { const target = { value: selectedValue, name: name ?? "" }; onBlur?.({ target, currentTarget: target } as React.FocusEvent<HTMLInputElement>); }} />}>
        {selected && !Number.isNaN(selected.getTime()) ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(selected) + (withTime ? ` · ${selectedValue.slice(11) || "00:00"}` : "") : "Choose date"}<CalendarIcon className="ml-2 size-4 shrink-0 opacity-60" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end">
        <div className="mb-2 flex gap-2">
          <FormSelect aria-label="Calendar month" value={String(month.getMonth())} onChange={e => setMonth(new Date(month.getFullYear(), Number(e.target.value), 1))}>{Array.from({ length: 12 }, (_, index) => <SelectOption key={index} value={String(index)}>{new Intl.DateTimeFormat("en-PH", { month: "long" }).format(new Date(2026, index, 1))}</SelectOption>)}</FormSelect>
          <FormSelect aria-label="Calendar year" value={String(month.getFullYear())} onChange={e => setMonth(new Date(Number(e.target.value), month.getMonth(), 1))}>{Array.from({ length: 201 }, (_, index) => <SelectOption key={index} value={String(1900 + index)}>{1900 + index}</SelectOption>)}</FormSelect>
        </div>
        <Calendar mode="single" selected={selected} month={month} onMonthChange={setMonth} disabled={isDisabled} onSelect={date => { if (date) { change(dateString(date) + (withTime ? `T${selectedValue.slice(11) || "00:00"}` : "")); if (!withTime) setOpen(false); } }} />
        {withTime && <label className="grid gap-2 text-xs font-medium">Requested time (24-hour)<Input aria-label="Requested time" placeholder="HH:MM" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" maxLength={5} value={selectedValue.slice(11)} onChange={e => { if (selectedValue) change(`${selectedValue.slice(0, 10)}T${e.target.value}`); }} /></label>}
        <Button type="button" size="sm" variant="ghost" className="mt-2 w-full" onClick={() => { change(""); setOpen(false); }}>Clear date</Button>
      </PopoverContent>
    </Popover>
  </>;
}
