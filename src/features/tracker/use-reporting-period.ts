"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { shiftDate } from "./domain";
import { presetRange, reportingRangeSchema, type ReportingRange } from "./reporting";
import { useTracker } from "./tracker-provider";

const savedPeriodSchema = z.object({
  version: z.literal(1),
  preset: z.enum(["month", "week", "yesterday", "custom"]),
  range: reportingRangeSchema,
});
type SavedPeriod = z.infer<typeof savedPeriodSchema>;

export function useReportingPeriod(today: string) {
  const { account } = useTracker();
  const storageKey = `whizz-employee-period-v1:${account.role}:${account.userId}`;
  const defaults: SavedPeriod = { version: 1, preset: "month", range: presetRange("month", today) };
  const [restored, setRestored] = useState<{ key: string; period: SavedPeriod | null } | null>(null);
  const ready = restored?.key === storageKey;
  const current = ready && restored?.period ? restored.period : defaults;

  useEffect(() => {
    let period: SavedPeriod | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = savedPeriodSchema.safeParse(JSON.parse(raw));
        if (parsed.success) period = parsed.data;
      }
    } catch { /* Date controls remain usable when browser storage is unavailable. */ }
    setRestored({ key: storageKey, period });
  }, [storageKey]);

  function save(period: SavedPeriod) {
    setRestored({ key: storageKey, period });
    // Persist during selection so immediate navigation restores the new range.
    try { localStorage.setItem(storageKey, JSON.stringify(period)); } catch { /* Keep the current view usable. */ }
  }

  function selectPreset(value: string) {
    if (value !== "month" && value !== "week" && value !== "yesterday") return;
    const yesterday = shiftDate(today, -1);
    const range = value === "yesterday" ? { start: yesterday, end: yesterday } : presetRange(value, today);
    save({ version: 1, preset: value, range });
  }

  function selectRange(range: ReportingRange) {
    const parsed = reportingRangeSchema.safeParse(range);
    if (parsed.success) save({ version: 1, preset: "custom", range: parsed.data });
  }

  return { ready, preset: current.preset, range: current.range, selectPreset, selectRange, reset: () => save(defaults) };
}
