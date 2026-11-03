"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { WorkspaceAccount } from "@/features/access/access";
import { getSupabaseClient } from "@/lib/supabase/client";
import { contextSchema, snapshotSchema, type TrackerContext, type Snapshot, type Period } from "./domain";
import { categoryBenchmarksSchema, reportingSchema, type Reporting } from "./reporting";
import { fetchManagerDashboard, fetchManagerEmployeeRoster, fetchManagerRecords, managerFilterKey, type ManagerData, type ManagerFilters, type ManagerRecordFilters, type ManagerRecordsData } from "@/features/manager/manager-data";

type TrackerState = {
  account: WorkspaceAccount;
  context: TrackerContext | null;
  error: string;
  reload: () => void;
  loadSnapshot: (owner: string, start: string, end: string, page: number, kind?: string) => Promise<Snapshot>;
  loadReporting: (owner: string, start: string, end: string, bucket: Period) => Promise<Reporting>;
  loadManagerDashboard: (filters: ManagerFilters) => Promise<ManagerData>;
  loadManagerRecords: (filters: ManagerRecordFilters) => Promise<ManagerRecordsData>;
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
  const managerCache = useRef(new Map<string, Promise<ManagerData>>());
  const managerRecordsCache = useRef(new Map<string, Promise<ManagerRecordsData>>());
  const employeeRoster = useRef<Set<string> | null>(null);
  const inFlight = useRef(new Set<Promise<unknown>>());
  const invalidate = useCallback(() => { cache.current.clear(); dashboardCache.current.clear(); managerCache.current.clear(); managerRecordsCache.current.clear(); setVersion((value) => value + 1); }, []);
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
    window.addEventListener("online", refreshTracker);
    document.addEventListener("visibilitychange", refreshTracker);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshTracker); window.removeEventListener("online", refreshTracker); document.removeEventListener("visibilitychange", refreshTracker); };
  }, [invalidate]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [contextResult, rosterResult] = await Promise.allSettled([
          getSupabaseClient().rpc("tracker_context"),
          account.role === "manager" ? fetchManagerEmployeeRoster() : Promise.resolve(null),
        ]);
        if (contextResult.status === "rejected") throw contextResult.reason;
        if (rosterResult.status === "rejected") throw rosterResult.reason;
        const result = contextResult.value;
        if (result.error) throw result.error;
        const parsed = contextSchema.parse(result.data);
        if (account.role === "manager") parsed.people = (rosterResult.value ?? []).filter((person) => person.user_id !== account.userId);
        if (active) {
          const nextRoster = new Set(parsed.people.map((person) => person.user_id));
          if (employeeRoster.current && (employeeRoster.current.size !== nextRoster.size || [...employeeRoster.current].some((id) => !nextRoster.has(id)))) invalidate();
          employeeRoster.current = nextRoster;
          setContext(parsed); setError("");
        }
      } catch {
        if (active) {
          if (account.role === "manager") { employeeRoster.current = null; setContext(null); invalidate(); }
          setError(account.role === "manager" ? "Verified employee setup could not be loaded. Apply migration 011, check manager access, and retry." : "Tracker setup could not be loaded. Ask the owner to apply the tracker migration and configure stores and names, or retry.");
        }
      }
    })();
    return () => { active = false; };
  }, [account.userId, account.role, revision, invalidate]);

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

  const loadManagerDashboard = useCallback((filters: ManagerFilters) => {
    if (account.role !== "manager") return Promise.reject(new Error("Manager access required."));
    const roster = employeeRoster.current;
    if (!roster) return Promise.reject(new Error("Verified employee roster required."));
    const scopedFilters = { ...filters, people: filters.people === null ? [...roster] : filters.people.filter((id) => roster.has(id)) };
    const key = `${account.userId}:${account.role}:${managerFilterKey(scopedFilters)}`;
    const cached = managerCache.current.get(key);
    if (cached) return cached;
    const request = fetchManagerDashboard(scopedFilters).then((data) => ({ ...data, people: data.people.filter((person) => roster.has(person.user_id)) }));
    managerCache.current.set(key, request); inFlight.current.add(request);
    void request.then(() => inFlight.current.delete(request), () => { inFlight.current.delete(request); if (managerCache.current.get(key) === request) managerCache.current.delete(key); });
    if (managerCache.current.size > 16) managerCache.current.delete(managerCache.current.keys().next().value ?? "");
    return request;
  }, [account.userId, account.role]);
  const loadManagerRecords = useCallback((filters: ManagerRecordFilters) => {
    if (account.role !== "manager") return Promise.reject(new Error("Manager access required."));
    const roster = employeeRoster.current;
    if (!roster) return Promise.reject(new Error("Verified employee roster required."));
    const scopedFilters = { ...filters, people: filters.people === null ? [...roster] : filters.people.filter((id) => roster.has(id)) };
    const key = `${account.userId}:${account.role}:${managerFilterKey(scopedFilters)}:${filters.kind}:${filters.page}:${filters.search}`;
    const cached = managerRecordsCache.current.get(key);
    if (cached) return cached;
    const request = fetchManagerRecords(scopedFilters).then((data) => ({ ...data, records: data.records.filter((record) => record.owner_id !== undefined && roster.has(record.owner_id)) }));
    managerRecordsCache.current.set(key, request); inFlight.current.add(request);
    void request.then(() => inFlight.current.delete(request), () => { inFlight.current.delete(request); if (managerRecordsCache.current.get(key) === request) managerRecordsCache.current.delete(key); });
    if (managerRecordsCache.current.size > 24) managerRecordsCache.current.delete(managerRecordsCache.current.keys().next().value ?? "");
    return request;
  }, [account.userId, account.role]);

  return <Tracker.Provider value={{ account, context, error, reload: () => setRevision((n) => n + 1), loadSnapshot, loadReporting, loadManagerDashboard, loadManagerRecords, invalidate, version }}>{children}</Tracker.Provider>;
}

export function useTracker() {
  const tracker = useContext(Tracker);
  if (!tracker) throw new Error("Tracker provider required.");
  return tracker;
}
