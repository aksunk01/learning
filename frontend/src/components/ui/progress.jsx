"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Progress as ProgressPrimitive } from "radix-ui"

function Progress({
  className,
  value,
  ...props
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative flex h-1.5 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      {...props}>
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="
          h-full w-full flex-1 rounded-full
          bg-[linear-gradient(to_bottom,#d9ffe5_0%,#6dff8f_28%,#22c55e_58%,#0f7a35_100%)]
          shadow-[0_0_6px_rgba(74,222,128,0.95),0_0_14px_rgba(34,197,94,0.75),0_0_24px_rgba(22,163,74,0.45)]
          transition-all
        "
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
    </ProgressPrimitive.Root>
  );
}

export { Progress }
