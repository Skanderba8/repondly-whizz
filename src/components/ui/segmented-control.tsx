"use client";

import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/utils";

export function SegmentedControl({ label, value, onValueChange, options, className }: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return <ToggleGroup.Root type="single" aria-label={label} value={value} onValueChange={(next) => { if (next) onValueChange(next); }} className={cn("segmented-control", className)}>
    {options.map((option) => <ToggleGroup.Item key={option.value} value={option.value} className="segmented-item">{option.label}</ToggleGroup.Item>)}
  </ToggleGroup.Root>;
}
