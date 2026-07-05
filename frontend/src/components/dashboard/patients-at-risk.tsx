import { ChevronRight } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LeagueBadge } from "./league-badge"
import { patientsAtRisk } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
}

function riskColor(risk: number) {
  if (risk >= 85) return "text-danger"
  if (risk >= 70) return "text-warning"
  return "text-gold"
}

function riskBar(risk: number) {
  if (risk >= 85) return "bg-danger"
  if (risk >= 70) return "bg-warning"
  return "bg-gold"
}

export function PatientsAtRisk() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pacientes em risco</CardTitle>
        <CardDescription>Requerem atenção imediata</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {patientsAtRisk.map((p) => (
          <button
            key={p.name}
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                {initials(p.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                <LeagueBadge league={p.league} className="hidden sm:inline-flex" />
              </div>
              <p className="truncate text-xs text-muted-foreground">{p.reason}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={cn("text-sm font-semibold tabular-nums", riskColor(p.risk))}>{p.risk}%</span>
              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", riskBar(p.risk))} style={{ width: `${p.risk}%` }} />
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
