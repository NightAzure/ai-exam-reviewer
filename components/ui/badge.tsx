import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow,background-color] duration-150 overflow-hidden motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-ink text-primary-foreground [a&]:hover:bg-ink-raised",
        secondary:
          "border-ink/10 bg-ink/[0.06] text-ink [a&]:hover:bg-ink/[0.1]",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-ink/15 text-ink [a&]:hover:bg-ink/[0.04]",
        evidence:
          "border-sky-700/15 bg-sky-700/8 text-sky-950",
        "needs-focus":
          "border-needs-focus/20 bg-needs-focus/8 text-[#7d252d]",
        confidence:
          "border-amber-700/20 bg-amber-700/10 text-amber-950",
        proficient:
          "border-emerald-700/20 bg-emerald-700/10 text-emerald-950",
        oxblood:
          "border-oxblood/20 bg-oxblood/10 text-oxblood-strong",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
