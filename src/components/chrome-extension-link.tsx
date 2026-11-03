"use client";

import { Puzzle } from "lucide-react";
import { Tooltip } from "radix-ui";
import { getChromeWebStoreUrl } from "@/lib/chrome-extension";

export function ChromeExtensionLink({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const storeUrl = getChromeWebStoreUrl();
  return <Tooltip.Provider delayDuration={400}><Tooltip.Root>
    <Tooltip.Trigger asChild><a href={storeUrl ?? "/extension/"} target={storeUrl ? "_blank" : undefined} rel={storeUrl ? "noopener noreferrer" : undefined} onClick={onNavigate} className="nav-link" aria-label={storeUrl ? "Add extension, opens Chrome Web Store in a new tab" : "Add extension"}><Puzzle aria-hidden="true" className="size-5 shrink-0" /><span className="sidebar-label">Add extension</span></a></Tooltip.Trigger>
    {collapsed ? <Tooltip.Portal><Tooltip.Content side="right" sideOffset={12} className="nav-tooltip">Add extension</Tooltip.Content></Tooltip.Portal> : null}
  </Tooltip.Root></Tooltip.Provider>;
}
