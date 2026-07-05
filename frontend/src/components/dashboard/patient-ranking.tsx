import { Flame } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LeagueBadge } from "./league-badge"
import { ranking } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
}

export function PatientRanking() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ranking de pacientes</CardTitle>
        <CardDescription>Top engajamento da semana</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {ranking.map((p) => (
          <div
            key={p.pos}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/40"
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                p.pos === 1
                  ? "bg-gold/20 text-gold"
                  : p.pos <= 3
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {p.pos}
            </span>
            <Avatar className="size-9">
              <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                {initials(p.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">{p.handle}</p>
            </div>
            <div className="hidden items-center gap-1 text-xs text-gold sm:flex">
              <Flame className="size-3.5" />
              {p.streak}d
            </div>
            <LeagueBadge league={p.league} className="hidden md:inline-flex" />
            <span className="w-16 text-right text-sm font-semibold tabular-nums text-foreground">
              {p.points.toLocaleString("pt-BR")}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
