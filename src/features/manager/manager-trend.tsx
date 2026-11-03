"use client";

import { useId, useState } from "react";
import { WorkspacePanel } from "@/components/workspace-panel";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { dateLabel, money, pointsLabel, type Period } from "@/features/tracker/domain";
import { metricLabels, type ManagerData, type ManagerMetric, type ManagerMetrics } from "./manager-data";

export function metricValue(value: number, metric: ManagerMetric) {
  return metric === "revenue" || metric === "extra_bonus" || metric === "total_earnings" ? money(value) : pointsLabel(value);
}
function hasMeasurement(metrics: ManagerMetrics, metric: ManagerMetric) {
  return metric === "points" ? metrics.report_count > 0 : metric === "revenue" ? metrics.report_count > metrics.revenue_missing : metrics.record_count > 0;
}

export function ManagerTrend({ data, bucket }: { data: ManagerData; bucket: Period }) {
  const id = useId();
  const [metric, setMetric] = useState<ManagerMetric>("points");
  const [selected, setSelected] = useState<number | null>(null);
  const series = data.series;
  const index = Math.min(selected ?? Math.max(0, series.findLastIndex((row) => row.metrics.record_count > 0)), Math.max(0, series.length - 1));
  const row = series[index];
  const max = Math.max(1, ...series.flatMap((item) => [item.metrics[metric], item.previous[metric]]));
  const ceiling = Math.ceil(max / 4) * 4;
  const step = 600 / Math.max(1, series.length);
  const y = (value: number) => 190 - Math.max(0, value) / ceiling * 156;
  const x = (position: number) => 76 + (position + 0.5) * step;
  let drawing = false;
  const previousPath = series.map((item, position) => {
    if (!hasMeasurement(item.previous, metric)) { drawing = false; return ""; }
    const command = `${drawing ? "L" : "M"}${x(position)},${y(item.previous[metric])}`;
    drawing = true; return command;
  }).join(" ");
  const axis = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  const isMoney = ["revenue", "extra_bonus", "total_earnings"].includes(metric);
  return <WorkspacePanel id="manager-trend" title={bucket === "day" ? "Daily tracking" : bucket === "week" ? "Weekly tracking" : "Monthly tracking"} action={<SegmentedControl label="Trend metric" value={metric} onValueChange={(next) => setMetric(next as ManagerMetric)} options={[{ value: "points", label: "Points" }, { value: "revenue", label: "Revenue" }, { value: "review_count", label: "Reviews" }, { value: "doordash_count", label: "DoorDash" }]} />}>
    <div className="px-4 pb-4">
      <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="h-2 w-4 rounded-sm bg-primary" aria-hidden="true" />Selected period</span><span className="flex items-center gap-2"><span className="w-4 border-t-2 border-dashed border-chart-1" aria-hidden="true" />Previous {data.series.reduce((days, item) => days + Math.round((Date.parse(item.end) - Date.parse(item.start)) / 86400000) + 1, 0)} days</span></div>
      <div className="manager-horizontal-scroll"><svg viewBox="0 0 720 232" className="w-full min-w-[540px]" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <title id={`${id}-title`}>{metricLabels[metric]} over the selected period</title><desc id={`${id}-desc`}>Bars show the selected period; the dashed line shows the preceding equally long period aligned by day offset. Use the inspection slider or data table for exact values. Missing reports have an outlined marker instead of an invented value.</desc>
        {[0,1,2,3,4].map((tick) => <g key={tick}><line x1="76" x2="676" y1={y(ceiling * tick / 4)} y2={y(ceiling * tick / 4)} stroke="var(--chart-grid)" /><text x="66" y={y(ceiling * tick / 4) + 4} textAnchor="end" fill="var(--muted-foreground)" fontSize="12">{isMoney ? "$" : ""}{axis.format(ceiling * tick / 4)}</text></g>)}
        {series.map((item, position) => {
          const value = item.metrics[metric];
          const measured = hasMeasurement(item.metrics, metric);
          const width = Math.min(36, step * 0.62);
          const showLabel = position % Math.max(1, Math.ceil(series.length / 6)) === 0 || position === series.length - 1;
          return <g key={item.start} className="cursor-pointer" onMouseEnter={() => setSelected(position)} onClick={() => setSelected(position)}>
            <title>{dateLabel(item.start)}: {measured ? metricValue(value, metric) : "No recorded data"}</title>
            <rect x={76+position*step} y="20" width={step} height="172" fill="transparent" />
            {measured ? value > 0 ? <rect x={x(position)-width/2} y={y(value)} width={width} height={190-y(value)} rx="2" fill="var(--primary)" stroke="var(--chart-1)" opacity={position === index ? 1 : 0.7} /> : <line x1={x(position)-width/2} x2={x(position)+width/2} y1="190" y2="190" stroke="var(--chart-1)" strokeWidth="2" /> : <circle cx={x(position)} cy="190" r="3" fill="var(--card)" stroke="var(--muted-foreground)" />}
            {showLabel ? <text x={x(position)} y="212" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${item.start}T12:00:00Z`))}</text> : null}
            {position === index ? <circle cx={x(position)} cy="225" r="2" fill="var(--link)" /> : null}
          </g>;
        })}
        <path d={previousPath} fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeDasharray="5 4" />
        {series.map((item, position) => hasMeasurement(item.previous, metric) ? <circle key={item.start} cx={x(position)} cy={y(item.previous[metric])} r="2" fill="var(--chart-1)" /> : null)}
      </svg></div>
      {row ? <div className="flex min-h-14 flex-wrap items-baseline gap-x-5 gap-y-1 border-t pt-3 text-sm"><span className="font-medium">{dateLabel(row.start)}{row.start !== row.end ? ` to ${dateLabel(row.end)}` : ""}</span><span className="font-semibold tabular-nums">{hasMeasurement(row.metrics, metric) ? metricValue(row.metrics[metric], metric) : "No recorded data"}</span><span className="text-xs text-muted-foreground">Previous: {hasMeasurement(row.previous, metric) ? metricValue(row.previous[metric], metric) : "No recorded data"}</span></div> : null}
      {series.length > 1 ? <label className="mt-2 block text-xs text-muted-foreground">Inspect a {bucket}<input type="range" className="block min-h-11 w-full accent-link" min={0} max={series.length-1} value={index} onChange={(event) => setSelected(Number(event.target.value))} aria-valuetext={row ? `${dateLabel(row.start)}: ${hasMeasurement(row.metrics, metric) ? metricValue(row.metrics[metric], metric) : "No recorded data"}` : "No data"} /></label> : null}
      <div className="sr-only"><table className="tracker-table"><thead><tr><th scope="col">Period</th><th scope="col">Selected</th><th scope="col">Previous</th></tr></thead><tbody>{series.map((item) => <tr key={item.start}><th scope="row">{dateLabel(item.start)} to {dateLabel(item.end)}</th><td>{hasMeasurement(item.metrics, metric) ? metricValue(item.metrics[metric], metric) : "No recorded data"}</td><td>{hasMeasurement(item.previous, metric) ? metricValue(item.previous[metric], metric) : "No recorded data"}</td></tr>)}</tbody></table></div>
    </div>
  </WorkspacePanel>;
}

