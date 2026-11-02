import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { ActivityUnavailable } from "@/components/activity-unavailable";
import { WorkspacePanel } from "@/components/workspace-panel";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <>
      <PageHeading title="Activity" description="Subscriptions, customer reviews, and the records behind your points." />
      <WorkspacePanel id="records-title" title="Your records" action={<Badge>Unavailable</Badge>}>
        <ActivityUnavailable />
      </WorkspacePanel>
    </>
  );
}
