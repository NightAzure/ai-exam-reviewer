"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  /** When false/undefined and value is nullish, do not imply 0% progress. */
  indeterminate?: boolean
}

function Progress({
  className,
  value,
  indeterminate,
  ...props
}: ProgressProps) {
  const hasEvidence = value != null && !Number.isNaN(value)
  const safeValue = hasEvidence ? Math.max(0, Math.min(100, Number(value))) : 0
  const showIndeterminate = indeterminate || !hasEvidence

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-state={showIndeterminate ? "indeterminate" : "determinate"}
      value={hasEvidence ? safeValue : undefined}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-ink/10",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 rounded-full bg-ink transition-[transform] duration-200 ease-out motion-reduce:transition-none",
          showIndeterminate && "opacity-0"
        )}
        style={{ transform: `translateX(-${100 - safeValue}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
