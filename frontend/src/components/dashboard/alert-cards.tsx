import { AlertOctagon, AlertTriangle, CheckCircle2, type LucideIcon } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { alerts } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

const styles: Record<
  string,
  { icon: LucideIcon; wrap: string; icon_c: string; border: string }
> = {
  danger: { icon: AlertOctagon, wrap: "bg-danger/10", icon_c: "text-danger", border: "border-l-danger" },
  warning: { icon: AlertTriangle, wrap: "bg-warning/10", icon_c: "text-warning", border: "border-l-warning" },
  success: { icon: CheckCircle2, wrap: "bg-success/10", icon_c: "text-success", border: "border-l-success" },
}

export function AlertCards() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alertas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((a, i) => {
          const s = styles[a.level]
          const Icon = s.icon
          return (
            <div
              key={i}
              className={cn("flex gap-3 rounded-lg border-l-2 bg-muted/40 p-3", s.border)}
            >
              <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", s.wrap)}>
                <Icon className={cn("size-4", s.icon_c)} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{a.desc}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">{a.time}</p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
