import type { Metadata } from "next";
import { ManagerDashboard } from "@/features/manager/manager-dashboard";

export const metadata: Metadata = { title: "Employees" };
export default function PeoplePage() {
  return <ManagerDashboard view="people" title="Employees" description="Employee profiles, points, revenue, and activity." />;
}
