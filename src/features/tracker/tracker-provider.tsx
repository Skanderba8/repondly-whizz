"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { WorkspaceAccount } from "@/features/access/access";
import { getSupabaseClient } from "@/lib/supabase/client";
import { contextSchema, snapshotSchema, type TrackerContext, type Snapshot } from "./domain";

type TrackerState = {
  account: WorkspaceAccount;
  context: TrackerContext | null;
  error: string;
  reload: () => void;
  loadSnapshot: (owner: string, start: string, end: string, page: number, kind?: string) => Promise<Snapshot>;
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
  const invalidate = useCallback(() => { cache.current.clear(); setVersion((value) => value + 1); }, []);
  useEffect(() => {
    let lastFocusRefresh = 0;
    function refreshTracker() {
      if (document.visibilityState !== "visible" || Date.now() - lastFocusRefresh < 30_000) return;
      lastFocusRefresh = Date.now();
      invalidate();
      setRevision((value) => value + 1);
    }
    window.addEventListener("focus", refreshTracker);
    return () => window.removeEventListener("focus", refreshTracker);
  }, [invalidate]);
  useEffect(() => {
    let active = true;
    setError("");
    void (async () => {
      try {
        const result = await getSupabaseClient().rpc("tracker_context");
        if (result.error) throw result.error;
        const parsed = contextSchema.parse(result.data);
        if (active) setContext(parsed);
      } catch {
        if (active) setError("Tracker setup could not be loaded. Ask the owner to apply the tracker migration and configure stores and names, or retry.");
      }
    })();
    return () => { active = false; cache.current.clear(); };
  }, [account.userId, revision]);

  const loadSnapshot = useCallback((owner: string, start: string, end: string, page: number, kind?: string) => {
    const key = `${account.userId}:${account.role}:${owner}:${start}:${end}:${page}:${kind ?? "all"}`;
    const cached = cache.current.get(key);
    if (cached) return cached;
    const request = (async () => {
      const result = await getSupabaseClient().rpc("tracker_snapshot", { p_owner: owner, p_start: start, p_end: end, p_page: page, p_kind: kind ?? null });
      if (result.error) throw result.error;
      return snapshotSchema.parse(result.data);
    })();
    cache.current.set(key, request);
    void request.catch(() => { if (cache.current.get(key) === request) cache.current.delete(key); });
    // Keep the cache bounded to recent views, scoped to this authenticated provider.
    if (cache.current.size > 32) cache.current.delete(cache.current.keys().next().value ?? "");
    return request;
  }, [account.userId, account.role]);

  return <Tracker.Provider value={{ account, context, error, reload: () => setRevision((n) => n + 1), loadSnapshot, invalidate, version }}>{children}</Tracker.Provider>;
}

export function useTracker() {
  const tracker = useContext(Tracker);
  if (!tracker) throw new Error("Tracker provider required.");
  return tracker;
}
