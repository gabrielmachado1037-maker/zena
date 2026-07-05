import { Medal } from "lucide-react"
import { cn } from "@/lib/utils"
import { leagueStyles, type League } from "@/lib/dashboard-data"

export function LeagueBadge({ league, className }: { league: League; className?: string }) {
  const s = leagueStyles[league]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        s.bg,
        s.text,
        s.ring,
        className,
      )}
    >
      <Medal className="size-3" />
      {s.label}
    </span>
  )
}
