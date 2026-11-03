"use client";

import { useState } from "react";
import { Popover } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = { value: string; label: string };
export function ScopePicker({ label, options, selected, onChange }: {
  label: string; options: Option[]; selected: string[] | null; onChange: (value: string[] | null) => void;
}) {
  const [search, setSearch] = useState("");
  const shown = options.filter((option) => option.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const selectedLabel = selected?.length === 1 ? options.find((option) => option.value === selected[0])?.label ?? "1 selected" : selected ? `${selected.length} selected` : `All ${label.toLowerCase()}`;
  function toggle(value: string) {
    const next = selected?.includes(value) ? selected.filter((item) => item !== value) : [...(selected ?? []), value];
    onChange(next.length ? next : null);
  }
  return <Popover.Root onOpenChange={(open) => { if (!open) setSearch(""); }}>
    <Popover.Trigger asChild><Button variant="outline" className="max-w-full justify-between"><span className="text-muted-foreground">{label}</span><span className="max-w-40 truncate">{selectedLabel}</span><ChevronDown aria-hidden="true" className="size-4" /></Button></Popover.Trigger>
    <Popover.Portal><Popover.Content align="start" sideOffset={8} collisionPadding={12} aria-label={`Select ${label.toLowerCase()}`} className="calendar-popover w-80">
      <Input aria-label={`Find ${label.toLowerCase()}`} placeholder={`Find ${label.toLowerCase()}...`} value={search} onChange={(event) => setSearch(event.target.value)} />
      <Button variant={selected === null ? "secondary" : "ghost"} className="mt-2 w-full justify-start" aria-pressed={selected === null} onClick={() => onChange(null)}>All {label.toLowerCase()}</Button>
      <div className="mt-1 max-h-72 overflow-y-auto overscroll-contain">{shown.map((option) => <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"><input type="checkbox" className="size-4 shrink-0 accent-link" checked={selected?.includes(option.value) ?? false} onChange={() => toggle(option.value)} /><span>{option.label}</span></label>)}{!shown.length ? <p className="p-3 text-sm text-muted-foreground">No matches.</p> : null}</div>
      <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">Choose one or more, or use All.</p>
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
