import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <div className="py-16"><p className="eyebrow">404</p><h1 className="page-title">This page isn't here.</h1><p className="mt-5 text-muted-foreground">Return to your workspace to find your way.</p><Button asChild className="mt-8"><Link href="/">Back to overview</Link></Button></div>;
}
