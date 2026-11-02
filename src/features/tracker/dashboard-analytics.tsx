"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { WorkspacePanel } from "@/components/workspace-panel";
import { money, pointsLabel, type Period } from "./domain";
import { comparisonScale, type ComparisonMetric, type Reporting } from "./reporting";
import { ReportingChart } from "./reporting-charts";

const activityLabels: Record<string, string> = {
  new_subscriptions: "New subscriptions", bikes_and_batteries: "Bikes and batteries",
  rtf: "RTF", rtc: "RTC", accessories: "Accessories",
};
const comparisonOptions = [
  { value: "points", label: "Reported points" }, { value: "commission", label: "RTF commission" },
  { value: "review_count", label: "Google reviews" }, { value: "doordash_count", label: "DoorDash subscriptions" },
];

function ValueBar({ percent }: { percent: number }) {
  return <div aria-hidden="true" className="meter-track"><div className="meter-fill" style={{ width: `${percent}%` }} /></div>;
}

export function DashboardAnalytics({ data, bucket, owner, accountId, onSelect }: {
  data: Reporting; bucket: Period; owner: string; accountId: string; onSelect: (owner: string) => void;
}) {
  const [comparison, setComparison] = useState<ComparisonMetric>("points");
  const s = data.summary;
  const incomplete = s.commission_missing > 0 || s.report_count === 0;
  const countMax = Math.max(1, ...data.categories.map((row) => row.count ?? 0));
  const revenueMax = Math.max(1, ...data.categories.map((row) => row.revenue ?? 0));
  const comparisonValues = data.members.map((member) => member[comparison]);
  return <>
    <section aria-label="Selected-period totals" className="panel">
      <dl className="grid divide-y sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4">{[
        { label: "Reported points", value: pointsLabel(s.points ?? 0), detail: `${s.report_count} imported reports` },
        { label: "Point value", value: money(s.point_value ?? 0), detail: "Reported points × $0.50" },
        { label: "Extra bonuses", value: money(s.extra_bonus ?? 0), detail: `RTF + reviews + DoorDash${incomplete ? " · known amounts" : ""}` },
        { label: "Total estimated earnings", value: money(s.total_earnings ?? 0), detail: `Point value + extra bonuses${incomplete ? " · incomplete source data" : ""}` },
      ].map((stat) => <div key={stat.label} className="dashboard-stat"><dt className="text-sm text-muted-foreground">{stat.label}</dt><dd className="tracker-metric break-words">{stat.value}</dd><p className="metric-caption">{stat.detail}</p></div>)}</dl>
    </section>
    <div className="grid items-start gap-6"><ReportingChart series={data.series} bucket={bucket} mode="points" /><ReportingChart series={data.series} bucket={bucket} mode="earnings" /></div>
    <WorkspacePanel id="earnings-breakdown" title="Extra bonus breakdown">
      <dl className="grid gap-6 px-4 pb-5 sm:grid-cols-3 md:px-6">{[
        { label: "RTF commission", value: s.commission, detail: `2.5% of collected RTF revenue${s.commission_missing ? ` · ${s.commission_missing} reports missing revenue` : ""}` },
        { label: "Google reviews", value: s.review_cents / 100, detail: `${s.review_count} reviews × $2` },
        { label: "DoorDash", value: s.doordash_cents / 100, detail: `${s.doordash_count} subscriptions × $5` },
      ].map((item) => <div key={item.label} className="flex flex-col gap-2"><dt className="text-sm text-muted-foreground">{item.label}</dt><dd className="text-2xl font-semibold tabular-nums">{item.value === null ? "Unavailable" : money(item.value)}</dd><p className="metric-caption">{item.detail}</p></div>)}</dl>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground md:px-6">All values use the selected date range. Estimates are tracking amounts, not confirmed payouts. Missing source data can make totals incomplete.</p>
    </WorkspacePanel>
    <WorkspacePanel id="activity-categories" title="Activity by category" action={<span className="text-xs text-muted-foreground">Reported counts and revenue, not category points</span>}>
      <div role="region" aria-label="Activity by category, scroll for revenue" tabIndex={0} className="overflow-x-auto"><table className="tracker-table min-w-[520px]"><caption className="sr-only">Selected-period category counts and collected revenue</caption><thead><tr><th scope="col">Category</th><th scope="col">Activity count</th><th scope="col">Collected revenue</th></tr></thead><tbody>{data.categories.map((row) => <tr key={row.key}><th scope="row" className="px-4 py-3 text-left text-sm font-medium">{activityLabels[row.key] ?? row.key}</th><td><p className="mb-2 font-medium tabular-nums">{row.count === null ? "Unavailable" : row.count.toLocaleString()}</p><ValueBar percent={(row.count ?? 0) / countMax * 100} />{row.count_missing ? <p className="mt-1 text-xs text-muted-foreground">{row.count_missing} reports missing count</p> : null}</td><td><p className="mb-2 font-medium tabular-nums">{row.revenue === null ? "Unavailable" : money(row.revenue)}</p><ValueBar percent={(row.revenue ?? 0) / revenueMax * 100} />{row.revenue_missing ? <p className="mt-1 text-xs text-muted-foreground">{row.revenue_missing} reports missing revenue</p> : null}</td></tr>)}</tbody></table></div>
      
    </WorkspacePanel>
    {data.members.length ? <WorkspacePanel id="team-comparisons" title="Team comparisons" action={<div className="w-full sm:w-56"><Select aria-label="Comparison metric" value={comparison} onValueChange={(value) => setComparison(value as ComparisonMetric)} options={comparisonOptions} /></div>}>
      <p className="px-4 pb-4 text-xs text-muted-foreground md:px-6">Highest known value fills the bar. Crowns mark positive leaders, including ties. Only managers can see this comparison.</p>
      <ul className="divide-y">{data.members.map((member) => {
        const amount = member[comparison];
        const scale = comparisonScale(amount, comparisonValues);
        return <li key={member.user_id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(120px,1fr)_auto] sm:items-center md:px-6"><div className="min-w-0"><p className="flex items-center gap-2 text-sm font-medium"><span className="break-words">{member.display_name}{member.user_id === accountId ? " (you)" : ""}</span>{scale.leader ? <Crown role="img" aria-label="Highest value in this category" className="size-4 shrink-0 text-warning-foreground" /> : null}</p><p className="text-xs text-muted-foreground">{member.report_count} reports{member.commission_missing && comparison === "commission" ? " · partial RTF revenue" : ""}</p></div><div className="flex flex-col gap-2"><span className="text-sm font-semibold tabular-nums">{amount === null ? "Unavailable" : comparison === "commission" ? money(amount) : amount.toLocaleString()}</span><ValueBar percent={scale.percent} /></div><Button variant={member.user_id === owner ? "secondary" : "outline"} aria-label={`View ${member.display_name}'s records`} onClick={() => onSelect(member.user_id)}>View records</Button></li>;
      })}</ul>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground md:px-6">Alphabetical · {data.members.length} mapped accounts. Unmapped people and uncollected reports are not included.{owner === "team" ? ` ${data.members_with_reports} of ${data.mapped_members} members have imported reports in this range.` : ""}</p>
    </WorkspacePanel> : null}
  </>;
}


