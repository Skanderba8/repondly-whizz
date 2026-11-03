import type { Metadata } from "next";
import { ActivityPage as ActivityRecords } from "@/features/tracker/activity-page";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return <ActivityRecords />;
}
