"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/activity/", label: "Activity", icon: ListFilter },
];

export function WorkspaceNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspace" className="flex gap-2 md:flex-col">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.replace(/\/$/, "") === href.replace(/\/$/, "");
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={cn("nav-link", active && "nav-link-active")}>
            <Icon aria-hidden="true" className="size-4" />{label}
          </Link>
        );
      })}
    </nav>
  );
}
