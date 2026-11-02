"use client";

import { useId, useState } from "react";
import { WorkspacePanel } from "@/components/workspace-panel";
import { dateLabel, money, pointsLabel, type Period } from "./domain";
import type { Reporting } from "./reporting";

const earnings = [
  { key: "point_value", label: "Point value", color: "var(--chart-1)" },
  { key: "commission", label: "RTF", color: "var(--chart-2)" },
  { key: "reviews", label: "Reviews", color: "var(--chart-3)" },
  { key: "doordash", label: "DoorDash", color: "var(--chart-4)" },
] as const;
const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const axisNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
function amounts(row: Reporting["series"][number]) {
  return [row.point_value, row.commission, row.review_cents / 100, row.doordash_cents / 100];
}

export function ReportingChart({ series, mode, bucket }: { series: Reporting["series"]; mode: "points" | "earnings"; bucket: Period }) {
  const id = useId();
  const initial = Math.max(0, series.map((row) => row.record_count > 0).lastIndexOf(true));
  const [selected, setSelected] = useState(initial);
  const index = Math.min(selected, series.length - 1);
  const row = series[index];
  const currency = mode === "earnings";
  const value = (item: Reporting["series"][number]) => (currency ? item.total_earnings : item.points) ?? 0;
  const ceiling = Math.max(1, ...series.map(value));
  const max = Math.ceil(ceiling / 4) * 4;
  const step = 680 / Math.max(series.length, 1);
  const grouping = bucket === "day" ? "Daily" : bucket === "week" ? "Weekly" : "Monthly";
  const title = `${grouping} ${currency ? "earnings" : "reported points"}`;
  const format = (amount: number | null) => currency ? money(amount ?? 0) : pointsLabel(amount ?? 0);
  return <WorkspacePanel id={`${id}-heading`} title={title}>
    <div className="flex flex-col gap-4 px-4 pb-5 md:px-6">
      <div id={`${id}-description`} className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">{row ? <>{dateLabel(row.start)}{row.start !== row.end ? ` to ${dateLabel(row.end)}` : ""}</> : ""}</p>
        <p className="text-xl font-semibold tabular-nums">{row ? format(value(row)) : format(0)}{!currency ? <span className="ml-1 text-sm font-normal text-muted-foreground">pts</span> : null}</p>
      </div>
      {currency ? <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">{earnings.map((item) => <li key={item.key} className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: item.color }} />{item.label}</li>)}</ul> : null}
      <div className="overflow-x-auto"><svg viewBox="0 0 800 280" role="img" aria-labelledby={`${id}-title ${id}-description`} className="w-full" style={{ minWidth: Math.max(540, series.length * 26) }}>
        <title id={`${id}-title`}>{title}. Each bar is one {bucket}. Use the slider or data table for exact values.</title>
        {[0, 1, 2, 3, 4].map((tick) => <g key={tick}><line x1="85" x2="765" y1={220 - tick * 48} y2={220 - tick * 48} stroke="var(--chart-grid)" /><text x="75" y={224 - tick * 48} textAnchor="end" fill="var(--muted-foreground)" fontSize="13">{currency ? "$" : ""}{axisNumber.format(max * tick / 4)}</text></g>)}
        {series.map((item, position) => {
          const width = Math.min(48, step * 0.65);
          const center = 85 + position * step + step / 2;
          const x = center - width / 2;
          const date = new Date(`${item.start}T12:00:00Z`);
          let offset = 0;
          const sections = currency ? amounts(item) : [item.points];
          const showLabel = series.length <= 7 || position % Math.max(1, Math.ceil(series.length / 7)) === 0 || position === series.length - 1;
          return <g key={item.start} onClick={() => setSelected(position)} onMouseEnter={() => setSelected(position)} className="cursor-pointer">
            <title>{dateLabel(item.start)}{item.start !== item.end ? ` to ${dateLabel(item.end)}` : ""}: {format(value(item))}</title>
            <rect x={85 + position * step} y="20" width={step} height="202" fill="transparent" />
            {sections.map((amount, part) => {
              const height = (amount ?? 0) / max * 192;
              offset += height;
              return amount !== null && amount > 0 ? <rect key={part} x={x} y={220 - offset} width={width} height={height} rx="3" opacity={position === index ? 1 : 0.8} fill={currency ? earnings[part].color : "var(--primary)"} stroke={currency ? "none" : "var(--chart-1)"} /> : null;
            })}
            {value(item) === 0 ? <line x1={x} x2={x + width} y1="220" y2="220" stroke="var(--chart-1)" strokeWidth="2" /> : null}
            {series.length <= 7 || position === index ? <text x={center} y={208 - value(item) / max * 192} textAnchor="middle" fill="var(--foreground)" fontSize="12" fontWeight="600">{currency ? "$" : ""}{axisNumber.format(value(item))}</text> : null}
            {showLabel ? <text x={center} y="245" textAnchor="middle" fill="var(--muted-foreground)" fontSize="12">{bucket === "month" ? monthName.format(date) : monthDay.format(date)}<tspan x={center} dy="18">{bucket === "day" ? weekday.format(date) : bucket === "week" ? "Week" : "Month"}</tspan></text> : null}
            {position === index ? <circle cx={center} cy="275" r="2" fill="var(--link)" /> : null}
          </g>;
        })}
      </svg></div>
      {series.length > 1 ? <label className="flex flex-col gap-1 text-xs text-muted-foreground">Choose a {bucket}<input type="range" min={0} max={series.length - 1} value={Math.max(0, index)} onChange={(event) => setSelected(Number(event.target.value))} aria-valuetext={row ? `${dateLabel(row.start)} to ${dateLabel(row.end)}: ${format(value(row))}` : "0"} className="min-h-11 w-full accent-link" /></label> : null}
      {currency && row?.commission_missing ? <p className="text-xs text-warning-foreground">RTF revenue is incomplete in this period.</p> : null}
      <details><summary className="w-fit cursor-pointer py-2 text-sm text-link">View chart data</summary><div className="overflow-x-auto"><table className="tracker-table"><caption className="sr-only">{title}, exact values by period</caption><thead><tr><th scope="col">{bucket === "day" ? "Day" : bucket === "week" ? "Week" : "Month"}</th>{currency ? <><th scope="col">Point value</th><th scope="col">RTF</th><th scope="col">Reviews</th><th scope="col">DoorDash</th><th scope="col">Total</th></> : <th scope="col">Points</th>}</tr></thead><tbody>{series.map((item) => <tr key={item.start}><th scope="row" className="px-4 py-3 text-left text-xs font-medium">{dateLabel(item.start)}{item.start !== item.end ? ` to ${dateLabel(item.end)}` : ""}</th>{currency ? <>{amounts(item).map((amount, part) => <td key={part} className="whitespace-nowrap tabular-nums">{amount === null ? "Unavailable" : money(amount)}</td>)}<td className="whitespace-nowrap tabular-nums">{format(item.total_earnings)}{item.commission_missing ? " (partial)" : ""}</td></> : <td className="tabular-nums">{pointsLabel(item.points ?? 0)}</td>}</tr>)}</tbody></table></div></details>
    </div>
  </WorkspacePanel>;
}
