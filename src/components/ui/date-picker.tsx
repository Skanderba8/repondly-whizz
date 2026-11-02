"use client";

import { useRef, useState, type ComponentProps, type KeyboardEvent } from "react";
import { Popover } from "radix-ui";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Select } from "./select";
import { cn } from "@/lib/utils";

type DatePickerProps = Omit<ComponentProps<typeof Input>, "type" | "value" | "defaultValue" | "onChange" | "min" | "max"> & {
  value: string;
  onValueChange: (value: string) => void;
  today: string;
  label: string;
  min?: string;
  max?: string;
};
const months = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1).padStart(2, "0"), label: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, index, 1))) }));
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function shiftDay(date: string, days: number) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
function shiftMonth(month: string, amount: number) {
  const result = new Date(`${month}-01T12:00:00Z`);
  result.setUTCMonth(result.getUTCMonth() + amount);
  return result.toISOString().slice(0, 7);
}

export function DatePicker({ value, onValueChange, today, label, min, max, disabled, required, className, ...props }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((value || today).slice(0, 7));
  const [focused, setFocused] = useState(value || today);
  const dayRef = useRef<HTMLButtonElement>(null);
  const first = `${month}-01`;
  const gridStart = shiftDay(first, -new Date(`${first}T12:00:00Z`).getUTCDay());
  const days = Array.from({ length: 42 }, (_, index) => shiftDay(gridStart, index));
  const year = Number(month.slice(0, 4));
  const currentYear = Number(today.slice(0, 4));
  const years = Array.from(new Set([...Array.from({ length: 26 }, (_, index) => currentYear - 20 + index), year])).sort((a, b) => a - b).map((item) => ({ value: String(item).padStart(4, "0"), label: String(item) }));
  const unavailable = (date: string) => Boolean((min && date < min) || (max && date > max));

  function changeOpen(next: boolean) {
    if (next) { setMonth((value || today).slice(0, 7)); setFocused(value || today); }
    setOpen(next);
  }
  function choose(date: string) {
    if (unavailable(date)) return;
    onValueChange(date); setOpen(false);
  }
  function moveMonth(next: string) { setMonth(next); setFocused(`${next}-01`); }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
    let next: string;
    if (event.key === "PageUp" || event.key === "PageDown") next = `${shiftMonth(date.slice(0, 7), event.key === "PageUp" ? -1 : 1)}-01`;
    else if (event.key in offsets) next = shiftDay(date, offsets[event.key]);
    else return;
    event.preventDefault();
    if (unavailable(next)) return;
    setFocused(next); setMonth(next.slice(0, 7));
    requestAnimationFrame(() => dayRef.current?.focus());
  }

  return <Popover.Root open={open} onOpenChange={changeOpen}>
    <div className="relative w-full min-w-0">
      <Input {...props} type="date" value={value} min={min} max={max} disabled={disabled} required={required} onChange={(event) => onValueChange(event.target.value)} className={cn("date-input min-h-13 pr-14 text-base md:text-base", className)} />
      <Popover.Trigger asChild><Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`Open calendar for ${label}`} className="absolute top-1 right-1"><CalendarDays aria-hidden="true" /></Button></Popover.Trigger>
    </div>
    <Popover.Portal><Popover.Content align="start" sideOffset={8} collisionPadding={8} aria-label={`Choose ${label.toLowerCase()}`} className="calendar-popover" onOpenAutoFocus={(event) => { event.preventDefault(); requestAnimationFrame(() => dayRef.current?.focus()); }}>
      <div className="mb-3 flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label="Previous month" onClick={() => moveMonth(shiftMonth(month, -1))}><ChevronLeft aria-hidden="true" /></Button>
        <div className="min-w-0 flex-1"><Select aria-label="Calendar month" value={month.slice(5, 7)} onValueChange={(next) => moveMonth(`${month.slice(0, 4)}-${next}`)} options={months} /></div>
        <div className="w-24 shrink-0"><Select aria-label="Calendar year" value={month.slice(0, 4)} onValueChange={(next) => moveMonth(`${next}-${month.slice(5, 7)}`)} options={years} /></div>
        <Button type="button" variant="ghost" size="icon" aria-label="Next month" onClick={() => moveMonth(shiftMonth(month, 1))}><ChevronRight aria-hidden="true" /></Button>
      </div>
      <div role="grid" aria-label={`${months.find((item) => item.value === month.slice(5, 7))?.label} ${year}`}>
        <div role="row" className="grid grid-cols-7">{weekdays.map((day) => <span key={day} role="columnheader" aria-label={day} className="py-2 text-center text-xs text-muted-foreground">{day.slice(0, 2)}</span>)}</div>
        {Array.from({ length: 6 }, (_, week) => <div role="row" key={week} className="grid grid-cols-7">{days.slice(week * 7, week * 7 + 7).map((day) => <button key={day} ref={day === focused ? dayRef : undefined} type="button" role="gridcell" tabIndex={day === focused ? 0 : -1} aria-selected={day === value} aria-current={day === today ? "date" : undefined} aria-label={new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))} disabled={unavailable(day)} data-outside={day.slice(0, 7) !== month} className="calendar-day" onFocus={() => setFocused(day)} onKeyDown={(event) => navigate(event, day)} onClick={() => choose(day)}>{Number(day.slice(8))}</button>)}</div>)}
      </div>
      <div className="mt-3 flex items-center gap-2 border-t pt-3">
        <Button type="button" variant="secondary" disabled={unavailable(today)} onClick={() => choose(today)}>Today</Button>
        <Button type="button" variant="ghost" disabled={unavailable(shiftDay(today, -1))} onClick={() => choose(shiftDay(today, -1))}>Yesterday</Button>
        {!required ? <Button type="button" variant="ghost" className="ml-auto" onClick={() => { onValueChange(""); setOpen(false); }}>Clear</Button> : null}
      </div>
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
