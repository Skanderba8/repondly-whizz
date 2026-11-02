import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border border-primary-border bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        destructive:
          "border border-destructive bg-destructive text-destructive-foreground hover:opacity-90",
        outline:
          "border border-input bg-card text-card-foreground hover:bg-muted active:bg-secondary",
        delivery:
          "border border-delivery-border bg-delivery-background text-delivery-foreground hover:bg-delivery-hover active:bg-delivery-hover",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-muted active:bg-accent",
        ghost:
          "hover:bg-muted active:bg-secondary",
        link: "text-link underline underline-offset-4",
      },
      size: {
        default: "min-h-11 px-4 py-2 md:min-h-10",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "min-h-11 px-6 py-2",
        daily: "min-h-14 px-6 py-3 text-base [&_svg:not([class*='size-'])]:size-5",
        icon: "size-11",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
