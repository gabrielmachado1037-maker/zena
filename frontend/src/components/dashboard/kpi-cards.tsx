import {
  Users,
  Target,
  HeartPulse,
  Trophy,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { kpis } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

const icons: Record<string, LucideIcon> = {
  Users,
  Target,
  HeartPulse,
  Trophy,
  DollarSign,
  AlertTriangle,
}

export function KpiCards() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => {
        const Icon = icons[kpi.icon]
        const up = kpi.trend === "up"
        const isRisk = kpi.key === "risco"
        return (
          <Card key={kpi.key} className="gap-0 p-4">
            <div className="flex items-center justify-between">
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg",
                  isRisk ? "bg-danger/15 text-danger" : "bg-primary/15 text-primary",
                )}
              >
                <Icon className="size-[18px]" />
              </div>
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                  up ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
                )}
              >
                {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {kpi.delta}
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{kpi.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.label}</p>
          </Card>
        )
      })}
    </div>
  )
}
