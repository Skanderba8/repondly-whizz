import { z } from "zod";
import { periodRange, shiftDate, type Period } from "./domain";

export const rangeOptions = [
  { value: "week", label: "This week" }, { value: "month", label: "This month" },
  { value: "last-month", label: "Last month" },
] as const;
export type RangePreset = typeof rangeOptions[number]["value"] | "custom";
export type ReportingRange = { start: string; end: string };
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date in YYYY-MM-DD format.").refine((value) => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Enter a valid date.");
export const reportingRangeSchema = z.object({ start: isoDate, end: isoDate }).superRefine((range, context) => {
  if (range.end < range.start) context.addIssue({ code: "custom", path: ["end"], message: "Finish must be on or after Start." });
  if (rangeDays(range) > 3661) context.addIssue({ code: "custom", path: ["end"], message: "Choose a range of no more than ten years." });
});

export function rangeDays(range: ReportingRange) {
  return Math.round((Date.parse(`${range.end}T12:00:00Z`) - Date.parse(`${range.start}T12:00:00Z`)) / 86_400_000) + 1;
}

export function presetRange(preset: Exclude<RangePreset, "custom">, today: string): ReportingRange {
  if (preset === "last-month") return periodRange(shiftDate(`${today.slice(0, 7)}-01`, -1), "month");
  return { start: periodRange(today, preset).start, end: today };
}

export function chartBucket(range: ReportingRange): Period {
  const days = rangeDays(range);
  return days <= 31 ? "day" : days <= 180 ? "week" : "month";
}

export const reportingAmountsSchema = z.object({
  record_count: z.number(), report_count: z.number(), points: z.number().nullable(), point_value: z.number().nullable(),
  commission: z.number().nullable(), commission_missing: z.number(), review_cents: z.number(), review_count: z.number(),
  doordash_cents: z.number(), doordash_count: z.number(), extra_bonus: z.number().nullable(), total_earnings: z.number().nullable(),
});
export const reportingSchema = z.object({
  summary: reportingAmountsSchema,
  series: z.array(reportingAmountsSchema.extend({ start: isoDate, end: isoDate })),
  categories: z.array(z.object({ key: z.string(), count: z.number().nullable(), revenue: z.number().nullable(), count_missing: z.number(), revenue_missing: z.number() })),
  members: z.array(reportingAmountsSchema.extend({ user_id: z.uuid(), display_name: z.string() })),
  availability: z.object({ first_report: isoDate.nullable(), last_report: isoDate.nullable(), first_entry: isoDate.nullable(), last_entry: isoDate.nullable(), last_import: z.string().nullable(), last_source_sent: z.string().nullable() }),
  mapped_members: z.number(), members_with_reports: z.number(),
});
export type Reporting = z.infer<typeof reportingSchema>;
export type ReportingAmounts = z.infer<typeof reportingAmountsSchema>;
export type ComparisonMetric = "points" | "commission" | "review_count" | "doordash_count";

export function comparisonScale(value: number | null, values: (number | null)[]) {
  const maximum = Math.max(0, ...values.map((item) => item ?? 0));
  return { percent: maximum > 0 && value !== null ? Math.max(0, value / maximum * 100) : 0, leader: maximum > 0 && value === maximum };
}

export function availableRange(availability: Reporting["availability"]): ReportingRange | null {
  const first = [availability.first_report, availability.first_entry].filter((value): value is string => value !== null).sort();
  const last = [availability.last_report, availability.last_entry].filter((value): value is string => value !== null).sort();
  return first.length && last.length ? { start: first[0], end: last[last.length - 1] } : null;
}
