"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { WorkspacePanel } from "@/components/workspace-panel";
import { dateLabel, money, pointsLabel } from "@/features/tracker/domain";
import { categoryLabels, metricLabels, type ManagerData, type ManagerMetric, type ManagerMetrics } from "./manager-data";
import { metricValue } from "./manager-trend";

const metricKeys: ManagerMetric[] = ["points", "revenue", "extra_bonus", "total_earnings", "review_count", "doordash_count"];
type ComparisonStatus = "ready" | "updating" | "unavailable";
export function ManagerTotals({ data }: { data: ManagerData }) {
  return <section className="panel overflow-hidden" aria-label="Selected scope totals"><dl className="grid grid-cols-2 divide-x md:grid-cols-3 xl:grid-cols-6">{metricKeys.map((metric) => <div key={metric} className="manager-total"><dt className="text-xs font-medium text-muted-foreground">{metricLabels[metric]}</dt><dd className="mt-1 break-words text-2xl font-semibold tracking-tight tabular-nums">{metricValue(data.summary[metric], metric)}</dd>{metric === "review_count" ? <p className="mt-1 text-xs text-muted-foreground">{money(data.summary.review_money)}</p> : metric === "doordash_count" ? <p className="mt-1 text-xs text-muted-foreground">{money(data.summary.doordash_money)}</p> : metric === "points" ? <p className="mt-1 text-xs text-muted-foreground">{data.summary.report_count} reports</p> : metric === "extra_bonus" ? <p className="mt-1 text-xs text-muted-foreground">RTF + reviews + DoorDash</p> : null}</div>)}</dl></section>;
}
function changeLabel(current: ManagerMetrics, previous: ManagerMetrics, metric: ManagerMetric, status: ComparisonStatus = "ready") {
  if (status !== "ready") return status === "updating" ? "Updating..." : "Unavailable";
  const usesReports = metric === "points" || metric === "revenue";
  if (usesReports && current.report_count === 0) return "No current reports";
  if (usesReports && previous.report_count === 0) return "No earlier reports";
  if (metric === "revenue" && (current.revenue_missing > 0 || previous.revenue_missing > 0)) return "Revenue missing";
  if ((metric === "extra_bonus" || metric === "total_earnings") && (current.commission_missing > 0 || previous.commission_missing > 0)) return "RTF commission missing";
  // Compare the same two-decimal values shown in the table, avoiding signed zero changes.
  const currentValue = Math.round(current[metric] * 100);
  const previousValue = Math.round(previous[metric] * 100);
  const difference = (currentValue - previousValue) / 100;
  if (difference === 0) return "No change";
  const percentage = previousValue > 0 ? (currentValue - previousValue) / previousValue * 100 : null;
  const relative = percentage === null ? `from ${metricValue(0, metric)}` : Math.abs(percentage) < 0.05 ? "less than 0.1%" : `${percentage > 0 ? "+" : ""}${percentage.toFixed(1)}%`;
  return `${difference > 0 ? "+" : "-"}${metricValue(Math.abs(difference), metric)} (${relative})`;
}
export function ManagerComparison({ data, range, status = "ready" }: { data: ManagerData; range: { start: string; end: string }; status?: ComparisonStatus }) {
  const withReports = data.people.filter((person) => person.metrics.report_count > 0).length;
  return <WorkspacePanel id="manager-comparison" title="Period comparison">
    <div className="space-y-1 px-4 pb-3 text-xs text-muted-foreground"><p>{dateLabel(range.start)} to {dateLabel(range.end)}</p><p>Against {dateLabel(data.previous_start)} to {dateLabel(data.previous_end)} · Same employees and stores</p>{status !== "ready" ? <p role="status">{status === "updating" ? "Refreshing comparison. Amounts show the last loaded results." : "Comparison unavailable. Retry the dashboard to refresh these amounts."}</p> : null}</div>
    <div className="manager-horizontal-scroll"><table className="tracker-table manager-table"><thead><tr><th scope="col">Metric</th><th scope="col" className="text-right">Current</th><th scope="col" className="text-right">Previous</th><th scope="col" className="text-right">Change</th></tr></thead><tbody>{metricKeys.map((metric) => <tr key={metric}><th scope="row">{metricLabels[metric]}</th><td className="text-right whitespace-nowrap font-medium tabular-nums">{metricValue(data.summary[metric], metric)}</td><td className="text-right whitespace-nowrap tabular-nums">{metricValue(data.previous[metric], metric)}</td><td className="text-right text-xs tabular-nums">{changeLabel(data.summary, data.previous, metric, status)}</td></tr>)}</tbody></table></div>
    <div className="space-y-2 px-4 py-3 text-xs text-muted-foreground"><p>{withReports} of {data.people.length} selected people have imported reports.</p></div>
  </WorkspacePanel>;
}
export function ManagerCategories({ categories, id = "manager-categories" }: { categories: ManagerData["categories"]; id?: string }) {
  const maximum = Math.max(1, ...categories.map((row) => row.count));
  return <WorkspacePanel id={id} title="Activity by category">
    <div className="manager-horizontal-scroll"><table className="tracker-table manager-table min-w-[400px]"><thead><tr><th scope="col">Category</th><th scope="col">Count</th><th scope="col" className="text-right">Collected revenue</th></tr></thead><tbody>{categories.map((row) => <tr key={row.key}><th scope="row">{categoryLabels[row.key] ?? row.key}</th><td className="min-w-28"><span className="font-medium tabular-nums">{pointsLabel(row.count)}</span><div className="mt-1.5 category-benchmark-track" aria-hidden="true"><div className="category-benchmark-fill" style={{ width: `${row.count/maximum*100}%` }} /></div></td><td className="text-right whitespace-nowrap tabular-nums">{money(row.revenue)}</td></tr>)}</tbody></table></div>
    <p className="px-4 py-3 text-xs text-muted-foreground">Counts and revenue by type; points use the reported total.</p>
  </WorkspacePanel>;
}
export function ManagerPeople({ data, onSelect, comparisonStatus = "ready" }: { data: ManagerData; onSelect: (id: string) => void; comparisonStatus?: ComparisonStatus }) {
  const [sort, setSort] = useState("value");
  const [comparison, setComparison] = useState<ManagerMetric>("points");
  const people = [...data.people].sort((a,b) => sort === "name" ? a.display_name.localeCompare(b.display_name) : b.metrics[comparison]-a.metrics[comparison] || a.display_name.localeCompare(b.display_name));
  const maximum = Math.max(0, ...people.map((person) => person.metrics[comparison]));
  return <WorkspacePanel id="manager-people" title="Employee performance" action={<div className="flex flex-wrap gap-2"><Select className="w-44" aria-label="Employee comparison metric" value={comparison} onValueChange={(value) => setComparison(value as ManagerMetric)} options={metricKeys.map((value) => ({ value, label: metricLabels[value] }))} /><Select className="w-40" aria-label="Employee ordering" value={sort} onValueChange={setSort} options={[{ value: "name", label: "Alphabetical" }, { value: "value", label: "Highest value" }]} /></div>}>
    <div className="manager-horizontal-scroll"><table className="tracker-table manager-table min-w-[960px]"><thead><tr><th scope="col">Person</th><th scope="col">Relative {metricLabels[comparison].toLowerCase()}</th><th scope="col" className="text-right">Points</th><th scope="col" className="text-right">Revenue</th><th scope="col" className="text-right">Bonuses</th><th scope="col" className="text-right">Reviews</th><th scope="col" className="text-right">DoorDash</th><th scope="col" className="text-right">Point change</th><th scope="col"><span className="sr-only">Profile</span></th></tr></thead><tbody>{people.map((person) => <tr key={person.user_id}>
      <th scope="row"><span className="font-medium text-foreground">{person.display_name}</span><span className="mt-1 block text-xs text-muted-foreground">{person.metrics.report_count} reports · {person.metrics.reported_days} reported days</span></th>
      <td className="min-w-36"><span className="text-xs text-muted-foreground tabular-nums">{(person.metrics[comparison]/(maximum || 1)*100).toLocaleString(undefined, { maximumFractionDigits: 1 })}% of selected high</span><div aria-hidden="true" className="mt-1.5 category-benchmark-track"><div className="category-benchmark-fill" style={{ width: `${person.metrics[comparison]/(maximum || 1)*100}%` }} /></div></td>
      <td className="text-right tabular-nums">{pointsLabel(person.metrics.points)}</td><td className="text-right whitespace-nowrap tabular-nums">{money(person.metrics.revenue)}</td><td className="text-right whitespace-nowrap tabular-nums">{money(person.metrics.extra_bonus)}</td><td className="text-right tabular-nums">{person.metrics.review_count}</td><td className="text-right tabular-nums">{person.metrics.doordash_count}</td><td className="max-w-44 text-right text-xs tabular-nums">{changeLabel(person.metrics,person.previous,"points",comparisonStatus)}</td><td><Button variant="outline" onClick={() => onSelect(person.user_id)} aria-label={`View ${person.display_name}'s profile`}>View profile</Button></td>
    </tr>)}</tbody></table></div>
    {!people.length ? <p className="p-4 text-sm text-muted-foreground">No mapped profiles match this selection.</p> : null}
  </WorkspacePanel>;
}
export function ManagerStores({ data, onSelect }: { data: ManagerData; onSelect: (id: string) => void }) {
  return <WorkspacePanel id="manager-stores" title="Store performance"><div className="manager-horizontal-scroll"><table className="tracker-table manager-table min-w-[520px]"><thead><tr><th scope="col">Store</th><th scope="col" className="text-right">Points</th><th scope="col" className="text-right">Revenue</th><th scope="col" className="text-right">Reviews / DD</th><th scope="col"><span className="sr-only">Select store</span></th></tr></thead><tbody>{data.stores.map((store) => <tr key={store.id}><th scope="row">{store.name}</th><td className="text-right tabular-nums">{pointsLabel(store.metrics.points)}</td><td className="text-right whitespace-nowrap tabular-nums">{money(store.metrics.revenue)}</td><td className="text-right tabular-nums">{store.metrics.review_count} / {store.metrics.doordash_count}</td><td><Button variant="ghost" onClick={() => onSelect(store.id)} aria-label={`Filter to ${store.name}`}>View</Button></td></tr>)}</tbody></table></div></WorkspacePanel>;
}

