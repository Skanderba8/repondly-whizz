import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/page-heading";

export default function NotFound() {
  return <div className="flex flex-col items-start gap-6 py-8"><PageHeading title="Page not found" description="This page may have moved, or the address is incorrect." /><Button asChild><Link href="/">Back to overview</Link></Button></div>;
}
