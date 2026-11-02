import { z } from "zod";

export const storeSchema = z.object({ id: z.uuid(), name: z.string(), timezone: z.string() });
export const personSchema = z.object({ user_id: z.uuid(), display_name: z.string(), report_name: z.string(), home_store_id: z.uuid().nullable() });
export const contextSchema = z.object({ people: z.array(personSchema), stores: z.array(storeSchema), screenshot_max_bytes: z.number().int().positive().nullable() });
export const historySchema = z.object({
  id: z.uuid(), work_date: z.string(), store_id: z.uuid(), kind: z.enum(["productivity", "review", "doordash"]),
  points: z.number().nullable(), bonus_cents: z.number().nullable(), note: z.string(),
  subscription_number: z.string().nullable(), dd_proof_added: z.boolean().nullable(),
  screenshot_path: z.string().nullable(), recorded_at: z.string(), source_sent_at: z.string().nullable(),
  activity: z.record(z.string(), z.number().nullable()).nullable(), rtf_revenue_cents: z.number().nullable(),
  owner_id: z.uuid().optional(), display_name: z.string().optional(),
});
export const snapshotSchema = z.object({
  points: z.number().nullable(), report_count: z.number(), commission: z.number().nullable(), commission_missing: z.number(),
  review_cents: z.number(), review_count: z.number(), doordash_cents: z.number(), doordash_count: z.number(), proof_missing: z.number(),
  last_import: z.string().nullable(), daily: z.array(z.object({ work_date: z.string(), points: z.number() })),
  history_count: z.number(), history: z.array(historySchema),
});
export type TrackerContext = z.infer<typeof contextSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type HistoryRecord = z.infer<typeof historySchema>;
export type Period = "day" | "week" | "month";

export function localDate(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}-${parts.find((p) => p.type === "day")?.value}`;
}

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function periodRange(date: string, period: Period) {
  if (period === "day") return { start: date, end: date };
  if (period === "week") {
    const start = shiftDate(date, -new Date(`${date}T12:00:00Z`).getUTCDay());
    return { start, end: shiftDate(start, 6) };
  }
  const start = `${date.slice(0, 7)}-01`;
  const next = new Date(`${start}T12:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { start, end: shiftDate(next.toISOString().slice(0, 10), -1) };
}

export function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
export function money(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(amount);
}

export function pointsLabel(value: number | null) {
  return value === null ? "No reports" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export function movePeriod(date: string, period: Period, direction: number) {
  if (period !== "month") return shiftDate(date, direction * (period === "week" ? 7 : 1));
  const value = new Date(`${date.slice(0, 7)}-01T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + direction);
  return value.toISOString().slice(0, 10);
}
