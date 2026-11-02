"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { WorkspacePanel } from "@/components/workspace-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useTracker } from "./tracker-provider";
import { TrackerGate } from "./tracker-gate";
import { dateLabel, localDate, money, periodRange, type Period, type Snapshot } from "./domain";
import { History } from "./history";
import { PointsChart } from "./points-chart";

export function PerformancePage({ historyOnly = false }: { historyOnly?: boolean }) {
  return <><PageHeading title={historyOnly ? "Activity" : "Overview"} description={historyOnly ? "The records behind your points and bonus." : "Reported points and your separate bonus earnings."} action={<div className="flex gap-4"><Link href="/reviews/" className="text-link">Reviews</Link><Link href="/doordash/" className="text-link">DoorDash</Link></div>} /><TrackerGate><Performance historyOnly={historyOnly} /></TrackerGate></>;
}

export function Performance({ historyOnly, kind }: { historyOnly: boolean; kind?: "review" | "doordash" }) {
  const { account, context, loadSnapshot, invalidate, version } = useTracker();
  const [owner, setOwner] = useState(account.userId);
  const person = context?.people.find((row) => row.user_id === owner);
  const [anchorStore, setAnchorStore] = useState("");
  const store = context?.stores.find((row) => row.id === (anchorStore || person?.home_store_id));
  const [date, setDate] = useState("");
  const [period, setPeriod] = useState<Period>("week");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ key: string; snapshot: Snapshot; refreshed: string } | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const selectedDate = date || (store ? localDate(store.timezone) : "");
  const range = selectedDate ? periodRange(selectedDate, period) : null;
  const start = range?.start ?? "";
  const end = range?.end ?? "";
  const key = `${owner}:${start}:${end}:${page}:${kind ?? "all"}`;
  useEffect(() => {
    if (!start || !end) return;
    let active = true;
    setError("");
    setRefreshing(true);
    void loadSnapshot(owner, start, end, page, kind).then((snapshot) => {
      if (active) setResult({ key, snapshot, refreshed: new Date().toLocaleTimeString() });
    }).catch(() => { if (active) setError("Results could not be updated. Check your connection and retry. Any displayed results are from the last successful load."); })
      .finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, [owner, start, end, page, key, kind, loadSnapshot, version]);
  const snapshot = result?.key === key ? result.snapshot : null;
  return <>
    <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {account.role === "manager" ? <Field><FieldLabel htmlFor="person">Team member</FieldLabel><Select id="person" value={owner} onChange={(event) => { setOwner(event.target.value); setDate(""); setAnchorStore(""); setPage(0); }}>{context?.people.map((row) => <option key={row.user_id} value={row.user_id}>{row.display_name}</option>)}</Select></Field> : null}
      <Field><FieldLabel htmlFor="period">Period</FieldLabel><Select id="period" value={period} onChange={(event) => { setPeriod(event.target.value as Period); setPage(0); }}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></Select></Field>
      <Field><FieldLabel htmlFor="calendar-store">Calendar timezone</FieldLabel><Select id="calendar-store" value={store?.id ?? ""} onChange={(event) => { setAnchorStore(event.target.value); setDate(""); setPage(0); }}><option value="" disabled>Choose a store</option>{context?.stores.map((row) => <option key={row.id} value={row.id}>{row.name} ({row.timezone})</option>)}</Select></Field>
      <Field><FieldLabel htmlFor="period-date">Date in period</FieldLabel><Input id="period-date" type="date" value={selectedDate} onChange={(event) => { setDate(event.target.value); setPage(0); }} /></Field>
    </FieldGroup>
    {!range ? <p className="text-sm text-muted-foreground">Choose a store to use its local calendar.</p> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium">{dateLabel(start)} to {dateLabel(end)} <span className="text-muted-foreground">· Sunday to Saturday</span></p><Button variant="outline" onClick={invalidate}>Refresh</Button></div>
      <p className="-mt-5 text-xs text-muted-foreground">Each entry belongs to its store’s local work date. Imported reports describe the previous day, regardless of arrival time.</p>
      {error ? <div role="alert" className="panel p-6"><p>{error}</p><Button className="mt-4" variant="outline" onClick={invalidate}>Retry</Button></div> : null}
      {!snapshot ? (!error ? <p role="status" className="text-sm text-muted-foreground">Loading results...</p> : null) : <>
        {!historyOnly ? <>
          <WorkspacePanel id="points-title" title={`Points this ${period}`}><div className="px-4 pb-4 md:px-6 md:pb-6"><span aria-hidden="true" className="mb-4 block h-1 w-8 rounded-full bg-primary" /><p className="tracker-metric">{snapshot.points ?? "No reports"}</p><p className="mt-2 text-sm text-muted-foreground">{snapshot.points === null ? "No imported points in this period." : `${money(snapshot.points * 0.5)} at $0.50 per point · ${snapshot.report_count} store reports`}</p><p className="mt-4 text-xs text-muted-foreground">Reported total only. Activity-level points are unavailable because the reports do not provide a complete points breakdown.</p></div></WorkspacePanel>
          <WorkspacePanel id="bonus-title" title="Separate bonus"><dl className="grid gap-6 px-4 pb-4 sm:grid-cols-3 md:px-6 md:pb-6"><div><dt className="text-sm text-muted-foreground">RTF commission · 2.5%</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{snapshot.commission === null ? "Unavailable" : money(snapshot.commission)}</dd><p className="mt-2 text-xs text-muted-foreground">{snapshot.commission_missing ? `${snapshot.commission_missing} reports missing RTF revenue. Partial total.` : "From imported RTF revenue."}</p></div><div><dt className="text-sm text-muted-foreground">Google reviews · $2 each</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{money(snapshot.review_cents / 100)}</dd><p className="mt-2 text-xs text-muted-foreground">{snapshot.review_count} logged reviews</p></div><div><dt className="text-sm text-muted-foreground">DoorDash · $5 per subscription</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{money(snapshot.doordash_cents / 100)}</dd><p className="mt-2 text-xs text-muted-foreground">{snapshot.doordash_count} logged subscriptions{snapshot.proof_missing ? ` · ${snapshot.proof_missing} without proof marked` : ""}</p></div></dl><p className="border-t px-4 py-4 text-xs text-muted-foreground md:px-6">Personal bonus tracking. These amounts are separate from points and do not confirm a payout.</p></WorkspacePanel>
          {period !== "day" && snapshot.report_count > 0 ? <WorkspacePanel id="trend-title" title="Daily points"><PointsChart daily={snapshot.daily} start={start} end={end} /></WorkspacePanel> : null}
        </> : null}
        <WorkspacePanel id="history-title" title={historyOnly ? "Records" : "Period history"}><History records={snapshot.history} /><div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 md:px-6"><p className="text-xs text-muted-foreground">{snapshot.history_count} records · Page {page + 1}</p><div className="flex gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPage((n) => n - 1)}>Previous</Button><Button variant="outline" disabled={(page + 1) * 25 >= snapshot.history_count} onClick={() => setPage((n) => n + 1)}>Next</Button></div></div></WorkspacePanel>
        <p className="text-xs text-muted-foreground"><span role="status">{refreshing ? "Updating in background... " : ""}</span>Loaded at {result?.refreshed}. {snapshot.last_import ? `Latest report import: ${new Date(snapshot.last_import).toLocaleString()}.` : "No imported reports in this period."} Coverage is not verified; missing dates can be days off or missing reports.</p>
      </>}
    </>}
  </>;
}
