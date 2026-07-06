
import { useState } from "react"
import { Calendar, TrendingUp, ChevronRight, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { usePacienteData } from "@/lib/paciente-data"
import apiPaciente from "@/lib/apiPaciente"
import type { NavigateFn } from "../types"

const HABITOS = ["alimentacao", "treino", "agua", "sono"] as const

export function RegistroScreen({ onNavigate }: { onNavigate: NavigateFn }) {
  const { missions: initialMissions, user } = usePacienteData()
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(initialMissions.map((m) => [m.id, m.done])),
  )
  const [enviadoLocal, setEnviadoLocal] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [pontosGanhos, setPontosGanhos] = useState<number | null>(null)
  const [erro, setErro] = useState("")

  // Registro do dia já existe (veio do servidor) ou acabou de ser enviado nesta sessão.
  const jaEnviado = enviadoLocal || !!initialMissions.find((m) => m.id === "registro")?.done

  const earned = initialMissions.reduce((sum, m) => {
    const done = m.id === "registro" ? jaEnviado : checked[m.id]
    return sum + (done ? m.total : 0)
  }, 0)
  const total = user.todayGoal

  async function enviarRegistro() {
    if (jaEnviado || enviando) return
    setEnviando(true)
    setErro("")
    try {
      const { data } = await apiPaciente.post("/registros", {
        alimentacaoOk: !!checked.alimentacao,
        treinoOk: !!checked.treino,
        aguaOk: !!checked.agua,
        sonoOk: !!checked.sono,
      })
      setPontosGanhos(data?.pontosGanhos ?? earned)
      setEnviadoLocal(true)
    } catch (e: any) {
      if (e?.response?.status === 409) {
        // Já havia registro hoje — reflete como enviado em vez de mostrar erro.
        setEnviadoLocal(true)
      } else {
        setErro(e?.response?.data?.error || "Não foi possível enviar. Tente de novo.")
      }
    } finally {
      setEnviando(false)
    }
  }

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
          const isRegistro = m.id === "registro"
          const isDone = isRegistro ? jaEnviado : checked[m.id]
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
                    onCheckedChange={
                      jaEnviado || isRegistro
                        ? undefined
                        : (v) => setChecked((prev) => ({ ...prev, [m.id]: v === true }))
                    }
                    aria-label={`Concluir missão ${m.title}`}
                    className={cn(
                      "size-5 data-[state=checked]:border-green data-[state=checked]:bg-green",
                      (jaEnviado || isRegistro) && "pointer-events-none opacity-70",
                    )}
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

      {erro && <p className="text-center text-sm text-danger">{erro}</p>}

      {/* Enviar registro do dia */}
      {jaEnviado ? (
        <Card className="flex flex-row items-center justify-center gap-2 border-green/30 bg-green/10 p-4">
          <Check className="size-5 text-green" />
          <p className="font-semibold text-green">
            {pontosGanhos != null
              ? `Registro enviado! +${pontosGanhos} pts`
              : "Registro de hoje enviado"}
          </p>
        </Card>
      ) : (
        <button
          type="button"
          onClick={enviarRegistro}
          disabled={enviando}
          className="w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Concluir registro do dia"}
        </button>
      )}

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
