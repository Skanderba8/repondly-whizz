"use client";

import { Inbox } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { dateLabel, money, type HistoryRecord } from "./domain";
import { EvidenceViewer } from "./evidence-viewer";
import { useTracker } from "./tracker-provider";

const names = { productivity: "Productivity", review: "Google review", doordash: "DoorDash" };

function RecordDetails({ record }: { record: HistoryRecord }) {
  const { context } = useTracker();
  return <>
    <p className="font-medium">{names[record.kind]}{record.subscription_number ? ` · ${record.subscription_number}` : ""}</p>
    <p className="mt-1 text-xs text-muted-foreground">{context?.stores.find((store) => store.id === record.store_id)?.name}</p>
    {record.kind === "doordash" ? <Badge className="mt-2">{record.dd_proof_added ? "DD proof added" : "DD proof not added"}</Badge> : null}
    {record.kind === "productivity" ? <details className="mt-2"><summary className="cursor-pointer py-2 text-xs text-link underline">Source details</summary><dl className="space-y-2 text-xs text-muted-foreground"><div><dt>Report sent</dt><dd>{record.source_sent_at ? new Date(record.source_sent_at).toLocaleString() : "Unavailable"}</dd></div><div><dt>RTF collected</dt><dd>{record.rtf_revenue_cents === null ? "Unavailable" : money(record.rtf_revenue_cents / 100)}</dd></div>{record.activity ? Object.entries(record.activity).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd className="tabular-nums">{value ?? "Unavailable"}</dd></div>) : null}<div><dt>Imported</dt><dd>{new Date(record.recorded_at).toLocaleString()}</dd></div></dl></details> : null}
    {record.note ? <p className="mt-2 max-w-lg whitespace-pre-wrap break-words text-sm text-muted-foreground">{record.note}</p> : null}
    {record.screenshot_path ? <EvidenceViewer path={record.screenshot_path} /> : null}
  </>;
}

export function History({ records }: { records: HistoryRecord[] }) {
  if (!records.length) return <Empty><EmptyHeader><EmptyMedia variant="icon"><Inbox aria-hidden="true" /></EmptyMedia><EmptyTitle>No records in this period</EmptyTitle><EmptyDescription>Choose another period or add a review or DoorDash subscription.</EmptyDescription></EmptyHeader></Empty>;
  return <>
    <div className="hidden overflow-x-auto md:block"><table className="tracker-table"><caption className="sr-only">Records in the selected period</caption><thead><tr><th scope="col">Work date</th><th scope="col">Record</th><th scope="col" className="text-right">Points</th><th scope="col" className="text-right">Separate bonus</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td className="whitespace-nowrap">{dateLabel(record.work_date)}</td><td><RecordDetails record={record} /></td><td className="text-right tabular-nums">{record.points ?? "Not applicable"}</td><td className="text-right tabular-nums">{record.bonus_cents === null ? "See RTF commission" : money(record.bonus_cents / 100)}</td></tr>)}</tbody></table></div>
    <ul className="divide-y md:hidden">{records.map((record) => <li key={record.id} className="p-4"><p className="mb-3 text-xs text-muted-foreground">{dateLabel(record.work_date)}</p><RecordDetails record={record} /><p className="mt-3 font-medium tabular-nums">{record.points === null ? money((record.bonus_cents ?? 0) / 100) : `${record.points} points`}</p></li>)}</ul>
  </>;
}
