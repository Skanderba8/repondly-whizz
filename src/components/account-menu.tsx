"use client";

import { Check, ChevronsUpDown, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useAppearance, type Appearance } from "@/components/appearance-provider";
import { Separator } from "@/components/ui/separator";
import type { WorkspaceAccount } from "@/features/access/access";

const appearances = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function AccountMenu({ account, onSignOut, compact = false }: {
  account: WorkspaceAccount;
  onSignOut: () => Promise<void>;
  compact?: boolean;
}) {
  const { appearance, setAppearance } = useAppearance();
  const role = account.role === "manager" ? "Manager" : "Employee";
  const accountLabel = account.role === "manager" ? "Manager workspace" : account.email;
  const initials = account.role === "manager" ? "M" : account.email.slice(0, 2).toUpperCase() || "W";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="account-trigger" aria-label="Account and appearance">
          <span className="avatar" aria-hidden="true">{initials}</span>
          {!compact ? <><span className="sidebar-label min-w-0 flex-1"><span className="block truncate text-sm font-medium">{accountLabel}</span><span className="block text-xs text-muted-foreground">{role}</span></span><ChevronsUpDown aria-hidden="true" className="sidebar-label size-4 shrink-0 text-muted-foreground" /></> : null}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} collisionPadding={16} className="menu-content">
          <DropdownMenu.Label className="menu-label"><span className="block break-all text-foreground">{accountLabel}</span><span>{role}</span></DropdownMenu.Label>
          <Separator className="my-2" />
          <DropdownMenu.Label className="menu-label">Appearance</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={appearance} onValueChange={(value) => setAppearance(value as Appearance)}>
            {appearances.map(({ value, label, icon: Icon }) => (
              <DropdownMenu.RadioItem key={value} value={value} className="menu-item">
                <Icon aria-hidden="true" className="size-4" />{label}
                <DropdownMenu.ItemIndicator className="ml-auto"><Check aria-hidden="true" className="size-4" /></DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <Separator className="my-2" />
          <DropdownMenu.Group><DropdownMenu.Item className="menu-item" onSelect={() => { void onSignOut(); }}><LogOut aria-hidden="true" className="size-4" />Log out</DropdownMenu.Item></DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
