"use client";

import { Inbox, Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { dateLabel, money, type HistoryRecord } from "./domain";
import { EvidenceViewer } from "./evidence-viewer";
import { useTracker } from "./tracker-provider";
import { ReviewDialog } from "./review-dialog";
import { DoorDashDialog } from "./doordash-dialog";

const names = { productivity: "Report", review: "Review", doordash: "DoorDash" };
const activityNames: Record<string, string> = {
  new_subscriptions: "New subscriptions", bikes_and_batteries: "Bikes and batteries",
  accessories: "Accessories", rtf: "RTF", rtc: "RTC", total_revenue_cents: "Total revenue",
};
type ManageRecord = (id: string, kind: "review" | "doordash", action: "edit" | "delete", trigger: HTMLButtonElement) => void;

function activityLabel(key: string) {
  if (key.endsWith("_revenue_cents") && key !== "total_revenue_cents") return `${activityNames[key.replace("_revenue_cents", "")] ?? key.replace("_revenue_cents", "")} revenue`;
  return activityNames[key] ?? key.replaceAll("_", " ");
}
function revenueLabel(record: HistoryRecord) {
  const revenue = record.activity?.total_revenue_cents;
  return record.kind !== "productivity" ? "-" : typeof revenue === "number" ? money(revenue / 100) : "Not reported";
}

function RecordSummary({ record, showOwner }: { record: HistoryRecord; showOwner: boolean }) {
  const { context } = useTracker();
  return <div className="min-w-0">
    <p className="break-words text-sm font-medium">{names[record.kind]}{record.subscription_number ? ` · ${record.subscription_number}` : ""}</p>
    <p className="text-xs text-muted-foreground">{showOwner ? `${record.display_name ?? "Team member"} · ` : ""}{context?.stores.find((store) => store.id === record.store_id)?.name}{record.kind === "doordash" && !record.dd_proof_added ? <span className="text-warning-foreground"> · Proof missing</span> : null}</p>
    {record.kind === "productivity" || record.note ? <details className="record-details">
      <summary className="w-fit cursor-pointer text-xs text-link">Details</summary>
      <div className="mt-2 space-y-2 text-xs text-muted-foreground">
        {record.note ? <p className="max-w-lg whitespace-pre-wrap break-words">{record.note}</p> : null}
        {record.kind === "productivity" ? <dl className="grid max-w-sm grid-cols-2 gap-x-4 gap-y-2">
          <dt>Report sent</dt><dd>{record.source_sent_at ? new Date(record.source_sent_at).toLocaleString() : "Not reported"}</dd>
          <dt>RTF collected</dt><dd>{record.rtf_revenue_cents === null ? "Not reported" : money(record.rtf_revenue_cents / 100)}</dd>
          {record.activity ? Object.entries(record.activity).map(([key, value]) => <div key={key} className="contents"><dt>{activityLabel(key)}</dt><dd className="tabular-nums">{value === null ? "Not reported" : key.endsWith("_cents") ? money(value / 100) : value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd></div>) : null}
          <dt>Imported</dt><dd>{new Date(record.recorded_at).toLocaleString()}</dd>
        </dl> : null}
      </div>
    </details> : null}
  </div>;
}

function RecordActions({ record, onManage }: { record: HistoryRecord; onManage: ManageRecord }) {
  const { account } = useTracker();
  const kind = record.kind === "review" || record.kind === "doordash" ? record.kind : null;
  const allowed = kind && (record.owner_id === account.userId || account.role === "manager");
  return <div className="flex items-center justify-end gap-1">
    {record.screenshot_path ? <EvidenceViewer path={record.screenshot_path} /> : null}
    {kind && allowed ? <>
      <Button variant="ghost" size="icon" title="Edit" aria-label={`Edit ${names[record.kind]} from ${dateLabel(record.work_date)}`} onClick={(event) => onManage(record.id, kind, "edit", event.currentTarget)}><Pencil aria-hidden="true" /></Button>
      <Button variant="ghost" size="icon" title="Delete" className="text-destructive" aria-label={`Delete ${names[record.kind]} from ${dateLabel(record.work_date)}`} onClick={(event) => onManage(record.id, kind, "delete", event.currentTarget)}><Trash2 aria-hidden="true" /></Button>
    </> : null}
  </div>;
}

export function History({ records, showOwner = false, hidePoints = false, recordKind }: { records: HistoryRecord[]; showOwner?: boolean; hidePoints?: boolean; recordKind?: "review" | "doordash" }) {
  const [selected, setSelected] = useState<{ id: string; kind: "review" | "doordash"; action: "edit" | "delete" } | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const history = useRef<HTMLDivElement>(null);
  function manage(id: string, kind: "review" | "doordash", action: "edit" | "delete", button: HTMLButtonElement) {
    trigger.current = button; setSelected({ id, kind, action });
  }
  function close() {
    setSelected(null);
    requestAnimationFrame(() => { if (trigger.current?.isConnected) trigger.current.focus(); else history.current?.focus(); });
  }
  return <div ref={history} tabIndex={-1} aria-label="Record history" className="outline-none">
    {selected ? selected.kind === "review" ? <ReviewDialog key={`${selected.id}:${selected.action}`} id={selected.id} action={selected.action} onClose={close} /> : <DoorDashDialog key={`${selected.id}:${selected.action}`} id={selected.id} action={selected.action} onClose={close} /> : null}
    {!records.length ? <Empty><EmptyHeader><EmptyMedia variant="icon"><Inbox aria-hidden="true" /></EmptyMedia><EmptyTitle>{recordKind === "review" ? "No reviews in this period" : recordKind === "doordash" ? "No DoorDash subscriptions in this period" : "No records in this period"}</EmptyTitle><EmptyDescription>Choose another date, week, month, or record type.</EmptyDescription></EmptyHeader></Empty> : <>
      <div className="hidden overflow-x-auto md:block"><table className="tracker-table activity-record-table">
        <caption className="sr-only">Selected-period records. Collected revenue belongs to reports; bonuses are separate earnings.</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Record / store</th>{!hidePoints ? <><th scope="col" className="text-right">Collected revenue</th><th scope="col" className="text-right">Points</th></> : null}<th scope="col" className="text-right">Bonus</th><th scope="col" className="text-right">Actions</th></tr></thead>
        <tbody>{records.map((record) => <tr key={record.id}>
          <td className="whitespace-nowrap tabular-nums">{dateLabel(record.work_date)}</td>
          <td><RecordSummary record={record} showOwner={showOwner} /></td>
          {!hidePoints ? <><td className="text-right whitespace-nowrap tabular-nums">{revenueLabel(record)}</td><td className="text-right tabular-nums">{record.points === null ? "-" : record.points.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td></> : null}
          <td className="text-right whitespace-nowrap font-medium tabular-nums">{record.bonus_cents === null ? "-" : money(record.bonus_cents / 100)}</td>
          <td><RecordActions record={record} onManage={manage} /></td>
        </tr>)}</tbody>
      </table></div>
      <ul className="divide-y md:hidden">{records.map((record) => <li key={record.id} className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{dateLabel(record.work_date)}</span><span className="text-sm font-semibold tabular-nums">{record.kind === "productivity" ? `${record.points?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 0} points` : money((record.bonus_cents ?? 0) / 100)}</span></div>
        <RecordSummary record={record} showOwner={showOwner} />
        {record.kind === "productivity" ? <p className="mt-2 text-xs text-muted-foreground">Collected revenue <span className="font-medium text-foreground tabular-nums">{revenueLabel(record)}</span>{record.bonus_cents !== null ? <> · RTF commission <span className="font-medium text-foreground tabular-nums">{money(record.bonus_cents / 100)}</span></> : null}</p> : null}
        <RecordActions record={record} onManage={manage} />
      </li>)}</ul>
    </>}
  </div>;
}
