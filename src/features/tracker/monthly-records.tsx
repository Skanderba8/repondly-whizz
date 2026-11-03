"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { WorkspacePanel } from "@/components/workspace-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { localDate, money, periodRange, type Snapshot } from "./domain";
import { History } from "./history";
import { useTracker } from "./tracker-provider";

export function MonthlyRecords({ kind }: { kind: "review" | "doordash" }) {
  const { account, context, loadSnapshot, invalidate, version } = useTracker();
  const [owner, setOwner] = useState(account.userId);
  const person = context?.people.find((row) => row.user_id === owner);
  const self = context?.people.find((row) => row.user_id === account.userId);
  const store = context?.stores.find((row) => row.id === (person?.home_store_id ?? self?.home_store_id))
    ?? context?.stores.find((row) => row.timezone === "America/New_York") ?? context?.stores[0];
  const currentMonth = localDate(store?.timezone ?? "America/New_York").slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState("");
  const month = selectedMonth || currentMonth;
  const [monthError, setMonthError] = useState("");
  const { start, end } = periodRange(`${month}-01`, "month");
  const scope = `${owner}:${month}:${kind}`;
  const [pagination, setPagination] = useState({ scope: "", page: 0 });
  const page = pagination.scope === scope ? pagination.page : 0;
  const key = `${scope}:${page}`;
  const attempt = `${key}:${version}`;
  const [result, setResult] = useState<{ key: string; attempt: string; snapshot: Snapshot } | null>(null);
  const [failure, setFailure] = useState<{ attempt: string; message: string } | null>(null);
  const snapshot = result?.key === key ? result.snapshot : null;
  const error = failure?.attempt === attempt ? failure.message : "";
  const pending = result?.attempt !== attempt && failure?.attempt !== attempt;
  const pages = Math.max(1, Math.ceil((snapshot?.history_count ?? 0) / 25));
  const regionId = `${kind}-monthly-records`;

  useEffect(() => {
    let active = true;
    void loadSnapshot(owner, start, end, page, kind).then((next) => {
      if (!active) return;
      if (page > 0 && page * 25 >= next.history_count) {
        setPagination({ scope, page: Math.max(0, Math.ceil(next.history_count / 25) - 1) });
        return;
      }
      setResult({ key, attempt, snapshot: next });
    }).catch(() => { if (active) setFailure({ attempt, message: "Records could not be refreshed. Retry to load the latest entries. Any entries still shown are from the last successful load." }); });
    return () => { active = false; };
  }, [owner, start, end, page, kind, scope, key, attempt, loadSnapshot]);

  function chooseMonth(value: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value < "0001-01" || value > "9998-12") {
      setMonthError("Choose a valid month."); return;
    }
    setSelectedMonth(value); setMonthError("");
  }
  function moveMonth(offset: number) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    chooseMonth(date.toISOString().slice(0, 7));
  }

  return <WorkspacePanel id={`${kind}-records-title`} title="Records" action={<div className="flex flex-wrap items-center gap-2">
    {account.role === "manager" ? <Select className="w-full sm:w-52" aria-label="Viewing records for" value={owner} onValueChange={setOwner} options={[{ value: "team", label: "Whole team" }, ...(context?.people ?? []).map((row) => ({ value: row.user_id, label: `${row.display_name}${row.user_id === account.userId ? " (you)" : ""}` }))]} /> : null}
    <div className="flex items-center gap-1" role="group" aria-label="Records month">
      <Button variant="ghost" size="icon" aria-label="Previous month" aria-controls={regionId} disabled={month === "0001-01"} onClick={() => moveMonth(-1)}><ChevronLeft aria-hidden="true" /></Button>
      <Input type="month" aria-label="Records month" aria-controls={regionId} aria-invalid={!!monthError} aria-describedby={monthError ? `${kind}-month-error` : `${kind}-month-help`} className="w-40" value={month} min="0001-01" max="9998-12" required onChange={(event) => chooseMonth(event.target.value)} />
      <Button variant="ghost" size="icon" aria-label="Next month" aria-controls={regionId} disabled={month === "9998-12"} onClick={() => moveMonth(1)}><ChevronRight aria-hidden="true" /></Button>
    </div>
    {month !== currentMonth ? <Button variant="ghost" onClick={() => { setSelectedMonth(""); setMonthError(""); }}>This month</Button> : null}
    <Button variant="ghost" size="icon" aria-label="Refresh records" aria-busy={pending} onClick={invalidate}><RefreshCw aria-hidden="true" className={pending ? "animate-spin motion-reduce:animate-none" : undefined} /></Button>
  </div>}>
    <p id={`${kind}-month-help`} className="sr-only">The selected month filters the records below using {store?.timezone ?? "America/New_York"} for the default month.</p>
    {monthError ? <p id={`${kind}-month-error`} role="alert" className="px-4 pb-3 text-sm text-destructive md:px-6">{monthError}</p> : null}
    <div id={regionId} aria-busy={pending}>
      {snapshot ? <p className="px-4 pb-3 text-xs text-muted-foreground md:px-6">{snapshot.history_count} {snapshot.history_count === 1 ? "record" : "records"} · {money((kind === "review" ? snapshot.review_cents : snapshot.doordash_cents) / 100)}</p> : null}
      {error ? <div role="alert" className="px-4 pb-4 text-sm md:px-6"><p>{error}</p><Button variant="outline" className="mt-3" onClick={invalidate}>Retry</Button></div> : null}
      {snapshot ? <History records={snapshot.history} showOwner={owner === "team"} hidePoints recordKind={kind} /> : !error ? <p role="status" className="px-4 pb-5 text-sm text-muted-foreground md:px-6">Loading records...</p> : null}
      {snapshot && pages > 1 ? <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 md:px-6"><p className="text-xs text-muted-foreground">Page {page + 1} of {pages}</p><div className="flex gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPagination({ scope, page: page - 1 })}>Previous</Button><Button variant="outline" disabled={page + 1 >= pages} onClick={() => setPagination({ scope, page: page + 1 })}>Next</Button></div></div> : null}
      <span className="sr-only" role="status">{snapshot && pending ? "Refreshing records" : ""}</span>
    </div>
  </WorkspacePanel>;
}
