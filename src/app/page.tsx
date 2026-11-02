import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      <p className="eyebrow">A little clarity. Every day.</p>
      <h1 className="page-title">Good work deserves<br />a clear perspective.</h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">One place to understand your progress, keep your activity organized, and see the work behind the numbers.</p>
      <section aria-labelledby="welcome-title" className="welcome-panel mt-10 md:mt-14">
        <div>
          <p className="eyebrow">Welcome to Whizz</p>
          <h2 id="welcome-title" className="mt-5 text-2xl font-semibold tracking-tight">Your workspace starts here.</h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">You are logged in. Personal performance and activity tracking are still being built.</p>
          <Button asChild className="mt-7"><Link href="/activity/">Explore activity<ArrowRight data-icon="inline-end" /></Link></Button>
        </div>
        <div className="flex flex-col justify-center gap-6 border-t border-border pt-8 md:border-t-0 md:border-l md:pt-0 md:pl-10">
          {[
            ["A personal view", "Your daily, weekly, and monthly progress."],
            ["The details together", "Subscriptions, reviews, and supporting evidence."],
            ["A shared perspective", "Clear team insights for your manager."],
          ].map(([title, description]) => (
            <div key={title} className="flex gap-3">
              <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
              <div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div>
            </div>
          ))}
        </div>
      </section>
      <p className="mt-5 text-xs text-muted-foreground">Preview only. No employee or customer data is displayed.</p>
    </>
  );
}
