"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => { window.removeEventListener("online", listener); window.removeEventListener("offline", listener); };
}

export function ConnectionStatus() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return <p role="status" className="shrink-0 rounded-md border bg-muted px-4 py-3 text-sm">You are offline. Displayed results may be out of date. Reconnect to load data or confirm saves. Keep any unconfirmed entry open and retry the same save.</p>;
}
