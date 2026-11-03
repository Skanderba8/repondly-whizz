"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { WorkspacePanel } from "@/components/workspace-panel";
import { History } from "@/features/tracker/history";
import { useTracker } from "@/features/tracker/tracker-provider";
import { managerFilterKey, type ManagerFilters, type ManagerRecordsData } from "./manager-data";

export function ManagerRecords({ filters, active, fixedKind }: { filters: ManagerFilters; active: boolean; fixedKind?: "review" | "doordash" }) {
  const { loadManagerRecords, invalidate, version } = useTracker();
  const [selectedKind, setKind] = useState("all");
  const kind = fixedKind ?? selectedKind;
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const scope = `${managerFilterKey(filters)}:${kind}:${search}`;
  const [pagination, setPagination] = useState({ scope: "", page: 0 });
  const page = pagination.scope === scope ? pagination.page : 0;
  const key = `${scope}:${page}`;
  const attempt = `${key}:${version}`;
  const [result, setResult] = useState<{ key: string; attempt: string; data: ManagerRecordsData } | null>(null);
  const [failure, setFailure] = useState<{ attempt: string; message: string } | null>(null);
  const data = result?.key === key ? result.data : null;
  const error = failure?.attempt === attempt ? failure.message : "";
  const pending = result?.attempt !== attempt && failure?.attempt !== attempt;
  const request = useMemo(() => ({ ...filters, kind, search, page }), [filters,kind,search,page]);
  useEffect(() => {
    if (!active) return;
    let mounted = true;
    void loadManagerRecords(request).then((next) => {
      if (!mounted) return;
      if (page > 0 && page*25 >= next.count) { setPagination({ scope,page: Math.max(0,Math.ceil(next.count/25)-1) }); return; }
      setResult({ key,attempt,data:next });
    }).catch((reason: unknown) => { if (mounted) setFailure({ attempt,message: reason instanceof Error ? reason.message : "Records could not be updated. Retry." }); });
    return () => { mounted = false; };
  }, [active,loadManagerRecords,request,page,scope,key,attempt]);
  function applySearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSearch(draft.trim()); }
  return <WorkspacePanel id="manager-records" title={fixedKind === "review" ? "All reviews" : fixedKind === "doordash" ? "All DoorDash subscriptions" : "Records"} action={<span className="text-xs text-muted-foreground" role="status">{pending ? "Updating..." : data ? `${data.count.toLocaleString()} records` : ""}</span>}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 pb-4">
      {!fixedKind ? <div className="max-w-full overflow-x-auto"><SegmentedControl label="Manager record type" value={kind} onValueChange={setKind} options={[{ value:"all",label:"All" },{ value:"review",label:"Reviews" },{ value:"doordash",label:"DoorDash" },{ value:"productivity",label:"Reports" }]} /></div> : null}
      <form onSubmit={applySearch} className="flex w-full gap-2 sm:w-auto"><Input className="sm:w-64" aria-label="Search records by name, store or subscription" maxLength={120} placeholder="Name, store or subscription" value={draft} onChange={(event) => setDraft(event.target.value)} /><Button variant="outline" type="submit" aria-label="Search records"><Search aria-hidden="true" /></Button>{search ? <Button type="button" variant="ghost" onClick={() => { setDraft(""); setSearch(""); }}>Clear</Button> : null}</form>
    </div>
    {error ? <div role="alert" className="p-4 text-sm"><p>{error}{data ? " Showing the last loaded records for these filters." : ""}</p><Button variant="outline" className="mt-2" onClick={invalidate}>Retry records</Button></div> : null}
    {data ? <History records={data.records} showOwner hidePoints={kind === "review" || kind === "doordash"} recordKind={kind === "review" || kind === "doordash" ? kind : undefined} /> : !error ? <p className="p-4 text-sm text-muted-foreground" role="status">Loading records...</p> : null}
    {data && data.count > 25 ? <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><span className="text-xs text-muted-foreground">Page {page+1} of {Math.ceil(data.count/25)}</span><div className="flex gap-2"><Button variant="outline" disabled={page===0} onClick={() => setPagination({ scope,page:page-1 })}>Previous</Button><Button variant="outline" disabled={(page+1)*25>=data.count} onClick={() => setPagination({ scope,page:page+1 })}>Next</Button></div></div> : null}
  </WorkspacePanel>;
}
