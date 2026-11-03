"use client";

import { Inbox } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { dateLabel, money, type HistoryRecord } from "./domain";
import { EvidenceViewer } from "./evidence-viewer";
import { useTracker } from "./tracker-provider";
import { ReviewDialog } from "./review-dialog";
import { DoorDashDialog } from "./doordash-dialog";

const names = { productivity: "Productivity", review: "Google review", doordash: "DoorDash" };
const activityNames: Record<string, string> = {
  new_subscriptions: "New subscriptions", bikes_and_batteries: "Bikes and batteries",
  accessories: "Accessories", rtf: "RTF", rtc: "RTC", total_revenue_cents: "Total revenue",
};

function activityLabel(key: string) {
  if (key === "total_revenue_cents") return "Total revenue";
  if (key.endsWith("_revenue_cents")) return `${activityNames[key.replace("_revenue_cents", "")] ?? key.replace("_revenue_cents", "")} revenue`;
  return activityNames[key] ?? key.replaceAll("_", " ");
}

function RecordDetails({ record, showOwner = false, onManage }: { record: HistoryRecord; showOwner?: boolean; onManage: (id: string, kind: "review" | "doordash", action: "edit" | "delete", trigger: HTMLButtonElement) => void }) {
  const { account, context } = useTracker();
  return <>
    {showOwner ? <p className="mb-1 text-xs font-medium text-muted-foreground">{record.display_name ?? "Team member"}</p> : null}
    <p className="font-medium">{names[record.kind]}{record.subscription_number ? ` · ${record.subscription_number}` : ""}</p>
    <p className="mt-1 text-xs text-muted-foreground">{context?.stores.find((store) => store.id === record.store_id)?.name}</p>
    {record.kind === "doordash" ? <Badge className="mt-2">{record.dd_proof_added ? "DD proof added" : "DD proof not added"}</Badge> : null}
    {record.kind === "productivity" ? <details className="mt-2"><summary className="cursor-pointer py-2 text-xs text-link underline">Source details</summary><dl className="flex flex-col gap-2 text-xs text-muted-foreground"><div><dt>Report sent</dt><dd>{record.source_sent_at ? new Date(record.source_sent_at).toLocaleString() : "Unavailable"}</dd></div><div><dt>RTF collected</dt><dd>{record.rtf_revenue_cents === null ? "Unavailable" : money(record.rtf_revenue_cents / 100)}</dd></div>{record.activity ? Object.entries(record.activity).map(([key, value]) => <div key={key}><dt>{activityLabel(key)}</dt><dd className="tabular-nums">{value === null ? "Unavailable" : key.endsWith("_cents") ? money(value / 100) : value.toLocaleString()}</dd></div>) : null}<div><dt>Imported</dt><dd>{new Date(record.recorded_at).toLocaleString()}</dd></div></dl></details> : null}
    {record.note ? <p className="mt-2 max-w-lg whitespace-pre-wrap break-words text-sm text-muted-foreground">{record.note}</p> : null}
    {record.screenshot_path ? <EvidenceViewer path={record.screenshot_path} /> : null}
    {(record.kind === "review" || record.kind === "doordash") && (record.owner_id === account.userId || account.role === "manager") ? <div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" aria-label={`Edit ${names[record.kind]} from ${dateLabel(record.work_date)}`} onClick={(event) => onManage(record.id, record.kind === "review" ? "review" : "doordash", "edit", event.currentTarget)}>Edit</Button><Button variant="ghost" className="text-destructive" aria-label={`Delete ${names[record.kind]} from ${dateLabel(record.work_date)}`} onClick={(event) => onManage(record.id, record.kind === "review" ? "review" : "doordash", "delete", event.currentTarget)}>Delete</Button></div> : null}
  </>;
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
    {!records.length ? <Empty><EmptyHeader><EmptyMedia variant="icon"><Inbox aria-hidden="true" /></EmptyMedia><EmptyTitle>{recordKind === "review" ? "No reviews this month" : recordKind === "doordash" ? "No DoorDash entries this month" : "No records in this period"}</EmptyTitle><EmptyDescription>{recordKind ? "Choose another month or add an entry above." : "Choose another period or add a review or DoorDash subscription."}</EmptyDescription></EmptyHeader></Empty> : <>
    <div className="hidden overflow-x-auto md:block"><table className="tracker-table"><caption className="sr-only">Records in the selected period</caption><thead><tr><th scope="col">Work date</th><th scope="col">Record</th>{!hidePoints ? <th scope="col" className="text-right">Points</th> : null}<th scope="col" className="text-right">{hidePoints ? "Bonus" : "Separate bonus"}</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td className="whitespace-nowrap">{dateLabel(record.work_date)}</td><td><RecordDetails record={record} showOwner={showOwner} onManage={manage} /></td>{!hidePoints ? <td className="text-right tabular-nums">{record.points ?? "Not applicable"}</td> : null}<td className="text-right tabular-nums">{record.bonus_cents === null ? "See RTF commission" : money(record.bonus_cents / 100)}</td></tr>)}</tbody></table></div>
    <ul className="divide-y md:hidden">{records.map((record) => <li key={record.id} className="p-4"><p className="mb-3 text-xs text-muted-foreground">{dateLabel(record.work_date)}</p><RecordDetails record={record} showOwner={showOwner} onManage={manage} /><p className="mt-3 font-medium tabular-nums">{record.points === null ? money((record.bonus_cents ?? 0) / 100) : `${record.points} points`}</p></li>)}</ul>
    </>}
  </div>;
}

