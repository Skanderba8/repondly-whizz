"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bike, MessageSquareText, RefreshCw } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { WorkspacePanel } from "@/components/workspace-panel";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useTracker } from "./tracker-provider";
import { TrackerGate } from "./tracker-gate";
import { dateLabel, localDate, shiftDate, type Snapshot } from "./domain";
import { chartBucket, presetRange, type Reporting, type ReportingRange } from "./reporting";
import { History } from "./history";
import { DashboardAnalytics } from "./dashboard-analytics";
import { MonthlyRecords } from "./monthly-records";
import { PeriodPicker } from "./period-picker";

export function PerformancePage({ historyOnly = false }: { historyOnly?: boolean }) {
  const { account, context } = useTracker();
  const name = context?.people.find((person) => person.user_id === account.userId)?.display_name.split(/\s+/)[0];
  return <><PageHeading title={historyOnly ? "Activity" : name ? `Welcome, ${name}` : "Welcome"} description={historyOnly ? "Your records and their source totals." : "Points, bonuses, and estimated earnings."} action={<div className="flex flex-wrap gap-2"><Button asChild><Link href="/reviews/"><MessageSquareText aria-hidden="true" />Reviews</Link></Button><Button variant="delivery" asChild><Link href="/doordash/"><Bike aria-hidden="true" />Add DoorDash</Link></Button></div>} /><TrackerGate><Performance historyOnly={historyOnly} /></TrackerGate></>;
}

export function Performance({ historyOnly, kind }: { historyOnly: boolean; kind?: "review" | "doordash" }) {
  return kind ? <MonthlyRecords kind={kind} /> : <ReportingPerformance historyOnly={historyOnly} />;
}

function ReportingPerformance({ historyOnly }: { historyOnly: boolean }) {
  const { account, context, loadSnapshot, loadReporting, invalidate, version } = useTracker();
  const [owner, setOwner] = useState(account.userId);
  const person = context?.people.find((row) => row.user_id === owner);
  const ownPerson = context?.people.find((row) => row.user_id === account.userId);
  const store = context?.stores.find((row) => row.id === (person?.home_store_id ?? ownPerson?.home_store_id))
    ?? context?.stores.find((row) => row.timezone === "America/New_York") ?? context?.stores[0];
  const today = localDate(store?.timezone ?? "America/New_York");
  const [preset, setPreset] = useState("month");
  const [custom, setCustom] = useState<ReportingRange | null>(null);
  const yesterday = shiftDate(today, -1);
  const range = preset === "custom" && custom ? custom : preset === "yesterday" ? { start: yesterday, end: yesterday } : presetRange(preset === "week" ? "week" : "month", today);
  const { start, end } = range;
  const bucket = chartBucket(range);
  const scopeKey = `${owner}:${start}:${end}`;
  const [pagination, setPagination] = useState({ key: "", page: 0 });
  const page = pagination.key === scopeKey ? pagination.page : 0;
  const key = historyOnly ? `${scopeKey}:${page}:${version}` : `${scopeKey}:${version}`;
  const viewKey = historyOnly ? `${scopeKey}:${page}` : scopeKey;
  const [result, setResult] = useState<{ key: string; viewKey: string; snapshot: Snapshot | null; reporting: Reporting | null } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const memberControl = useRef<HTMLButtonElement>(null);
  const error = failure?.key === key ? failure.message : "";
  const pending = result?.key !== key && failure?.key !== key;
  const visible = result?.viewKey === viewKey ? result : null;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const snapshot = historyOnly ? await loadSnapshot(owner, start, end, page) : null;
        const reporting = historyOnly ? null : await loadReporting(owner, start, end, bucket);
        if (active) setResult({ key, viewKey, snapshot, reporting });
      } catch {
        if (active) setFailure({ key, message: "This period could not be updated. Check your connection and retry." });
      }
    }
    void load();
    return () => { active = false; };
  }, [historyOnly, owner, start, end, page, bucket, key, viewKey, loadSnapshot, loadReporting]);

  const controls = <div className="flex flex-wrap items-center gap-2">
    <SegmentedControl label="Date range" value={preset === "custom" ? "" : preset} onValueChange={setPreset} options={[{ value: "month", label: "This month" }, { value: "week", label: "This week" }, { value: "yesterday", label: "Yesterday" }]} />
    <PeriodPicker range={range} today={today} onSelect={(next) => { setCustom(next); setPreset("custom"); }} />
    {account.role === "manager" ? <div className="w-44"><Select ref={memberControl} aria-label="Viewing" value={owner} onValueChange={setOwner} options={[{ value: "team", label: "Whole team" }, ...(context?.people ?? []).map((row) => ({ value: row.user_id, label: `${row.display_name}${row.user_id === account.userId ? " (you)" : ""}` }))]} /></div> : null}
    <Button variant="ghost" size="icon" aria-label="Refresh reporting" aria-busy={pending} onClick={invalidate}><RefreshCw aria-hidden="true" className={pending ? "animate-spin" : undefined} /></Button>
  </div>;

  if (!historyOnly) return <div className="overview-workspace">
    <section aria-label="Reporting period and scope" className="overview-toolbar">{controls}</section>
    {error ? <div role="alert" className="panel px-4 py-3"><p className="text-sm">{error}{visible ? " Showing the last loaded values for this period." : ""}</p><Button variant="outline" onClick={invalidate} className="mt-2">Retry</Button></div> : null}
    {visible?.reporting ? <DashboardAnalytics data={visible.reporting} owner={owner} accountId={account.userId} onSelect={(next) => { setOwner(next); requestAnimationFrame(() => memberControl.current?.focus()); }} /> : null}
    {!visible && !error ? <p role="status" className="px-4 py-6 text-sm text-muted-foreground">Loading {dateLabel(start)} to {dateLabel(end)}...</p> : null}
    <span role="status" className="sr-only">{pending && visible ? "Updating selected period" : ""}</span>
  </div>;

  return <WorkspacePanel id="history-title" title="Records" action={controls}>
    <div className={historyOnly ? undefined : "overview-panel-content"}>
      {error ? <div role="alert" className="px-4 py-3"><p className="text-sm">{error}{visible ? " Showing the last loaded values for this period." : ""}</p><Button variant="outline" onClick={invalidate} className="mt-2">Retry</Button></div> : null}
      {visible?.snapshot ? <>
        <History records={visible.snapshot.history} showOwner={owner === "team"} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><p className="text-xs text-muted-foreground">Page {page + 1} of {Math.max(1, Math.ceil(visible.snapshot.history_count / 25))}</p><div className="flex gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPagination({ key: scopeKey, page: page - 1 })}>Previous</Button><Button variant="outline" disabled={(page + 1) * 25 >= visible.snapshot.history_count} onClick={() => setPagination({ key: scopeKey, page: page + 1 })}>Next</Button></div></div>
      </> : null}
      {!visible && !error ? <p role="status" className="px-4 py-6 text-sm text-muted-foreground">Loading {dateLabel(start)} to {dateLabel(end)}...</p> : null}
      <span role="status" className="sr-only">{pending && visible ? "Updating selected period" : ""}</span>
    </div>
  </WorkspacePanel>;
}
