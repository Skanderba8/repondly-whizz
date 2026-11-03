"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { WorkspaceAccount } from "@/features/access/access";
import { getSupabaseClient } from "@/lib/supabase/client";
import { contextSchema, snapshotSchema, type TrackerContext, type Snapshot, type Period } from "./domain";
import { categoryBenchmarksSchema, reportingSchema, type Reporting } from "./reporting";

type TrackerState = {
  account: WorkspaceAccount;
  context: TrackerContext | null;
  error: string;
  reload: () => void;
  loadSnapshot: (owner: string, start: string, end: string, page: number, kind?: string) => Promise<Snapshot>;
  loadReporting: (owner: string, start: string, end: string, bucket: Period) => Promise<Reporting>;
  invalidate: () => void;
  version: number;
};
const Tracker = createContext<TrackerState | null>(null);

export function TrackerProvider({ account, children }: { account: WorkspaceAccount; children: React.ReactNode }) {
  const [context, setContext] = useState<TrackerContext | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [revision, setRevision] = useState(0);
  const cache = useRef(new Map<string, Promise<Snapshot>>());
  const dashboardCache = useRef(new Map<string, Promise<Reporting>>());
  const inFlight = useRef(new Set<Promise<unknown>>());
  const invalidate = useCallback(() => { cache.current.clear(); dashboardCache.current.clear(); setVersion((value) => value + 1); }, []);
  useEffect(() => {
    let lastRefresh = 0;
    function refreshTracker() {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh < 30_000 || inFlight.current.size > 0) return;
      lastRefresh = Date.now();
      invalidate();
      setRevision((value) => value + 1);
    }
    const timer = window.setInterval(refreshTracker, 60_000);
    window.addEventListener("focus", refreshTracker);
    document.addEventListener("visibilitychange", refreshTracker);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshTracker); document.removeEventListener("visibilitychange", refreshTracker); };
  }, [invalidate]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await getSupabaseClient().rpc("tracker_context");
        if (result.error) throw result.error;
        const parsed = contextSchema.parse(result.data);
        if (active) { setContext(parsed); setError(""); }
      } catch {
        if (active) setError("Tracker setup could not be loaded. Ask the owner to apply the tracker migration and configure stores and names, or retry.");
      }
    })();
    return () => { active = false; };
  }, [account.userId, revision]);

  const loadSnapshot = useCallback((owner: string, start: string, end: string, page: number, kind?: string) => {
    const key = `${account.userId}:${account.role}:${owner}:${start}:${end}:${page}:${kind ?? "all"}`;
    const cached = cache.current.get(key);
    if (cached) return cached;
    const request = (async () => {
      const result = await getSupabaseClient().rpc("tracker_snapshot", { p_owner: owner === "team" ? null : owner, p_start: start, p_end: end, p_page: page, p_kind: kind ?? null });
      if (result.error) throw result.error;
      return snapshotSchema.parse(result.data);
    })();
    cache.current.set(key, request);
    inFlight.current.add(request);
    void request.then(() => inFlight.current.delete(request), () => inFlight.current.delete(request));
    void request.catch(() => { if (cache.current.get(key) === request) cache.current.delete(key); });
    // Keep the cache bounded to recent views, scoped to this authenticated provider.
    if (cache.current.size > 32) cache.current.delete(cache.current.keys().next().value ?? "");
    return request;
  }, [account.userId, account.role]);

  const loadReporting = useCallback((owner: string, start: string, end: string, bucket: Period) => {
    const key = `${account.userId}:${account.role}:${owner}:${start}:${end}:${bucket}`;
    const cached = dashboardCache.current.get(key);
    if (cached) return cached;
    const request = (async () => {
      const [reportingResult, benchmarkResult] = await Promise.allSettled([
        (async () => {
          const result = await getSupabaseClient().rpc("tracker_reporting", { p_owner: owner === "team" ? null : owner, p_start: start, p_end: end, p_bucket: bucket });
          if (result.error) throw result.error;
          return reportingSchema.parse(result.data);
        })(),
        (async () => {
          const result = await getSupabaseClient().rpc("tracker_category_benchmarks", { p_start: start, p_end: end });
          if (result.error) throw result.error;
          return categoryBenchmarksSchema.parse(result.data);
        })(),
      ]);
      if (reportingResult.status === "rejected") throw reportingResult.reason;
      return { ...reportingResult.value, team_benchmarks: benchmarkResult.status === "fulfilled" ? benchmarkResult.value : null };
    })();
    dashboardCache.current.set(key, request);
    inFlight.current.add(request);
    void request.then(() => inFlight.current.delete(request), () => inFlight.current.delete(request));
    void request.catch(() => { if (dashboardCache.current.get(key) === request) dashboardCache.current.delete(key); });
    if (dashboardCache.current.size > 16) dashboardCache.current.delete(dashboardCache.current.keys().next().value ?? "");
    return request;
  }, [account.userId, account.role]);

  return <Tracker.Provider value={{ account, context, error, reload: () => setRevision((n) => n + 1), loadSnapshot, loadReporting, invalidate, version }}>{children}</Tracker.Provider>;
}

export function useTracker() {
  const tracker = useContext(Tracker);
  if (!tracker) throw new Error("Tracker provider required.");
  return tracker;
}
