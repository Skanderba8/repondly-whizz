import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { ActivityUnavailable } from "@/components/activity-unavailable";
import { WorkspacePanel } from "@/components/workspace-panel";

const periods = ["Daily points", "Weekly points", "Monthly points"];

export default function HomePage() {
  return (
    <>
      <PageHeading title="Overview" description="Your performance workspace." />
      <WorkspacePanel id="performance-title" title="Personal performance" action={<Badge>Unavailable</Badge>}>
        <div className="flex flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <span aria-hidden="true" className="mb-4 block h-1 w-8 rounded-full bg-primary" />
            <p className="text-[28px] leading-[34px] font-semibold tracking-[-0.025em] sm:text-[32px] sm:leading-[38px]">Points unavailable</p>
            <p className="mt-2 text-sm text-muted-foreground">Performance reporting is not connected yet.</p>
          </div>
          <dl className="metric-list">{periods.map((period) => <div key={period} className="metric-item"><dt className="text-[13px] font-medium text-muted-foreground">{period}</dt><dd className="text-lg text-muted-foreground">Unavailable</dd></div>)}</dl>
        </div>
      </WorkspacePanel>
      <WorkspacePanel id="recent-title" title="Recent activity" action={<Link href="/activity/" className="text-link">View activity<ArrowRight aria-hidden="true" className="size-4" /></Link>}>
        <ActivityUnavailable />
      </WorkspacePanel>
      <p className="text-xs text-muted-foreground">No performance records are loaded in this foundation.</p>
    </>
  );
}
