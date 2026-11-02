"use client";

import type { ComponentProps } from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectOption = { value: string; label: string; disabled?: boolean };
type SelectProps = Omit<ComponentProps<typeof SelectPrimitive.Trigger>, "children" | "onChange" | "value" | "defaultValue"> & {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  name?: string;
  required?: boolean;
};

export function Select({ value, onValueChange, options, placeholder = "Choose an option", name, required, disabled, className, ...props }: SelectProps) {
  return <SelectPrimitive.Root value={value} onValueChange={onValueChange} name={name} required={required} disabled={disabled}>
    <SelectPrimitive.Trigger className={cn("form-control flex items-center justify-between gap-3 text-left", className)} {...props}>
      <span className="min-w-0 truncate"><SelectPrimitive.Value placeholder={placeholder} /></span>
      <SelectPrimitive.Icon asChild><ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal><SelectPrimitive.Content position="popper" sideOffset={6} collisionPadding={12} className="select-content">
      <SelectPrimitive.ScrollUpButton className="select-scroll"><ChevronUp aria-hidden="true" className="size-4" /></SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport className="p-1"><SelectPrimitive.Group>
        {options.map((option) => <SelectPrimitive.Item key={option.value} value={option.value} disabled={option.disabled} className="select-item">
          <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
          <SelectPrimitive.ItemIndicator className="ml-auto"><Check aria-hidden="true" className="size-4" /></SelectPrimitive.ItemIndicator>
        </SelectPrimitive.Item>)}
      </SelectPrimitive.Group></SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="select-scroll"><ChevronDown aria-hidden="true" className="size-4" /></SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content></SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
}
