"use client";

import { useState } from "react";
import { Popover } from "radix-ui";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { dateLabel, periodRange, shiftDate } from "./domain";
import type { ReportingRange } from "./reporting";

const monthNames = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, index, 1))));

export function PeriodPicker({ range, today, onSelect }: {
  range: ReportingRange;
  today: string;
  onSelect: (range: ReportingRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("month");
  const [month, setMonth] = useState(range.start.slice(0, 7));
  const year = Number(month.slice(0, 4));
  const currentYear = Number(today.slice(0, 4));
  const years = Array.from(new Set([year, ...Array.from({ length: 12 }, (_, index) => currentYear - 10 + index)])).sort((a, b) => b - a);
  const gridStart = periodRange(`${month}-01`, "week").start;
  const label = `${dateLabel(range.start)} to ${dateLabel(range.end)}`;

  function choose(next: ReportingRange) { onSelect(next); setOpen(false); }
  function moveMonth(amount: number) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + amount);
    setMonth(date.toISOString().slice(0, 7));
  }

  return <Popover.Root open={open} onOpenChange={(next) => { if (next) setMonth(range.start.slice(0, 7)); setOpen(next); }}>
    <Popover.Trigger asChild><Button variant="outline" aria-label={`Choose reporting month or week, ${label}`} className="w-[332px] max-w-full justify-start"><CalendarDays aria-hidden="true" /><span className="flex min-w-0 flex-1 items-center justify-between gap-3 text-xs tabular-nums sm:text-sm"><span className="flex items-center gap-1.5"><span className="text-xs text-muted-foreground">From</span>{dateLabel(range.start)}</span><span className="flex items-center gap-1.5"><span className="text-xs text-muted-foreground">To</span>{dateLabel(range.end)}</span></span></Button></Popover.Trigger>
    <Popover.Portal><Popover.Content align="end" sideOffset={8} collisionPadding={8} aria-label="Choose reporting period" className="calendar-popover w-80">
      <div className="mb-3 flex items-center justify-between gap-2">
        <SegmentedControl label="Select a month or week" value={mode} onValueChange={setMode} options={[{ value: "month", label: "Month" }, { value: "week", label: "Week" }]} />
        <div className="w-24"><Select aria-label="Period year" value={String(year)} onValueChange={(next) => setMonth(`${next}-${month.slice(5)}`)} options={years.map((value) => ({ value: String(value), label: String(value) }))} /></div>
      </div>
      {mode === "month" ? <div role="group" aria-label="Months, scroll to choose" tabIndex={0} className="max-h-60 overflow-y-auto overscroll-contain pr-1">
        {monthNames.map((name, index) => {
          const first = `${year}-${String(index + 1).padStart(2, "0")}-01`;
          const selected = range.start === first && range.end === periodRange(first, "month").end;
          return <Button key={name} variant={selected ? "secondary" : "ghost"} className="w-full justify-start" aria-pressed={selected} onClick={() => choose(periodRange(first, "month"))}>{name} {year}</Button>;
        })}
      </div> : <>
        <div className="mb-2 flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft aria-hidden="true" /></Button>
          <span className="text-sm font-medium">{monthNames[Number(month.slice(5)) - 1]} {year}</span>
          <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight aria-hidden="true" /></Button>
        </div>
        <div aria-hidden="true" className="grid grid-cols-7 text-center text-xs text-muted-foreground">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} className="py-2">{day}</span>)}</div>
        <div role="group" aria-label="Choose a calendar week" className="max-h-60 overflow-y-auto overscroll-contain">
          {Array.from({ length: 6 }, (_, index) => {
            const start = shiftDate(gridStart, index * 7);
            const end = shiftDate(start, 6);
            const selected = range.start === start && range.end === end;
            return <Button key={start} variant={selected ? "secondary" : "ghost"} className="grid w-full grid-cols-7 gap-0 px-0" aria-pressed={selected} aria-label={`Week ${dateLabel(start)} to ${dateLabel(end)}`} onClick={() => choose({ start, end })}>{Array.from({ length: 7 }, (_, day) => {
              const date = shiftDate(start, day);
              return <span key={date} className={date.slice(0, 7) === month ? "tabular-nums" : "tabular-nums text-muted-foreground"}>{Number(date.slice(8))}</span>;
            })}</Button>;
          })}
        </div>
      </>}
      <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">{mode === "month" ? "Select a full calendar month." : "Select a row for the full Sunday to Saturday week."}</p>
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
