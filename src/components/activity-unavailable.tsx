import { NotebookPen } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

export function ActivityUnavailable() {
  return (
    <Empty className="min-h-64">
      <EmptyHeader>
        <EmptyMedia variant="icon"><NotebookPen aria-hidden="true" /></EmptyMedia>
        <EmptyTitle>Activity tracking is not available yet</EmptyTitle>
        <EmptyDescription>Subscriptions and reviews will appear here once submissions are enabled. No records are loaded or saved in this preview.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
