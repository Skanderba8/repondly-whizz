import { LockKeyhole } from "lucide-react";
import { Brand } from "@/components/brand";

export function AccessFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="access-layout">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="access-header"><Brand /><span className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole aria-hidden="true" className="size-4" /><span className="hidden sm:inline">Private workspace</span></span></header>
      <main id="main-content" tabIndex={-1} className="access-main outline-none">{children}</main>
      <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">Whizz Repondly <span aria-hidden="true">·</span> Support performance</footer>
    </div>
  );
}
