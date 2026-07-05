import { Trophy, Users, Clock } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { challenges } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

export function ChallengeCards() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Desafios em andamento</CardTitle>
        <CardDescription>Progresso coletivo</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {challenges.map((c) => (
          <div key={c.name} className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Trophy className="size-4" />
                </div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground">{c.progress}%</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", c.color)} style={{ width: `${c.progress}%` }} />
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {c.participants} participantes
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {c.days} dias restantes
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
