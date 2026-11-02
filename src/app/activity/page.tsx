import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <>
      <p className="eyebrow">The work behind the numbers</p>
      <h1 className="page-title">Your activity.</h1>
      <p className="mt-5 max-w-xl leading-7 text-muted-foreground">A home for subscriptions, customer reviews, and the details that support them.</p>
      <Empty className="mt-12 border border-border bg-card py-20">
        <EmptyHeader>
          <EmptyMedia variant="icon"><NotebookPen aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>Activity tracking is on its way</EmptyTitle>
          <EmptyDescription>This preview does not load or save records. Your activity history will appear here once account access and submissions are ready.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Button variant="outline" asChild><Link href="/"><ArrowLeft data-icon="inline-start" />Back to overview</Link></Button></EmptyContent>
      </Empty>
    </>
  );
}
