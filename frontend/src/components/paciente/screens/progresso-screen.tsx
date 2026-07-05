
import { Medal } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { leagues } from "@/lib/nexvel-data"
import { usePacienteData } from "@/lib/paciente-data"
import { ScreenHeader } from "../screen-header"
import type { NavigateFn } from "../types"

export function ProgressoScreen({ onNavigate }: { onNavigate: NavigateFn }) {
  const { user, currentLeagueIndex, achievements } = usePacienteData()
  const leagueProgress = user.leagueProgress

  return (
    <div className="pb-4">
      <ScreenHeader title="Progresso" onBack={() => onNavigate("home")} />

      <div className="space-y-5 px-4 pt-2">
        {/* Big league card */}
        <Card className="relative overflow-hidden border-gold/25 p-6 text-center">
          <div
            className="pointer-events-none absolute -right-10 -top-12 size-48 rounded-full opacity-20 blur-3xl"
            style={{ background: "var(--gold)" }}
            aria-hidden
          />
          <div className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-gold/15 ring-1 ring-gold/30">
            <Medal className="size-11 text-gold" />
          </div>
          <p className="mt-3 text-2xl font-bold text-gold">{user.league}</p>
          <p className="mt-1 text-lg font-semibold">
            {user.points.toLocaleString("pt-BR")} pts
          </p>
          <p className="text-sm text-muted-foreground">
            Faltam {user.pointsToNext} pts para {user.nextLeague}
          </p>
          <Progress
            value={leagueProgress}
            className="mx-auto mt-4 h-2 max-w-[240px] bg-muted [&>div]:bg-gold"
          />
        </Card>

        {/* League trajectory */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Trajetória das ligas
          </h2>
          <Card className="p-4">
            <div className="flex items-start justify-between gap-1">
              {leagues.map((lg, i) => {
                const active = i === currentLeagueIndex
                const passed = i < currentLeagueIndex
                return (
                  <div
                    key={lg.name}
                    className="flex flex-1 flex-col items-center gap-1.5 text-center"
                  >
                    <div
                      className={cn(
                        "flex size-11 items-center justify-center rounded-2xl text-xl transition",
                        active
                          ? "bg-gold/20 ring-2 ring-gold"
                          : passed
                            ? "bg-muted ring-1 ring-border"
                            : "bg-muted/50 opacity-50 ring-1 ring-border",
                      )}
                    >
                      <span aria-hidden>{lg.emoji}</span>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-semibold leading-tight",
                        active ? "text-gold" : "text-muted-foreground",
                      )}
                    >
                      {lg.name}
                    </span>
                    <span className="text-[8px] leading-tight text-muted-foreground">
                      {lg.range}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        </section>

        {/* Recent achievements */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Conquistas recentes
          </h2>
          <ul className="space-y-3">
            {achievements.map((a) => {
              const Icon = a.icon
              return (
                <li key={a.id}>
                  <Card className="flex flex-row items-center gap-3 p-4">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{a.title}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {a.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {a.date}
                    </span>
                  </Card>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
