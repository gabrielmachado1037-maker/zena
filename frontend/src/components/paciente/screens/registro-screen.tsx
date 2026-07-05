
import { useState } from "react"
import { Calendar, TrendingUp, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { usePacienteData } from "@/lib/paciente-data"
import type { NavigateFn } from "../types"

export function RegistroScreen({ onNavigate }: { onNavigate: NavigateFn }) {
  const { missions: initialMissions, user } = usePacienteData()
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(initialMissions.map((m) => [m.id, m.done])),
  )

  const earned = initialMissions.reduce(
    (sum, m) => sum + (checked[m.id] ? m.total : 0),
    0,
  )
  const total = user.todayGoal

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Missões de Hoje</h1>
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Calendar className="size-5 text-primary" />
        </div>
      </header>

      <ul className="space-y-3">
        {initialMissions.map((m) => {
          const isDone = checked[m.id]
          const Icon = m.icon
          return (
            <li key={m.id}>
              <Card
                className={cn(
                  "flex flex-row items-center gap-3 p-4 transition-colors",
                  isDone && "border-green/30",
                )}
              >
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1",
                    isDone
                      ? "bg-green/15 ring-green/30"
                      : "bg-primary/15 ring-primary/30",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-5",
                      isDone ? "text-green" : "text-primary",
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{m.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {m.subtitle}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      isDone ? "text-green" : "text-muted-foreground",
                    )}
                  >
                    {isDone ? m.total : 0}/{m.total} pts
                  </span>
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={(v) =>
                      setChecked((prev) => ({ ...prev, [m.id]: v === true }))
                    }
                    aria-label={`Concluir missão ${m.title}`}
                    className="size-5 data-[state=checked]:border-green data-[state=checked]:bg-green"
                  />
                </div>
              </Card>
            </li>
          )
        })}
      </ul>

      <Card className="flex flex-row items-center justify-between border-primary/25 bg-primary/10 p-4">
        <p className="font-semibold">Total do dia</p>
        <p className="text-xl font-bold text-primary">
          {earned}/{total} pts
        </p>
      </Card>

      <button
        type="button"
        onClick={() => onNavigate("evolucao")}
        className="w-full text-left"
      >
        <Card className="flex flex-row items-center gap-3 p-4">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
            <TrendingUp className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Minha Evolução</p>
            <p className="text-sm text-muted-foreground">
              Fotos, peso, medidas e humor
            </p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Card>
      </button>
    </div>
  )
}
