"use client";

import { Button } from "@/components/ui/button";
import { useTracker } from "./tracker-provider";

export function TrackerGate({ children }: { children: React.ReactNode }) {
  const { context, error, reload, account } = useTracker();
  if (error) return <div role="alert" className="panel p-6"><p className="text-sm">{error}</p><Button className="mt-4" variant="outline" onClick={reload}>Retry</Button></div>;
  if (!context) return <p role="status" className="text-sm text-muted-foreground">Loading tracker...</p>;
  const missingProfile = !context.people.some((person) => person.user_id === account.userId);
  const missingStores = context.stores.length === 0;
  if (missingProfile || missingStores) {
    return <div className="panel p-6">
      <h2 className="section-title">Tracker setup needed</h2>
      {missingProfile ? <p className="mt-2 text-sm text-muted-foreground">No tracker profile is visible for your signed-in account. Its user ID must match the profile configured in Supabase.</p> : null}
      {missingStores ? <p className="mt-2 text-sm text-muted-foreground">No configured stores are visible to your account. The owner needs to configure stores and workspace access in Supabase.</p> : null}
      <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-muted-foreground">Signed-in email</dt><dd className="break-all">{account.email}</dd></div><div><dt className="text-muted-foreground">Signed-in user ID</dt><dd className="break-all font-mono text-xs">{account.userId}</dd></div></dl>
      <Button className="mt-5" variant="outline" onClick={reload}>Reload setup</Button>
    </div>;
  }
  return children;
}
