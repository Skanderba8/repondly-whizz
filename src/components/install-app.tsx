"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Popover } from "radix-ui";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function subscribeDisplayMode(listener: () => void) {
  const mode = window.matchMedia("(display-mode: standalone)");
  mode.addEventListener("change", listener);
  window.addEventListener("appinstalled", listener);
  return () => { mode.removeEventListener("change", listener); window.removeEventListener("appinstalled", listener); };
}
function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && navigator.standalone === true);
}

export function InstallApp() {
  const installed = useSyncExternalStore(subscribeDisplayMode, isInstalled, () => false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    function capture(event: Event) {
      if (!("prompt" in event) || typeof event.prompt !== "function" || !("userChoice" in event)) return;
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    }
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  async function install() {
    if (!prompt || busy) return;
    setBusy(true); setMessage("");
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(choice.outcome === "accepted" ? "Installation requested. Follow your browser's confirmation." : "You can install later from your browser menu.");
    } catch { setMessage("Use your browser menu to add Repondly to your home screen."); }
    finally { setPrompt(null); setBusy(false); }
  }

  if (installed) return null;
  return <Popover.Root><Popover.Trigger asChild><button type="button" className="nav-link w-full" aria-label="Install Repondly app" title="Install Repondly app"><Download aria-hidden="true" className="size-5 shrink-0" /><span className="sidebar-label">Install app</span></button></Popover.Trigger>
    <Popover.Portal><Popover.Content side="top" align="start" sideOffset={8} collisionPadding={12} className="calendar-popover w-80" aria-label="Install Repondly">
      <h2 className="section-title">Install Repondly</h2>
      <p className="mt-2 text-sm text-muted-foreground">Open the same workspace from your home screen. Sign in with your existing account.</p>
      <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm"><li><strong>iPhone or iPad:</strong> Open this site in Safari, tap Share, then Add to Home Screen. Keep Open as Web App enabled if shown, then tap Add.</li><li><strong>Android:</strong> Open this site in Chrome, open its menu, then choose Install app or Add to Home screen.</li></ol>
      <p className="mt-3 text-xs text-muted-foreground">An internet connection is required to load data and confirm saves. Keep an unconfirmed save open and retry the same entry.</p>
      {prompt ? <Button className="mt-4" disabled={busy} onClick={() => void install()}>{busy ? "Opening installation..." : "Install app"}</Button> : null}
      {message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
