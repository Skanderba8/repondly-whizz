"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Brand } from "@/components/brand";
import { AccountMenu } from "@/components/account-menu";
import { WorkspaceNav } from "@/components/workspace-nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { WorkspaceAccount } from "@/features/access/access";

const sidebarKey = "whizz-sidebar-v1";

export function WorkspaceShell({ children, account, onSignOut }: {
  children: React.ReactNode;
  account: WorkspaceAccount;
  onSignOut: () => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const destinations: Record<string, string> = { "": "Overview", "/activity": "Activity", "/reviews": "Reviews", "/doordash": "DoorDash" };
  const managerDestinations: Record<string, string> = { "": "Team overview", "/people": "Employees", "/reviews": "All reviews", "/doordash": "All DoorDash", "/activity": "Team activity" };
  const context = (account.role === "manager" ? managerDestinations : destinations)[pathname.replace(/\/$/, "")] ?? "Workspace";

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    function containSidebarScroll(event: WheelEvent) {
      if (event.ctrlKey || event.defaultPrevented) return;
      const navigation = navigationRef.current;
      const insideNavigation = navigation && event.target instanceof Node && navigation.contains(event.target);
      const canScroll = insideNavigation && (
        event.deltaY < 0 ? navigation.scrollTop > 0
          : event.deltaY > 0 && navigation.scrollTop + navigation.clientHeight < navigation.scrollHeight - 1
      );
      if (!canScroll) event.preventDefault();
    }
    sidebar.addEventListener("wheel", containSidebarScroll, { passive: false });
    return () => sidebar.removeEventListener("wheel", containSidebarScroll);
  }, []);

  useEffect(() => {
    const tablet = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const desktop = window.matchMedia("(min-width: 768px)");
    function adaptNavigation() {
      let saved: string | null = null;
      try { saved = localStorage.getItem(sidebarKey); } catch { /* Navigation remains usable without storage. */ }
      setCollapsed(tablet.matches || saved === "collapsed");
      setMobileOpen(false);
    }
    adaptNavigation();
    tablet.addEventListener("change", adaptNavigation);
    desktop.addEventListener("change", adaptNavigation);
    return () => {
      tablet.removeEventListener("change", adaptNavigation);
      desktop.removeEventListener("change", adaptNavigation);
    };
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(sidebarKey, next ? "collapsed" : "expanded"); } catch { /* Keep the preference for this visit. */ }
  }

  return (
    <div className="workspace-layout min-h-svh" data-collapsed={collapsed} data-overview={pathname === "/"} data-compact={account.role === "manager" || ["", "/reviews", "/doordash"].includes(pathname.replace(/\/$/, ""))}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <aside ref={sidebarRef} className="workspace-sidebar" aria-label="Workspace sidebar">
        <div className="flex min-h-8 shrink-0 items-center justify-between gap-1 px-1">
          <Link href="/" aria-label="Whizz Repondly home" className="sidebar-brand"><Brand /></Link>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} aria-controls="desktop-navigation">
            {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </Button>
        </div>
        <div ref={navigationRef} id="desktop-navigation" className="workspace-sidebar-navigation mt-6"><WorkspaceNav role={account.role} collapsed={collapsed} /></div>
        <div className="shrink-0 pt-4"><Separator className="mb-4" /><AccountMenu account={account} onSignOut={onSignOut} /></div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger asChild><Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation"><Menu aria-hidden="true" /></Button></Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="sheet-overlay" />
                <Dialog.Content className="sheet-content" aria-describedby={undefined}>
                  <div className="flex shrink-0 items-center justify-between gap-3 px-1">
                    <Dialog.Title><Brand /></Dialog.Title>
                    <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close navigation"><X aria-hidden="true" /></Button></Dialog.Close>
                  </div>
                  <div className="workspace-sidebar-navigation mt-6"><WorkspaceNav role={account.role} onNavigate={() => setMobileOpen(false)} /></div>
                  <div className="shrink-0 pt-4"><Separator className="mb-4" /><p className="break-all px-3 text-sm">{account.role === "manager" ? "Manager workspace" : account.email}</p><p className="px-3 text-xs text-muted-foreground">{account.role === "manager" ? "Manager" : "Employee"}</p></div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <p className="flex items-center gap-3 text-sm"><span className="hidden text-muted-foreground sm:inline">Workspace</span><span aria-hidden="true" className="hidden text-subtle-foreground sm:inline">/</span><span className="font-medium">{context}</span></p>
          </div>
          <div className="flex items-center gap-4"><span className="hidden text-xs text-muted-foreground sm:inline">{account.role === "manager" ? "Team performance" : "Personal bonus tracker"}</span><div className="md:hidden"><AccountMenu account={account} onSignOut={onSignOut} compact /></div></div>
        </header>
        <main id="main-content" tabIndex={-1} className="workspace-content">{children}</main>
        <footer className="mx-auto max-w-[1440px] px-4 pt-2 pb-8 text-xs text-muted-foreground md:px-6 xl:px-8">Whizz Repondly <span aria-hidden="true">·</span> Personal bonus tracker</footer>
      </div>
    </div>
  );
}

