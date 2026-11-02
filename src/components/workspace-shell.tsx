import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { WorkspaceNav } from "@/components/workspace-nav";
import { Button } from "@/components/ui/button";
import type { WorkspaceAccount } from "@/features/access/access";

export function WorkspaceShell({ children, account, onSignOut }: {
  children: React.ReactNode;
  account: WorkspaceAccount;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="min-h-svh md:grid md:grid-cols-[240px_1fr]">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <aside className="workspace-sidebar">
        <Link href="/" aria-label="Whizz Repondly home" className="brand">
          <span className="brand-mark" aria-hidden="true">w<span>.</span></span>
          <span>whizz<span className="block text-xs font-normal tracking-wide text-muted-foreground">by repondly</span></span>
        </Link>
        <div className="flex flex-col gap-4 md:mt-14">
          <p className="eyebrow hidden md:block">Workspace</p>
          <WorkspaceNav />
        </div>
        <div className="mt-auto hidden border-t border-border pt-6 md:block">
          <p className="text-sm font-medium">Room to do your best.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">A focused space for your team's everyday progress.</p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5 lg:px-12">
          <div className="min-w-0"><p className="break-all text-sm">{account.email}</p><p className="mt-1 text-xs text-muted-foreground">{account.role === "manager" ? "Manager" : "Employee"}</p></div>
          <Button variant="outline" onClick={onSignOut} className="min-h-11">Log out</Button>
          <span className="flex items-center gap-2 text-xs font-medium"><ArrowUpRight aria-hidden="true" className="size-4" />Early preview</span>
        </header>
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-6 py-10 outline-none lg:px-12 lg:py-16">
          {children}
        </main>
        <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground lg:px-12">Whizz Repondly · Built around your work.</footer>
      </div>
    </div>
  );
}
