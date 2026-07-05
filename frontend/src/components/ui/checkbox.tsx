import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

function Checkbox({
  className,
  checked = false,
  onCheckedChange,
  "aria-label": ariaLabel,
}: {
  className?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  "aria-label"?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input text-primary-foreground transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className,
      )}
    >
      {checked && <Check className="size-3.5" />}
    </button>
  )
}

export { Checkbox }
