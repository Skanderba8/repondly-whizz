"use client";

import { useEffect, useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TrackerGate } from "./tracker-gate";
import { Performance } from "./performance";

export function ActivityPage() {
  const [filter, setFilter] = useState<string | null>(null);
  useEffect(() => {
    function readFilter() {
      const hash = window.location.hash.slice(1);
      setFilter(hash === "reviews" || hash === "doordash" || hash === "reports" ? hash : "all");
    }
    readFilter();
    window.addEventListener("hashchange", readFilter);
    return () => window.removeEventListener("hashchange", readFilter);
  }, []);
  function selectFilter(value: string) {
    setFilter(value);
    window.history.replaceState(null, "", `#${value}`);
  }
  return <>
    <PageHeading title="Activity" description="Browse records, dates, and totals." />
    <TrackerGate>
      <SegmentedControl label="Record type" value={filter ?? "all"} onValueChange={selectFilter} options={[{ value: "all", label: "All activity" }, { value: "reviews", label: "Reviews" }, { value: "doordash", label: "DoorDash" }, { value: "reports", label: "Reports" }]} />
      {filter ? <Performance historyOnly kind={filter === "reviews" ? "review" : filter === "doordash" ? "doordash" : filter === "reports" ? "productivity" : undefined} /> : <p role="status" className="text-sm text-muted-foreground">Loading records...</p>}
    </TrackerGate>
  </>;
}

