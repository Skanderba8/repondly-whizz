import { z } from "zod";
import { historySchema, personSchema, type Period } from "@/features/tracker/domain";
import { getSupabaseClient } from "@/lib/supabase/client";

export const managerMetricsSchema = z.object({
  points: z.number(), point_value: z.number(), revenue: z.number(), commission: z.number(),
  review_count: z.number(), doordash_count: z.number(), review_money: z.number(), doordash_money: z.number(),
  extra_bonus: z.number(), total_earnings: z.number(), report_count: z.number(), record_count: z.number(),
  reported_days: z.number(), revenue_missing: z.number(), commission_missing: z.number(),
  latest_work_date: z.string().nullable(), latest_import: z.string().nullable(),
});
const categorySchema = z.object({ key: z.string(), count: z.number(), revenue: z.number(), count_missing: z.number(), revenue_missing: z.number() });
const managerDashboardSchema = z.object({
  summary: managerMetricsSchema, previous: managerMetricsSchema,
  previous_start: z.string(), previous_end: z.string(),
  series: z.array(z.object({ start: z.string(), end: z.string(), metrics: managerMetricsSchema, previous: managerMetricsSchema })),
  people: z.array(z.object({ user_id: z.uuid(), display_name: z.string(), home_store_id: z.uuid().nullable(), metrics: managerMetricsSchema, previous: managerMetricsSchema, categories: z.array(categorySchema) })),
  stores: z.array(z.object({ id: z.uuid(), name: z.string(), metrics: managerMetricsSchema })),
  categories: z.array(categorySchema),
});
const managerRecordsSchema = z.object({ count: z.number().int().nonnegative(), records: z.array(historySchema) });
export type ManagerMetrics = z.infer<typeof managerMetricsSchema>;
export type ManagerData = z.infer<typeof managerDashboardSchema>;
export type ManagerRecordsData = z.infer<typeof managerRecordsSchema>;
export type ManagerFilters = { start: string; end: string; people: string[] | null; stores: string[] | null; bucket: Period };
export type ManagerRecordFilters = ManagerFilters & { kind: string; page: number; search: string };
export type ManagerMetric = "points" | "revenue" | "review_count" | "doordash_count" | "extra_bonus" | "total_earnings";
export const categoryLabels: Record<string, string> = {
  new_subscriptions: "New subscriptions", bikes_and_batteries: "Bikes and batteries", rtf: "RTF", rtc: "RTC", accessories: "Accessories",
};
export const metricLabels: Record<ManagerMetric, string> = {
  points: "Total points", revenue: "Collected revenue", review_count: "Reviews", doordash_count: "DoorDash", extra_bonus: "Extra bonuses", total_earnings: "Estimated earnings",
};
export function managerFilterKey(filters: ManagerFilters) {
  return `${filters.start}:${filters.end}:${filters.people?.slice().sort().join(",") ?? "all"}:${filters.stores?.slice().sort().join(",") ?? "all"}:${filters.bucket}`;
}
function readError(code: string | undefined) {
  return new Error(code === "PGRST202" || code === "42883" ? "Manager dashboard setup is missing. Apply migration 009, then retry." : "Manager data could not be loaded. Check your access and connection, then retry.");
}
export async function fetchManagerEmployeeRoster() {
  const result = await getSupabaseClient().rpc("manager_employee_roster");
  if (result.error) throw new Error("The verified employee roster could not be loaded. Apply migration 011, check manager access, and retry.");
  return z.array(personSchema).parse(result.data);
}
export async function fetchManagerDashboard(filters: ManagerFilters): Promise<ManagerData> {
  const result = await getSupabaseClient().rpc("manager_dashboard", { p_start: filters.start, p_end: filters.end, p_people: filters.people, p_stores: filters.stores, p_bucket: filters.bucket });
  if (result.error) throw readError(result.error.code);
  return managerDashboardSchema.parse(result.data);
}
export async function fetchManagerRecords(filters: ManagerRecordFilters): Promise<ManagerRecordsData> {
  const result = await getSupabaseClient().rpc("manager_records", { p_start: filters.start, p_end: filters.end, p_people: filters.people, p_stores: filters.stores, p_kind: filters.kind === "all" ? "bonuses" : filters.kind, p_page: filters.page, p_search: filters.search });
  if (result.error) throw readError(result.error.code);
  return managerRecordsSchema.parse(result.data);
}
