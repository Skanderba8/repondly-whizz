import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return <span className={cn("brand", className)}><span className="brand-word">whizz</span><span className="brand-caption">Repondly</span></span>;
}
