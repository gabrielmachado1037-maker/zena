import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { leagueStyles, activity } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
}

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Atividade recente</CardTitle>
        <CardDescription>Em tempo real</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
          {activity.map((a, i) => (
            <li key={i} className="relative flex gap-3">
              <Avatar className="size-8 shrink-0 ring-2 ring-card">
                <AvatarFallback className={cn("text-[11px] font-semibold", leagueStyles[a.league].bg, leagueStyles[a.league].text)}>
                  {initials(a.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm leading-snug text-foreground">
                  <span className="font-medium">{a.name}</span>{" "}
                  <span className="text-muted-foreground">{a.action}</span>{" "}
                  <span className="font-medium text-primary">{a.target}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/70">{a.time}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
