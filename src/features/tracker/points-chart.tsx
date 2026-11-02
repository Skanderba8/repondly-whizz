import { dateLabel, shiftDate, type Snapshot } from "./domain";

export function PointsChart({ daily, start, end }: { daily: Snapshot["daily"]; start: string; end: string }) {
  const values = new Map(daily.map((row) => [row.work_date, row.points]));
  const days: string[] = [];
  for (let day = start; day <= end; day = shiftDate(day, 1)) days.push(day);
  const ceiling = Math.ceil(Math.max(1, ...daily.map((row) => row.points)) / 4) * 4;
  const step = 720 / days.length;
  const total = daily.reduce((sum, row) => sum + row.points, 0);
  return <div className="px-4 pb-4 md:px-6 md:pb-6">
    <p id="chart-summary" className="mb-5 text-sm text-muted-foreground">{total} reported points across {daily.length} {daily.length === 1 ? "date" : "dates"}. Gaps mean no report; they do not mean zero points.</p>
    <svg viewBox="0 0 800 260" role="img" aria-labelledby="chart-title chart-summary" className="w-full">
      <title id="chart-title">Daily reported points, {dateLabel(start)} to {dateLabel(end)}</title>
      {[0, 1, 2, 3, 4].map((tick) => <g key={tick}><line x1="55" x2="775" y1={220 - tick * 48} y2={220 - tick * 48} stroke="var(--chart-grid)" /><text x="45" y={224 - tick * 48} textAnchor="end" fill="var(--muted-foreground)" fontSize="12">{ceiling * tick / 4}</text></g>)}
      {days.map((day, index) => {
        const value = values.get(day);
        const x = 55 + index * step + step * 0.2;
        const height = value === undefined ? 0 : value / ceiling * 192;
        return <g key={day}>
          {value !== undefined ? <rect x={x} y={220 - Math.max(height, 1)} width={step * 0.6} height={Math.max(height, 1)} rx="3" fill="var(--primary)" stroke="var(--chart-1)"><title>{dateLabel(day)}: {value} points</title></rect> : null}
          {index % Math.max(1, Math.ceil(days.length / 6)) === 0 || index === days.length - 1 ? <text x={x + step * 0.3} y="246" textAnchor="middle" fill="var(--muted-foreground)" fontSize="12">{day.slice(5)}</text> : null}
        </g>;
      })}
    </svg>
    <details className="mt-4"><summary className="cursor-pointer py-2 text-sm font-medium text-link underline underline-offset-4">View chart data</summary><div className="overflow-x-auto"><table className="tracker-table"><caption className="sr-only">Daily points including missing reports</caption><thead><tr><th scope="col">Work date</th><th scope="col" className="text-right">Points</th></tr></thead><tbody>{days.map((day) => <tr key={day}><td>{dateLabel(day)}</td><td className="text-right tabular-nums">{values.get(day) ?? "No report"}</td></tr>)}</tbody></table></div></details>
  </div>;
}
