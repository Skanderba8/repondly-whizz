import type { Metadata } from "next";
import { PerformancePage } from "@/features/tracker/performance";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return <PerformancePage historyOnly />;
}
