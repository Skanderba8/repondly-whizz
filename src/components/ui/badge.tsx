import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs leading-[18px] font-medium", {
  variants: {
    variant: {
      neutral: "bg-neutral-background text-neutral-foreground",
      success: "bg-success-background text-success-foreground",
      warning: "bg-warning-background text-warning-foreground",
      error: "bg-error-background text-error-foreground",
      info: "bg-info-background text-info-foreground",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />;
}
