"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, MessageSquareText, Bike, Users } from "lucide-react";
import { Tooltip } from "radix-ui";
import { cn } from "@/lib/utils";
import type { AccessRole } from "@/features/access/access";

const items = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/reviews/", label: "Reviews", icon: MessageSquareText },
  { href: "/doordash/", label: "DoorDash", icon: Bike },
  { href: "/activity/", label: "Activity", icon: ListChecks },
];

const managerItems = [
  { href: "/", label: "Team overview", icon: LayoutDashboard },
  { href: "/people/", label: "Employees", icon: Users },
  { href: "/reviews/", label: "All reviews", icon: MessageSquareText },
  { href: "/doordash/", label: "All DoorDash", icon: Bike },
  { href: "/activity/", label: "Team activity", icon: ListChecks },
];

export function WorkspaceNav({ role = "employee", collapsed = false, onNavigate }: { role?: AccessRole; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspace" className="flex flex-col gap-1">
      <Tooltip.Provider delayDuration={400}>
        {(role === "manager" ? managerItems : items).map(({ href, label, icon: Icon }) => {
          const active = pathname.replace(/\/$/, "") === href.replace(/\/$/, "");
          return (
            <Tooltip.Root key={href}>
              <Tooltip.Trigger asChild>
                <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} onClick={onNavigate} className={cn("nav-link", active && "nav-link-active")}>
                  <Icon aria-hidden="true" className="size-5 shrink-0" /><span className="sidebar-label">{label}</span>
                </Link>
              </Tooltip.Trigger>
              {collapsed ? <Tooltip.Portal><Tooltip.Content side="right" sideOffset={12} className="nav-tooltip">{label}</Tooltip.Content></Tooltip.Portal> : null}
            </Tooltip.Root>
          );
        })}
      </Tooltip.Provider>
    </nav>
  );
}
