"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useTracker } from "@/features/tracker/tracker-provider";
import { shiftDate } from "@/features/tracker/domain";
import { presetRange, reportingRangeSchema, type ReportingRange } from "@/features/tracker/reporting";

const savedFiltersSchema = z.object({
  version: z.literal(1),
  people: z.array(z.uuid()).max(100).nullable(),
  stores: z.array(z.uuid()).max(100).nullable(),
  preset: z.enum(["month", "week", "today", "yesterday", "custom"]),
  range: reportingRangeSchema,
  tab: z.enum(["summary", "people", "records"]),
});
type SavedFilters = z.infer<typeof savedFiltersSchema>;

export function useManagerFilters(today: string) {
  const { account, context } = useTracker();
  const storageKey = `whizz-manager-filters-v1:${account.role}:${account.userId}`;
  const defaults = useMemo<SavedFilters>(() => ({ version: 1, people: null, stores: null, preset: "month", range: presetRange("month", today), tab: "summary" }), [today]);
  const [restored, setRestored] = useState<{ key: string; filters: SavedFilters | null } | null>(null);
  const ready = restored?.key === storageKey;
  const current = ready && restored?.filters ? restored.filters : defaults;

  useEffect(() => {
    let filters: SavedFilters | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = savedFiltersSchema.safeParse(JSON.parse(raw));
        if (parsed.success) filters = parsed.data;
      }
    } catch { /* Filters remain usable when browser storage is unavailable. */ }
    setRestored({ key: storageKey, filters });
  }, [storageKey]);
  useEffect(() => {
    if (!ready || !restored?.filters) return;
    try { localStorage.setItem(storageKey, JSON.stringify(restored.filters)); } catch { /* Keep the selection in memory. */ }
  }, [ready, restored, storageKey]);

  // Never turn an unavailable saved employee/store into the broader All scope.
  const people = useMemo(() => current.people?.filter((id) => context?.people.some((person) => person.user_id === id)) ?? null, [current.people, context?.people]);
  const stores = useMemo(() => current.stores?.filter((id) => context?.stores.some((store) => store.id === id)) ?? null, [current.stores, context?.stores]);
  function update(patch: Partial<SavedFilters>) {
    setRestored((previous) => ({ key: storageKey, filters: { ...(previous?.key === storageKey && previous.filters ? previous.filters : defaults), ...patch } }));
  }
  function selectPreset(value: string) {
    if (value !== "month" && value !== "week" && value !== "today" && value !== "yesterday") return;
    const day = value === "yesterday" ? shiftDate(today, -1) : today;
    const range = value === "month" || value === "week" ? presetRange(value, today) : { start: day, end: day };
    update({ preset: value, range });
  }
  function selectRange(range: ReportingRange) {
    const parsed = reportingRangeSchema.safeParse(range);
    if (parsed.success) update({ preset: "custom", range: parsed.data });
  }
  function setTab(value: string) {
    if (value === "summary" || value === "people" || value === "records") update({ tab: value });
  }
  function reset() { setRestored({ key: storageKey, filters: defaults }); }
  return {
    ready, people, stores, preset: current.preset, range: current.range, tab: current.tab,
    setPeople: (value: string[] | null) => update({ people: value }),
    setStores: (value: string[] | null) => update({ stores: value }),
    selectPreset, selectRange, setTab, reset,
  };
}
