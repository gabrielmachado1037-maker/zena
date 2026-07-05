import * as React from "react"
import { cn } from "@/lib/utils"

type Variant = "default" | "secondary" | "destructive" | "outline"

const variants: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive/10 text-destructive",
  outline: "border border-border text-foreground",
}

function Badge({ className, variant = "default", ...props }: React.ComponentProps<"span"> & { variant?: Variant }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3",
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
