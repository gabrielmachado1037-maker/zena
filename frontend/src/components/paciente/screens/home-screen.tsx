
import { Trophy, Flame, Target, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { usePacienteData } from "@/lib/paciente-data"
import type { NavigateFn } from "../types"

export function HomeScreen({ onNavigate }: { onNavigate: NavigateFn }) {
  const { user } = usePacienteData()
  const leagueProgress = user.leagueProgress
  const todayProgress = (user.todayPoints / user.todayGoal) * 100

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <header className="mb-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {user.firstName}! <span aria-hidden>👋</span>
        </h1>
        <p className="text-muted-foreground">Vamos evoluir hoje!</p>
      </header>

      {/* League card */}
      <button
        type="button"
        onClick={() => onNavigate("progresso")}
        className="w-full text-left"
      >
        <Card className="relative overflow-hidden border-gold/25 bg-card p-5">
          <div
            className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full opacity-20 blur-2xl"
            style={{ background: "var(--gold)" }}
            aria-hidden
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gold/15 ring-1 ring-gold/30">
                <Trophy className="size-8 text-gold" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Sua liga
                </p>
                <p className="text-xl font-bold text-gold">{user.league}</p>
              </div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-lg font-semibold">
              {user.points.toLocaleString("pt-BR")} pts
            </p>
            <p className="text-xs text-muted-foreground">
              Faltam {user.pointsToNext} pts para {user.nextLeague}
            </p>
          </div>
          <Progress
            value={leagueProgress}
            className="mt-2 h-2 bg-muted [&>div]:bg-gold"
          />
        </Card>
      </button>

      {/* Streak */}
      <Card className="flex flex-row items-center gap-4 border-gold/20 p-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-gold/15 ring-1 ring-gold/30">
          <Flame className="size-6 text-gold" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Sequência</p>
          <p className="text-lg font-bold">
            {user.streak} dias <span aria-hidden>🔥</span>
          </p>
        </div>
      </Card>

      {/* Today progress */}
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
            <Target className="size-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Progresso de Hoje</p>
            <p className="text-sm text-muted-foreground">Continue registrando</p>
          </div>
          <p className="text-lg font-bold text-primary">
            {user.todayPoints}/{user.todayGoal} pts
          </p>
        </div>
        <Progress
          value={todayProgress}
          className="mt-4 h-2 bg-muted [&>div]:bg-primary"
        />
      </Card>
    </div>
  )
}
