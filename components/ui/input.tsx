import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-ink placeholder:text-slate/70 selection:bg-ink selection:text-primary-foreground border-ink/15 flex h-11 w-full min-w-0 rounded-xl border bg-surface px-3 py-2 text-base text-ink shadow-xs transition-[color,box-shadow,border-color] duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm motion-reduce:transition-none",
        "focus-visible:border-oxblood/40 focus-visible:ring-2 focus-visible:ring-oxblood/30",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
