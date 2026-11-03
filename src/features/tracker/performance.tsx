"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bike, MessageSquareText, RefreshCw } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { WorkspacePanel } from "@/components/workspace-panel";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useTracker } from "./tracker-provider";
import { TrackerGate } from "./tracker-gate";
import { dateLabel, localDate, type Snapshot, type Period } from "./domain";
import { chartBucket, presetRange, rangeDays, rangeOptions, reportingRangeSchema, type RangePreset, type Reporting, type ReportingRange } from "./reporting";
import { History } from "./history";
import { DashboardAnalytics } from "./dashboard-analytics";
import { MonthlyRecords } from "./monthly-records";

export function PerformancePage({ historyOnly = false }: { historyOnly?: boolean }) {
  const { account, context } = useTracker();
  const name = context?.people.find((person) => person.user_id === account.userId)?.display_name.split(/\s+/)[0];
  return <><PageHeading title={historyOnly ? "Activity" : name ? `Welcome, ${name}` : "Welcome"} description={historyOnly ? "Your records and their source totals." : "Points, bonuses, and estimated earnings."} action={<div className="grid w-full grid-cols-2 gap-3 sm:w-auto"><Button size="daily" asChild><Link href="/reviews/"><MessageSquareText aria-hidden="true" />Reviews</Link></Button><Button size="daily" variant="delivery" asChild><Link href="/doordash/"><Bike aria-hidden="true" />Add DoorDash</Link></Button></div>} /><TrackerGate><Performance historyOnly={historyOnly} /></TrackerGate></>;
}

export function Performance({ historyOnly, kind }: { historyOnly: boolean; kind?: "review" | "doordash" }) {
  return kind ? <MonthlyRecords kind={kind} /> : <ReportingPerformance historyOnly={historyOnly} />;
}

function ReportingPerformance({ historyOnly, kind }: { historyOnly: boolean; kind?: "review" | "doordash" }) {
  const { account, context, loadSnapshot, loadReporting, invalidate, version } = useTracker();
  const [owner, setOwner] = useState(account.userId);
  const [calendarId, setCalendarId] = useState("");
  const person = context?.people.find((row) => row.user_id === owner);
  const ownPerson = context?.people.find((row) => row.user_id === account.userId);
  const store = context?.stores.find((row) => row.id === calendarId)
    ?? context?.stores.find((row) => row.id === (person?.home_store_id ?? ownPerson?.home_store_id))
    ?? context?.stores.find((row) => row.timezone === "America/New_York") ?? context?.stores[0];
  const today = localDate(store?.timezone ?? "America/New_York");
  const [preset, setPreset] = useState<RangePreset>("month");
  const [custom, setCustom] = useState<ReportingRange | null>(null);
  const range = preset === "custom" ? custom ?? presetRange("month", today) : presetRange(preset, today);
  const { start, end } = range;
  const rangeKey = `${start}:${end}`;
  const [grouping, setGrouping] = useState<{ range: string; bucket: Period } | null>(null);
  const bucket = grouping?.range === rangeKey ? grouping.bucket : chartBucket(range);
  const bucketOptions = rangeDays(range) <= 31
    ? [{ value: "day", label: "By day" }, { value: "week", label: "By week" }]
    : rangeDays(range) <= 180
      ? [{ value: "week", label: "By week" }, { value: "month", label: "By month" }]
      : [{ value: "month", label: "By month" }];
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState("");
  const rangeErrorRef = useRef<HTMLParagraphElement>(null);
  const scopeKey = `${owner}:${start}:${end}:${kind ?? "all"}`;
  const [pagination, setPagination] = useState({ key: "", page: 0 });
  const page = pagination.key === scopeKey ? pagination.page : 0;
  const [records, setRecords] = useState<{ key: string; attempt: string; snapshot: Snapshot } | null>(null);
  const [reporting, setReporting] = useState<{ key: string; attempt: string; data: Reporting } | null>(null);
  const [recordsFailure, setRecordsFailure] = useState<{ attempt: string; message: string } | null>(null);
  const [analyticsFailure, setAnalyticsFailure] = useState<{ attempt: string; message: string } | null>(null);
  const memberControl = useRef<HTMLButtonElement>(null);
  const team = owner === "team";
  const recordsKey = `${owner}:${start}:${end}:${page}:${kind ?? "all"}`;
  const reportingKey = `${owner}:${start}:${end}:${bucket}`;
  const recordsAttempt = `${recordsKey}:${version}`;
  const analyticsAttempt = `${reportingKey}:${version}`;
  const recordsError = recordsFailure?.attempt === recordsAttempt ? recordsFailure.message : "";
  const analyticsError = analyticsFailure?.attempt === analyticsAttempt ? analyticsFailure.message : "";
  const recordsPending = records?.attempt !== recordsAttempt && recordsFailure?.attempt !== recordsAttempt;
  const analyticsPending = reporting?.attempt !== analyticsAttempt && analyticsFailure?.attempt !== analyticsAttempt;
  const data = reporting?.key === reportingKey ? reporting.data : null;
  const snapshot = records?.key === recordsKey ? records.snapshot : null;

  useEffect(() => {
    let active = true;
    void loadSnapshot(owner, start, end, page, kind).then((snapshot) => {
      if (active) setRecords({ key: recordsKey, attempt: recordsAttempt, snapshot });
    }).catch(() => { if (active) setRecordsFailure({ attempt: recordsAttempt, message: "Records could not be updated. Retry after checking your connection. Existing displayed records are from the last successful load." }); });
    return () => { active = false; };
  }, [owner, start, end, page, recordsKey, recordsAttempt, kind, loadSnapshot]);
  useEffect(() => {
    let active = true;
    void loadReporting(owner, start, end, bucket).then((data) => {
      if (active) setReporting({ key: reportingKey, attempt: analyticsAttempt, data });
    }).catch(() => { if (active) setAnalyticsFailure({ attempt: analyticsAttempt, message: "Reporting could not be updated. Retry, or apply the accurate-reporting migration if this is the first setup. Existing displayed figures are from the last successful load." }); });
    return () => { active = false; };
  }, [owner, start, end, bucket, reportingKey, analyticsAttempt, loadReporting]);

  function setPage(next: number) { setPagination({ key: scopeKey, page: next }); }

  function selectOwner(next: string) { setOwner(next); setPage(0); }
  function selectPreset(value: string) {
    setFrom(null); setTo(null);
    setPreset(value as RangePreset); setRangeError(""); setPage(0);
  }
  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = reportingRangeSchema.safeParse({ start: from ?? start, end: to ?? end });
    if (!parsed.success) {
      setRangeError(parsed.error.issues[0]?.message ?? "Choose valid dates.");
      requestAnimationFrame(() => rangeErrorRef.current?.focus());
      return;
    }
    setCustom(parsed.data); setPreset("custom"); setFrom(parsed.data.start); setTo(parsed.data.end); setPage(0); setRangeError("");
  }
  return <>
    <section aria-label="Reporting range and scope" className="panel flex flex-col gap-5 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-semibold">{dateLabel(start)} to {dateLabel(end)}</p>
        <div className="flex flex-wrap items-center gap-3">
          {!historyOnly && bucketOptions.length > 1 ? <SegmentedControl label="Chart grouping" value={bucket} options={bucketOptions} onValueChange={(value) => setGrouping({ range: rangeKey, bucket: value as Period })} /> : null}
          <Button variant="ghost" size="icon" aria-label="Refresh reports and earnings" aria-busy={analyticsPending || recordsPending} onClick={invalidate}><RefreshCw aria-hidden="true" className={analyticsPending || recordsPending ? "animate-spin" : undefined} /></Button>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-end">
        <Field><FieldLabel>Quick dates</FieldLabel><SegmentedControl className="range-presets" label="Date range" value={preset === "custom" ? "" : preset} onValueChange={selectPreset} options={[...rangeOptions]} /></Field>
        <form onSubmit={applyRange} className="flex min-w-0 flex-col gap-2">
          <p className="text-sm font-medium">Custom range</p>
          <FieldGroup className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Field><FieldLabel htmlFor="range-from">Start</FieldLabel><DatePicker id="range-from" label="Start" today={today} required value={from ?? start} aria-invalid={!!rangeError} aria-describedby={rangeError ? "range-error" : undefined} onValueChange={(value) => { setFrom(value); setRangeError(""); }} /></Field>
            <Field><FieldLabel htmlFor="range-to">Finish</FieldLabel><DatePicker id="range-to" label="Finish" today={today} required value={to ?? end} aria-invalid={!!rangeError} aria-describedby={rangeError ? "range-error" : undefined} onValueChange={(value) => { setTo(value); setRangeError(""); }} /></Field>
            <Button type="submit" size="daily" variant="secondary">Apply range</Button>
          </FieldGroup>
          <FieldError id="range-error">{rangeError ? <p ref={rangeErrorRef} tabIndex={-1}>{rangeError}</p> : null}</FieldError>
          {(from !== null && from !== start) || (to !== null && to !== end) ? <p role="status" className="text-xs text-muted-foreground">Apply to update the range.</p> : null}
        </form>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-4">
        {account.role === "manager" ? <Field className="max-w-sm"><FieldLabel htmlFor="report-person">Viewing</FieldLabel><Select ref={memberControl} id="report-person" value={owner} onValueChange={selectOwner} options={[{ value: "team", label: "Whole team" }, ...(context?.people ?? []).map((row) => ({ value: row.user_id, label: `${row.display_name}${row.user_id === account.userId ? " (you)" : ""}` }))]} /></Field> : null}
        <details className="min-w-0"><summary className="w-fit cursor-pointer py-2 text-xs text-link">Calendar settings</summary><div className="mt-3 max-w-sm"><Field><FieldLabel htmlFor="report-calendar">Timezone for today</FieldLabel><Select id="report-calendar" value={store?.id ?? ""} onValueChange={setCalendarId} options={(context?.stores ?? []).map((row) => ({ value: row.id, label: `${row.name} (${row.timezone})` }))} /></Field></div></details>
      </div>
    </section>
    {analyticsError ? <div role="alert" className="panel p-4"><p className="text-sm">{analyticsError}</p><Button variant="outline" onClick={invalidate} className="mt-3">Retry reporting</Button></div> : null}
    {data ? <>{!historyOnly ? <DashboardAnalytics key={reportingKey} data={data} bucket={bucket} owner={owner} accountId={account.userId} onSelect={(next) => { selectOwner(next); requestAnimationFrame(() => { memberControl.current?.focus(); memberControl.current?.scrollIntoView({ block: "nearest" }); }); }} /> : null}<span role="status" className="sr-only">{analyticsPending ? "Updating figures" : ""}</span></> : !analyticsError ? <p role="status" className="text-sm text-muted-foreground">Loading reporting for {dateLabel(start)} to {dateLabel(end)}...</p> : null}
    {recordsError ? <div role="alert" className="panel p-4"><p className="text-sm">{recordsError}</p><Button className="mt-3" variant="outline" onClick={invalidate}>Retry records</Button></div> : null}
    {snapshot ? <WorkspacePanel id="history-title" title={historyOnly ? "Records" : "Source records"} action={<span className="text-xs text-muted-foreground">{snapshot.history_count} records · {dateLabel(start)} to {dateLabel(end)}</span>}><History records={snapshot.history} showOwner={team} /><div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 md:px-6"><p className="text-xs text-muted-foreground" role="status">{recordsPending ? "Updating records..." : `Page ${page + 1} of ${Math.max(1, Math.ceil(snapshot.history_count / 25))}`}</p><div className="flex gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" disabled={(page + 1) * 25 >= snapshot.history_count} onClick={() => setPage(page + 1)}>Next</Button></div></div></WorkspacePanel> : !recordsError ? <p role="status" className="text-sm text-muted-foreground">Loading source records...</p> : null}
  </>;
}





