"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TrackerGate } from "@/features/tracker/tracker-gate";
import { useTracker } from "@/features/tracker/tracker-provider";
import { dateLabel, localDate, money } from "@/features/tracker/domain";
import { chartBucket } from "@/features/tracker/reporting";
import { PeriodPicker } from "@/features/tracker/period-picker";
import { ScopePicker } from "./scope-picker";
import { managerFilterKey, type ManagerData } from "./manager-data";
import { ManagerTrend } from "./manager-trend";
import { ManagerCategories, ManagerComparison, ManagerPeople, ManagerStores, ManagerTotals } from "./manager-panels";
import { ManagerRecords } from "./manager-records";
import { useManagerFilters } from "./use-manager-filters";

type ManagerSection = "people" | "records";
type ManagerDashboardProps = { view?: ManagerSection; recordKind?: "review" | "doordash"; title?: string; description?: string };

export function ManagerDashboard({ view, recordKind, title = "Team overview", description = "Performance, revenue, and activity across your team." }: ManagerDashboardProps) {
  const { account } = useTracker();
  if (account.role !== "manager") return <p role="alert" className="text-sm">Manager access required.</p>;
  return <TrackerGate><ManagerWorkspace key={recordKind ?? view ?? "summary"} view={view} recordKind={recordKind} title={title} description={description} /></TrackerGate>;
}
function ManagerWorkspace({ view, recordKind, title, description }: ManagerDashboardProps) {
  const { account, context, loadManagerDashboard, invalidate, version } = useTracker();
  const self = context?.people.find((person) => person.user_id === account.userId);
  const calendarStore = context?.stores.find((store) => store.id === self?.home_store_id)
    ?? context?.stores.find((store) => store.timezone === "America/New_York") ?? context?.stores[0];
  const today = localDate(calendarStore?.timezone ?? "America/New_York");
  const saved = useManagerFilters(today);
  const { people, stores, preset, range, setPeople, setStores } = saved;
  const tab = view ?? saved.tab;
  const { start,end } = range;
  const bucket = chartBucket(range);
  const filters = useMemo(() => ({ start,end,people,stores,bucket }),[start,end,people,stores,bucket]);
  const key = managerFilterKey(filters);
  const attempt = `${key}:${version}`;
  const [result, setResult] = useState<{ key: string; attempt: string; data: ManagerData } | null>(null);
  const [failure, setFailure] = useState<{ attempt: string; message: string } | null>(null);
  const [employeeView, setEmployeeView] = useState<{ owner: string; value: "performance" | "review" | "doordash" } | null>(null);
  const data = result?.key === key ? result.data : null;
  const error = failure?.attempt === attempt ? failure.message : "";
  const pending = result?.attempt !== attempt && failure?.attempt !== attempt;
  useEffect(() => {
    if (!saved.ready) return;
    let active = true;
    void loadManagerDashboard(filters).then((next) => { if (active) setResult({ key,attempt,data:next }); }).catch((reason: unknown) => { if (active) setFailure({ attempt,message: reason instanceof Error ? reason.message : "Manager dashboard could not be loaded. Retry." }); });
    return () => { active=false; };
  },[filters,key,attempt,loadManagerDashboard,saved.ready]);
  const selectedPerson = tab === "people" && people?.length === 1 ? context?.people.find((person) => person.user_id === people[0]) : null;
  const profile = selectedPerson ? data?.people.find((person) => person.user_id === selectedPerson.user_id) : null;
  const profileView = employeeView?.owner === selectedPerson?.user_id ? employeeView?.value ?? "performance" : "performance";
  const profileRecordKind = selectedPerson && profileView !== "performance" ? profileView : undefined;
  const recordsVisible = tab === "records" || !!profileRecordKind;
  const comparisonStatus = pending ? "updating" : error ? "unavailable" : "ready";
  const homeStore = context?.stores.find((store) => store.id === selectedPerson?.home_store_id)?.name ?? "Not assigned";
  function showProfile(id: string) { setPeople([id]); saved.setTab("people"); }
  if (!saved.ready) return <p role="status" className="text-sm text-muted-foreground">Restoring saved filters...</p>;
  return <div className="manager-workspace">
    <PageHeading title={selectedPerson?.display_name ?? title ?? "Team overview"} description={selectedPerson ? `Home store: ${homeStore}${profile?.metrics.latest_work_date ? ` · Latest activity in selected period: ${dateLabel(profile.metrics.latest_work_date)}` : ""}` : description ?? "Performance, revenue, and activity across your team."} action={selectedPerson ? <Button variant="outline" onClick={() => setPeople(null)}>All employees</Button> : undefined} />
    <section aria-label="Manager reporting filters" className="manager-filterbar">
      <div className="max-w-full overflow-x-auto"><SegmentedControl label="Manager date range" value={preset === "custom" ? "" : preset} onValueChange={saved.selectPreset} options={[{ value:"month",label:"This month" },{ value:"week",label:"This week" },{ value:"today",label:"Today" },{ value:"yesterday",label:"Yesterday" }]} /></div>
      <PeriodPicker range={range} today={today} onSelect={saved.selectRange} />
      <ScopePicker label="People" options={(context?.people ?? []).map((person) => ({ value:person.user_id,label:person.display_name }))} selected={people} onChange={setPeople} />
      <ScopePicker label="Stores" options={(context?.stores ?? []).map((store) => ({ value:store.id,label:store.name }))} selected={stores} onChange={setStores} />
      <Button size="icon" variant="ghost" aria-label="Refresh manager dashboard" aria-busy={pending} onClick={invalidate}><RefreshCw aria-hidden="true" className={pending ? "animate-spin motion-reduce:animate-none" : undefined} /></Button>
      <Button variant="ghost" onClick={saved.reset}>Reset</Button>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-3">{!view ? <SegmentedControl label="Manager view" value={tab} onValueChange={saved.setTab} options={[{ value:"summary",label:"Summary" },{ value:"people",label:"People" },{ value:"records",label:"Records" }]} /> : null}<p className="text-xs text-muted-foreground">{people ? `${people.length} selected` : `${context?.people.length ?? 0} employees`} · {stores ? `${stores.length} stores` : "All stores"}</p></div>
    {selectedPerson ? <SegmentedControl label={`${selectedPerson.display_name}'s activity`} value={profileView} onValueChange={(value) => { if (value === "performance" || value === "review" || value === "doordash") setEmployeeView({ owner: selectedPerson.user_id, value }); }} options={[{ value: "performance", label: "Performance" }, { value: "review", label: `Reviews${profile ? ` (${profile.metrics.review_count})` : ""}` }, { value: "doordash", label: `DoorDash${profile ? ` (${profile.metrics.doordash_count})` : ""}` }]} /> : null}
    {error ? <div role="alert" className="panel p-4 text-sm"><p>{error}{data ? " Showing the last loaded results for this selection." : ""}</p><Button variant="outline" className="mt-3" onClick={invalidate}>Retry dashboard</Button></div> : null}
    {data ? <>
      {data.summary.revenue_missing > 0 || data.summary.commission_missing > 0 ? <p role="status" className="panel px-4 py-3 text-sm">Partial source data: {data.summary.revenue_missing} reports lack collected revenue and {data.summary.commission_missing} lack RTF commission. Affected revenue, bonuses, and estimated earnings show known amounts only.</p> : null}
      {recordKind ? <section className="panel flex flex-wrap gap-8 p-4" aria-label="Selected employee record totals"><div><p className="text-xs text-muted-foreground">{recordKind === "review" ? "Reviews" : "DoorDash subscriptions"}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{recordKind === "review" ? data.summary.review_count : data.summary.doordash_count}</p></div><div><p className="text-xs text-muted-foreground">Total bonuses</p><p className="mt-1 text-2xl font-semibold tabular-nums">{money(recordKind === "review" ? data.summary.review_money : data.summary.doordash_money)}</p></div></section> : <ManagerTotals data={data} />}
      {data.summary.record_count === 0 ? <div className="panel p-4"><p className="text-sm font-medium">No records for this selection.</p><p className="mt-1 text-sm text-muted-foreground">Change the people, stores, or dates. Profiles remain visible in People.</p></div> : null}
      {tab === "summary" ? <>
        <div className="manager-analysis-grid"><ManagerTrend data={data} bucket={bucket} /><ManagerComparison data={data} range={range} status={comparisonStatus} /></div>
        <ManagerPeople data={data} onSelect={showProfile} comparisonStatus={comparisonStatus} />
        <div className="manager-secondary-grid"><ManagerCategories categories={data.categories} /><ManagerStores data={data} onSelect={(id) => setStores([id])} /></div>
      </> : null}
      {tab === "people" ? <>
        {!selectedPerson ? <ManagerPeople data={data} onSelect={showProfile} comparisonStatus={comparisonStatus} /> : null}
        {profile && profileView === "performance" ? <>
          <ManagerTrend data={data} bucket={bucket} />
          <div className="manager-secondary-grid"><ManagerCategories categories={profile.categories} id="manager-profile-categories" /><ManagerComparison data={data} range={range} status={comparisonStatus} /></div>
        </> : !selectedPerson ? <ManagerCategories categories={data.categories} /> : null}
      </> : null}
    </> : !error && !recordsVisible ? <div className="panel p-6 text-sm text-muted-foreground" role="status">Loading team performance...</div> : null}
    <div hidden={!recordsVisible}><ManagerRecords key={`${selectedPerson?.user_id ?? "team"}:${profileRecordKind ?? recordKind ?? "all"}`} filters={filters} active={recordsVisible} fixedKind={profileRecordKind ?? recordKind} /></div>
    <span className="sr-only" role="status">{pending && data ? "Updating manager dashboard" : ""}</span>
  </div>;
}

