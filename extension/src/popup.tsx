import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, LogOut, Moon, Sun } from "lucide-react";
import { z } from "zod";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/components/appearance-provider";
import { PageHeading } from "@/components/page-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { LoginForm } from "@/features/access/login-form";
import { accessRoleSchema, type WorkspaceAccount } from "@/features/access/access";
import { getSupabaseClient } from "@/lib/supabase/client";
import { contextSchema, type TrackerContext, type Snapshot, snapshotSchema, localDate, periodRange, money, dateLabel } from "@/features/tracker/domain";
import { clearDrafts, readDraft, type Kind } from "./drafts";
import { QuickEntry } from "./quick-entry";

type Access = { status: "loading" | "signed-out" | "error" | "denied"; message?: string }
  | { status: "ready"; account: WorkspaceAccount; context: TrackerContext | null };
const appUrl = "https://whizz.repondly.com";

export function Popup() {
  const [access, setAccess] = useState<Access>({ status: "loading" });
  const [revision, setRevision] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const { appearance, setAppearance } = useAppearance();

  useEffect(() => {
    let disposed = false;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const client = getSupabaseClient();
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const request = ++generation;
      clearTimeout(timer);
      setAccess(session ? { status: "loading" } : { status: "signed-out" });
      if (!session) return;
      timer = setTimeout(() => {
        void (async () => {
          try {
            const identity = await client.auth.getUser();
            if (identity.error || identity.data.user?.id !== session.user.id) throw new Error("Sign-in could not be verified. Retry or sign in again.");
            const membership = await client.from("workspace_members").select("role").eq("user_id", session.user.id).maybeSingle();
            if (membership.error) throw new Error("Access could not be loaded. Check your connection and retry.");
            const role = accessRoleSchema.safeParse(membership.data?.role);
            if (!role.success) { if (!disposed && request === generation) setAccess({ status: "denied" }); return; }
            let context: TrackerContext | null = null;
            if (role.data === "employee") {
              const result = await client.rpc("tracker_context");
              if (result.error) throw new Error("Tracker setup could not be loaded. Retry or contact your workspace owner.");
              context = contextSchema.parse(result.data);
              if (!context.people.some((person) => person.user_id === session.user.id) || !context.stores.length) throw new Error("Your tracker profile and stores need owner setup before you can add entries.");
            }
            if (!disposed && request === generation) setAccess({ status: "ready", account: { userId: session.user.id, email: session.user.email ?? "", role: role.data }, context });
          } catch (reason) {
            if (!disposed && request === generation) setAccess({ status: "error", message: reason instanceof Error ? reason.message : "Unable to connect. Retry." });
          }
        })();
      }, 0);
    });
    return () => { disposed = true; generation++; clearTimeout(timer); data.subscription.unsubscribe(); };
  }, [revision]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true); setError("");
    try {
      const client = getSupabaseClient();
      const session = await client.auth.getSession();
      const owner = session.data.session?.user.id;
      if (owner) {
        const drafts = await Promise.all([readDraft(owner, "review"), readDraft(owner, "doordash")]);
        if (drafts.some((draft) => draft && ["saving", "uncertain"].includes(draft.status))) throw new Error("Finish or retry your pending save before signing out. Its details are kept in the entry tab.");
        await clearDrafts(owner);
      }
      const result = await client.auth.signOut({ scope: "local" });
      if (result.error) throw new Error("Sign-out failed. Please retry.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sign out."); }
    finally { setSigningOut(false); }
  }

  return <div className="popup-shell">
    <header className="popup-header"><Brand /><div className="flex items-center gap-1">
      <Button size="icon" variant="ghost" aria-label={appearance === "dark" ? "Use light appearance" : "Use dark appearance"} onClick={() => setAppearance(appearance === "dark" ? "light" : "dark")}>{appearance === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</Button>
      <Button variant="ghost" asChild><a href={appUrl} target="_blank" rel="noreferrer">Open app<ArrowUpRight aria-hidden="true" /></a></Button>
      {access.status === "ready" && access.account.role === "employee" ? <Button size="icon" variant="ghost" aria-label="Sign out" title={`Sign out ${access.account.email}`} disabled={signingOut} onClick={() => void signOut()}><LogOut aria-hidden="true" /></Button> : null}
    </div></header>
    {access.status === "signed-out" ? <LoginForm compact /> : access.status === "ready" ? <>
      {access.account.role === "employee" && access.context ? <EmployeePopup key={access.account.userId} account={access.account} context={access.context} /> : <main className="popup-main"><PageHeading title="Manager workspace" description="Open the app to review your team's activity and performance." /><Button asChild><a href={appUrl} target="_blank" rel="noreferrer">Open team overview<ArrowUpRight aria-hidden="true" /></a></Button></main>}
      {access.account.role !== "employee" ? <footer className="popup-footer"><span className="min-w-0 truncate text-xs text-muted-foreground" title={access.account.email}>{access.account.email}</span><Button size="sm" variant="ghost" disabled={signingOut} onClick={() => void signOut()}><LogOut aria-hidden="true" />{signingOut ? "Signing out..." : "Sign out"}</Button></footer> : null}
    </> : <main className="popup-main" aria-busy={access.status === "loading"}>
      {access.status === "loading" ? <div className="flex flex-col gap-4" role="status"><p className="text-sm text-muted-foreground">Opening your workspace...</p><div className="h-20 rounded-lg bg-muted motion-safe:animate-pulse" /><div className="h-44 rounded-lg bg-muted motion-safe:animate-pulse" /></div> : <><PageHeading title={access.status === "denied" ? "Workspace access needed" : "Unable to open workspace"} description={access.status === "denied" ? "Contact your workspace owner to restore access." : access.message ?? "Check your connection and retry."} /><div className="flex gap-2"><Button onClick={() => setRevision((value) => value + 1)}>Retry</Button><Button variant="ghost" disabled={signingOut} onClick={() => void signOut()}>Sign out</Button></div></>}
    </main>}
    {error ? <p role="alert" className="mx-4 mb-4 rounded-md bg-error-background p-3 text-sm text-error-foreground">{error}</p> : null}
  </div>;
}

function EmployeePopup({ account, context }: { account: WorkspaceAccount; context: TrackerContext }) {
  const [kind, setKind] = useState<Kind>(() => {
    try { return localStorage.getItem(`whizz-popup-tab:${account.userId}`) === "doordash" ? "doordash" : "review"; } catch { return "review"; }
  });
  const [revision, setRevision] = useState(0);
  const [total, setTotal] = useState<Snapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const person = context.people.find((row) => row.user_id === account.userId);
  const home = context.stores.find((row) => row.id === person?.home_store_id) ?? context.stores.find((row) => row.timezone === "America/New_York") ?? context.stores[0];
  const today = localDate(home.timezone);
  const { start, end } = periodRange(today, "month");
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    function receive(raw: unknown, sender: { id?: string }): undefined {
      const message = z.object({ type: z.literal("saved"), owner: z.uuid() }).safeParse(raw);
      if (sender.id === chrome.runtime.id && message.success && message.data.owner === account.userId) setRevision((value) => value + 1);
      return undefined;
    }
    chrome.runtime.onMessage.addListener(receive);
    return () => chrome.runtime.onMessage.removeListener(receive);
  }, [account.userId]);
  useEffect(() => {
    let active = true;
    void getSupabaseClient().rpc("tracker_snapshot", { p_owner: account.userId, p_start: start, p_end: end, p_page: 0, p_kind: null }).then((result) => {
      if (result.error) throw result.error;
      const parsed = snapshotSchema.parse(result.data);
      if (active) { setTotal(parsed); setFailed(false); }
    }).catch(() => { if (active) { setTotal(null); setFailed(true); } });
    return () => { active = false; };
  }, [account.userId, start, end, revision]);
  function changeKind(value: string) {
    const parsed = z.enum(["review", "doordash"]).parse(value);
    setKind(parsed);
    try { localStorage.setItem(`whizz-popup-tab:${account.userId}`, parsed); } catch { /* The current popup stays usable. */ }
  }
  return <main id="main-content" className="popup-main" data-entry="true">
    <h1 className="sr-only">{kind === "review" ? "Add review" : "Add DoorDash subscription"}</h1>
    <section className="popup-totals" aria-label={`Your totals, ${dateLabel(start)} to ${dateLabel(end)}, ${home.timezone}`}>
      <div className="flex items-center gap-2"><span>This month · {new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${start}T12:00:00Z`))}</span>{failed ? <Button size="xs" variant="ghost" onClick={() => setRevision((value) => value + 1)}>Retry</Button> : null}</div>
      <div className="flex items-center justify-between gap-3"><span>Reviews <span className="tabular-nums">{total ? <>{total.review_count.toLocaleString()} · {money(total.review_cents / 100)}</> : failed ? "Unavailable" : "Loading..."}</span></span><span>DoorDash <span className="tabular-nums">{total ? <>{total.doordash_count.toLocaleString()} · {money(total.doordash_cents / 100)}</> : failed ? "Unavailable" : "Loading..."}</span></span></div>
    </section>
    <SegmentedControl label="Entry type" value={kind} onValueChange={changeKind} options={[{ value: "review", label: "Review" }, { value: "doordash", label: "DoorDash" }]} className="w-full [&>button]:flex-1" />
    <QuickEntry key={kind} kind={kind} account={account} context={context} defaultStore={person?.home_store_id ?? ""} onSaved={() => { if (mounted.current) setRevision((value) => value + 1); }} />
  </main>;
}
