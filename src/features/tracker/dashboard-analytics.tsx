"use client";

import { Button } from "@/components/ui/button";
import { WorkspacePanel } from "@/components/workspace-panel";
import { money, pointsLabel } from "./domain";
import type { Reporting } from "./reporting";

const activityLabels: Record<string, string> = {
  new_subscriptions: "New subscriptions", bikes_and_batteries: "Bikes and batteries",
  rtf: "RTF", rtc: "RTC", accessories: "Accessories",
};

function CategoryValue({ value, maximum, currency = false, compare, label }: {
  value: number | null; maximum: number | null; currency?: boolean; compare: boolean; label: string;
}) {
  const format = (amount: number) => currency ? money(amount) : pointsLabel(amount);
  const percent = value !== null && maximum !== null && maximum > 0 ? Math.min(100, Math.max(0, value / maximum * 100)) : 0;
  return <div className="flex min-w-28 flex-col gap-2">
    <span className="text-base font-semibold tabular-nums">{value === null ? "Unavailable" : format(value)}</span>
    {compare && value !== null && maximum !== null ? <>
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={Math.max(maximum, value, 1)} aria-valuenow={value} aria-valuetext={`${format(value)}; team high ${format(maximum)}`} className="category-benchmark-track"><div className="category-benchmark-fill" style={{ width: `${percent}%` }} /></div>
      <span className="text-xs text-muted-foreground">Team high <span className="tabular-nums">{format(maximum)}</span></span>
    </> : null}
  </div>;
}

export function DashboardAnalytics({ data, owner, accountId, onSelect }: {
  data: Reporting; owner: string; accountId: string; onSelect: (owner: string) => void;
}) {
  const s = data.summary;
  const compare = owner !== "team";
  return <>
    <section aria-label="Selected-period totals" className="panel overview-totals">
      <dl className="grid grid-cols-2 lg:grid-cols-4">{[
        { label: "Total points", value: pointsLabel(s.points ?? 0), detail: `${s.report_count} imported reports` },
        { label: "Point value", value: money(s.point_value ?? 0), detail: "$0.50 per point" },
        { label: "Extra bonuses", value: money(s.extra_bonus ?? 0), detail: "RTF, reviews and DoorDash" },
        { label: "Estimated earnings", value: money(s.total_earnings ?? 0), detail: "Point value + extra bonuses" },
      ].map((stat) => <div key={stat.label} className="overview-total"><dt className="text-sm font-medium text-muted-foreground">{stat.label}</dt><dd className="my-1 break-words text-[28px] leading-9 font-semibold tracking-tight tabular-nums">{stat.value}</dd><p className="text-xs text-muted-foreground">{stat.detail}</p></div>)}</dl>
    </section>
    <div className="overview-detail-grid">
      <WorkspacePanel id="activity-categories" title="Activity by category" action={<span className="text-xs text-muted-foreground">{compare ? "Compared with team highs" : "Whole team totals"}</span>}>
        <div className="overview-detail-body">
          {compare && !data.team_benchmarks ? <p className="px-4 pb-3 text-xs text-muted-foreground">Team comparison unavailable. Refresh to retry.</p> : null}
          <div role="region" aria-label="Category counts and revenue with team comparisons" tabIndex={0} className="min-w-0 overflow-x-auto">
            <table className="tracker-table overview-category-table min-w-[480px]">
              <caption className="sr-only">Activity for the selected period, with each measure compared to the highest individual total in the team</caption>
              <thead><tr><th scope="col">Category</th><th scope="col">Activity count</th><th scope="col">Collected revenue</th></tr></thead>
              <tbody>{data.categories.map((row) => {
                const benchmark = data.team_benchmarks?.find((item) => item.key === row.key);
                const label = activityLabels[row.key] ?? row.key;
                return <tr key={row.key}>
                  <th scope="row">{label}</th>
                  <td><CategoryValue value={row.count} maximum={benchmark?.count_max ?? null} compare={compare} label={`${label} count compared with the team high`} /></td>
                  <td><CategoryValue value={row.revenue} maximum={benchmark?.revenue_max ?? null} currency compare={compare} label={`${label} revenue compared with the team high`} /></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          {!data.categories.length || s.report_count === 0 ? <p className="px-4 py-3 text-sm text-muted-foreground">No imported activity in this period.</p> : null}
          {data.members.length ? <details className="border-t">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Team totals <span className="text-muted-foreground">({data.members.length})</span></summary>
            <ul className="divide-y">{data.members.map((member) => <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <span className="text-sm">{member.display_name}{member.user_id === accountId ? " (you)" : ""}</span>
              <div className="flex items-center gap-3"><span className="text-sm tabular-nums">{pointsLabel(member.points)} points</span><Button variant="ghost" onClick={() => onSelect(member.user_id)} aria-label={`View ${member.display_name}'s overview`}>View</Button></div>
            </li>)}</ul>
          </details> : null}
        </div>
      </WorkspacePanel>
      <WorkspacePanel id="earnings-breakdown" title="Extra bonus breakdown" action={<span className="text-xl font-semibold tabular-nums">{money(s.extra_bonus ?? 0)}</span>}>
        <div className="overview-detail-body overview-bonus-body">
          <dl className="overview-bonus-list">{[
            { label: "RTF commission", value: s.commission, detail: "2.5% of collected RTF revenue" },
            { label: "Google reviews", value: s.review_cents / 100, detail: `${s.review_count} reviews × $2` },
            { label: "DoorDash", value: s.doordash_cents / 100, detail: `${s.doordash_count} subscriptions × $5` },
          ].map((item) => <div key={item.label} className="overview-bonus-row">
            <div><dt className="text-sm font-semibold">{item.label}</dt><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p></div>
            <dd className="text-2xl font-semibold tracking-tight tabular-nums">{item.value === null ? "Unavailable" : money(item.value)}</dd>
          </div>)}</dl>
          <p className="border-t px-5 py-3 text-xs text-muted-foreground">Bonuses are separate from your point value.</p>
        </div>
      </WorkspacePanel>
    </div>
  </>;
}
