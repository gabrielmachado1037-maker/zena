import { useMemo, useState } from "react"
import { Check, Flame, TrendingUp, ChevronRight, Coffee, Utensils, Cookie, Soup, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePacienteData } from "@/lib/paciente-data"
import apiPaciente from "@/lib/apiPaciente"
import { ProgressBarNx, LevelUpOverlay, LeagueCrest } from "@/components/ui-nx"
import type { NavigateFn } from "../types"

/* Ordem das missões conforme o brief. "registro" é o fechar-o-dia (o commit). */
const HABITOS = ["agua", "alimentacao", "treino", "sono"] as const

/* Refeições do dia — o paciente marca as que seguiu o plano. >=3 concluem a Alimentação
   (mesma regra do servidor) e cada uma vira dado por refeição no relatório da nutri. */
const REFEICOES = [
  { key: "cafe", label: "Café", icon: Coffee },
  { key: "almoco", label: "Almoço", icon: Utensils },
  { key: "lanche", label: "Lanche", icon: Cookie },
  { key: "jantar", label: "Jantar", icon: Soup },
] as const
const META_REFEICOES = 3

/* Uma missão = 1 toque, sem burocracia. Concluir = fica verde + "+XP" sobe. */
function MissionTile({
  icon: Icon,
  title,
  subtitle,
  points,
  done,
  locked,
  onToggle,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  points: number
  done: boolean
  locked?: boolean
  onToggle: (next: boolean) => void
}) {
  const [burst, setBurst] = useState(false)

  function handle() {
    if (locked) return
    const next = !done
    onToggle(next)
    if (next) {
      setBurst(true)
      window.setTimeout(() => setBurst(false), 1100)
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={locked}
      aria-pressed={done}
      className={cn(
        "relative flex w-full items-center gap-4 rounded-nx-lg border p-4 text-left transition-all",
        !locked && "active:scale-[0.98]",
        done
          ? "border-nx-evo/40 bg-nx-evo/10"
          : "border-nx-border bg-nx-surface enabled:hover:border-nx-outline",
      )}
    >
      <div
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-nx-md transition-colors",
          done ? "bg-nx-evo/15" : "bg-nx-container-high",
        )}
      >
        {done ? (
          <Check className="nx-pop size-6 text-nx-evo" strokeWidth={3} />
        ) : (
          <Icon className="size-6 text-nx-on-surface-variant" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-body-lg font-semibold text-nx-on-surface">{title}</p>
        <p className="truncate text-body-sm text-nx-on-surface-variant">{done ? "Concluída" : subtitle}</p>
      </div>

      <span
        className={cn(
          "text-body-md font-bold tabular-nums",
          done ? "text-nx-evo" : "text-nx-on-surface-variant",
        )}
      >
        +{points}
      </span>

      {burst && (
        <span className="nx-rise pointer-events-none absolute right-4 top-1 text-body-md font-bold text-nx-evo">
          +{points} XP
        </span>
      )}
    </button>
  )
}

/* Missão Alimentação = 4 refeições. Não é formulário: 4 chips, um toque cada. */
function MealMission({
  icon: Icon,
  points,
  refeicoes,
  onToggleMeal,
}: {
  icon: LucideIcon
  points: number
  refeicoes: Record<string, boolean>
  onToggleMeal: (key: string) => void
}) {
  const count = REFEICOES.filter((r) => refeicoes[r.key]).length
  const done = count >= META_REFEICOES

  return (
    <div
      className={cn(
        "rounded-nx-lg border p-4 transition-all",
        done ? "border-nx-evo/40 bg-nx-evo/10" : "border-nx-border bg-nx-surface",
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-nx-md transition-colors",
            done ? "bg-nx-evo/15" : "bg-nx-container-high",
          )}
        >
          {done ? (
            <Check className="nx-pop size-6 text-nx-evo" strokeWidth={3} />
          ) : (
            <Icon className="size-6 text-nx-on-surface-variant" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body-lg font-semibold text-nx-on-surface">Alimentação</p>
          <p className="truncate text-body-sm text-nx-on-surface-variant">
            {done ? "Concluída · plano seguido" : `${count}/4 refeições · marque ${META_REFEICOES} pra concluir`}
          </p>
        </div>
        <span className={cn("text-body-md font-bold tabular-nums", done ? "text-nx-evo" : "text-nx-on-surface-variant")}>
          +{points}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {REFEICOES.map((r) => {
          const on = refeicoes[r.key]
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => onToggleMeal(r.key)}
              aria-pressed={on}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-nx-md border py-2.5 transition-all active:scale-95",
                on
                  ? "border-nx-evo/50 bg-nx-evo/15 text-nx-evo"
                  : "border-nx-border bg-nx-container text-nx-on-surface-variant hover:border-nx-outline",
              )}
            >
              <r.icon className="size-5" />
              <span className="text-label-sm font-medium">{r.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface Celebracao {
  pontos: number
  streak: number
  subiu: boolean
  liga: string
}

export function RegistroScreen({ onNavigate }: { onNavigate: NavigateFn }) {
  const { missions, user, reload } = usePacienteData()

  const registroDone = !!missions.find((m) => m.id === "registro")?.done
  const [enviadoLocal, setEnviadoLocal] = useState(false)
  const jaEnviado = enviadoLocal || registroDone

  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(missions.map((m) => [m.id, m.done])),
  )
  const [refeicoes, setRefeicoes] = useState<Record<string, boolean>>({
    cafe: false, almoco: false, lanche: false, jantar: false,
  })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState("")
  const [celeb, setCeleb] = useState<Celebracao | null>(null)

  const habitos = useMemo(
    () => HABITOS.map((id) => missions.find((m) => m.id === id)).filter(Boolean) as typeof missions,
    [missions],
  )

  // Alimentação é derivada das refeições (>=3), igual ao servidor.
  const alimentacaoDone = REFEICOES.filter((r) => refeicoes[r.key]).length >= META_REFEICOES
  const estaMarcado = (id: string) => (id === "alimentacao" ? alimentacaoDone : !!checked[id])
  const pontosMarcados = habitos.reduce((s, m) => s + (estaMarcado(m.id) ? m.total : 0), 0)
  const registroPts = missions.find((m) => m.id === "registro")?.total ?? 1
  const earned = pontosMarcados + (jaEnviado ? registroPts : 0)
  const goal = user.todayGoal

  const subtitulo = jaEnviado
    ? "Dia fechado — sequência garantida 🔥"
    : pontosMarcados > 0
      ? "Feche o dia pra confirmar suas missões"
      : "Marque o que você mandou hoje"

  async function fecharDia() {
    if (jaEnviado || enviando) return
    setEnviando(true)
    setErro("")
    try {
      const { data } = await apiPaciente.post("/registros", {
        alimentacaoOk: alimentacaoDone,
        cafeOk: refeicoes.cafe,
        almocoOk: refeicoes.almoco,
        lancheOk: refeicoes.lanche,
        jantarOk: refeicoes.jantar,
        treinoOk: !!checked.treino,
        aguaOk: !!checked.agua,
        sonoOk: !!checked.sono,
      })
      const novaLiga = data?.liga ? `${data.liga.liga} ${data.liga.nivel}` : user.league
      setCeleb({
        pontos: data?.pontosGanhos ?? pontosMarcados,
        streak: data?.streakAtual ?? user.streak,
        subiu: novaLiga !== user.league,
        liga: novaLiga,
      })
      setEnviadoLocal(true)
      void reload()
    } catch (e: any) {
      if (e?.response?.status === 409) setEnviadoLocal(true)
      else setErro(e?.response?.data?.error || "Não foi possível fechar o dia. Tente de novo.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6 px-5 pb-6 pt-7">
      <header>
        <h1 className="text-headline-lg text-nx-on-surface">Missões de hoje</h1>
        <p className="mt-0.5 text-body-md text-nx-on-surface-variant">{subtitulo}</p>
      </header>

      {/* Barra de XP do dia — enche conforme você conclui (feedback ao vivo) */}
      <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-label-md uppercase text-nx-on-surface-variant">XP de hoje</span>
          <span className="text-body-sm font-bold tabular-nums text-nx-evo">
            {earned}<span className="text-nx-on-surface-variant"> / {goal} XP</span>
          </span>
        </div>
        <ProgressBarNx value={goal ? (earned / goal) * 100 : 0} tone="evo" celebrate={earned >= goal} />
      </div>

      {/* Missões (hábitos) — 1 toque cada; Alimentação = 4 refeições */}
      <div className="space-y-3">
        {habitos.map((m) =>
          m.id === "alimentacao" && !jaEnviado ? (
            <MealMission
              key={m.id}
              icon={m.icon}
              points={m.total}
              refeicoes={refeicoes}
              onToggleMeal={(key) => setRefeicoes((prev) => ({ ...prev, [key]: !prev[key] }))}
            />
          ) : (
            <MissionTile
              key={m.id}
              icon={m.icon}
              title={m.title}
              subtitle={m.subtitle}
              points={m.total}
              done={jaEnviado ? m.done : estaMarcado(m.id)}
              locked={jaEnviado}
              onToggle={(next) => setChecked((prev) => ({ ...prev, [m.id]: next }))}
            />
          ),
        )}
      </div>

      {erro && <p className="text-center text-body-sm text-nx-danger">{erro}</p>}

      {/* Registro do dia = fechar o dia (o commit) */}
      {jaEnviado ? (
        <div className="flex items-center gap-4 rounded-nx-lg border border-nx-evo/40 bg-nx-evo/10 p-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-nx-md bg-nx-evo/15">
            <Check className="size-6 text-nx-evo" strokeWidth={3} />
          </div>
          <div className="flex-1">
            <p className="text-body-lg font-semibold text-nx-on-surface">Dia registrado</p>
            <p className="text-body-sm text-nx-on-surface-variant">Volte amanhã pra manter a chama</p>
          </div>
          <Flame className="size-6 text-nx-streak" />
        </div>
      ) : (
        <button
          type="button"
          onClick={fecharDia}
          disabled={enviando}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-nx-lg py-4 text-body-lg font-semibold transition-all",
            "bg-nx-evo text-nx-on-evo shadow-nx-evo hover:shadow-nx-evo-strong active:scale-[0.98]",
            "disabled:opacity-60 disabled:pointer-events-none",
          )}
        >
          {enviando ? "Fechando o dia…" : pontosMarcados > 0 ? `Fechar o dia · +${pontosMarcados} XP` : "Fechar o dia"}
        </button>
      )}

      {/* Atalho Evolução */}
      <button type="button" onClick={() => onNavigate("evolucao")} className="block w-full text-left">
        <div className="flex items-center gap-4 rounded-nx-lg border border-nx-border bg-nx-surface p-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-nx-md bg-nx-container-high">
            <TrendingUp className="size-5 text-nx-on-surface-variant" />
          </div>
          <div className="flex-1">
            <p className="text-body-md font-semibold text-nx-on-surface">Minha evolução</p>
            <p className="text-body-sm text-nx-on-surface-variant">Fotos, peso, medidas e humor</p>
          </div>
          <ChevronRight className="size-5 text-nx-outline" />
        </div>
      </button>

      {/* Celebração — feedback de recompensa (XP, sequência, level-up de liga) */}
      <LevelUpOverlay
        open={!!celeb}
        nivel={celeb?.streak ?? 0}
        onClose={() => setCeleb(null)}
        eyebrow={celeb?.subiu ? "Nova liga" : "Dia completo"}
        ariaLabel={celeb?.subiu ? `Você subiu para a ${celeb.liga}` : "Dia registrado"}
        bigContent={
          celeb?.subiu ? (
            <LeagueCrest liga={celeb.liga.split(" ")[0]} size={92} />
          ) : (
            <span className="flex items-baseline gap-1 text-nx-evo">
              <span className="text-display-lg leading-none tabular-nums">+{celeb?.pontos ?? 0}</span>
            </span>
          )
        }
        titulo={celeb?.subiu ? `Liga ${celeb.liga}` : "Dia registrado!"}
        descricao={
          celeb?.subiu
            ? `+${celeb.pontos} XP · 🔥 ${celeb.streak} ${celeb.streak === 1 ? "dia" : "dias"}`
            : `Sequência de ${celeb?.streak ?? 0} ${celeb?.streak === 1 ? "dia" : "dias"} 🔥`
        }
        ctaLabel="Seguir evoluindo"
      />
    </div>
  )
}
