import { useCallback, useRef, useState } from "react"
import {
  Check, Flame, TrendingUp, ChevronRight, Dumbbell, Moon,
  Coffee, Utensils, Cookie, Soup, Replace, CircleSlash, type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePacienteData, type MealState, type TodayState } from "@/lib/paciente-data"
import apiPaciente from "@/lib/apiPaciente"
import {
  ProgressBarNx, LevelUpOverlay, LeagueCrest,
  WaterProgress, MealSheet, useNxToasts, type MealStatus, type MealDetail,
} from "@/components/ui-nx"
import type { NavigateFn } from "../types"

const REFEICOES = [
  { key: "cafe", label: "Café", icon: Coffee },
  { key: "almoco", label: "Almoço", icon: Utensils },
  { key: "lanche", label: "Lanche", icon: Cookie },
  { key: "jantar", label: "Jantar", icon: Soup },
] as const
type RefKey = (typeof REFEICOES)[number]["key"]

const XP_MEAL: Record<string, number> = { seguiu: 1, adaptou: 0.5, pulou: 0 }
const fmtXp = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })

/* estado editável do dia (sem finalizado) */
interface DayState {
  refeicoes: Record<RefKey, MealState>
  aguaMl: number
  treinoOk: boolean
  sonoOk: boolean
}

function fromToday(t: TodayState): DayState {
  return {
    refeicoes: { ...t.refeicoes },
    aguaMl: t.aguaMl,
    treinoOk: t.treinoOk,
    sonoOk: t.sonoOk,
  }
}

function xpAlimentacao(ref: Record<RefKey, MealState>) {
  return REFEICOES.reduce((s, r) => s + (XP_MEAL[ref[r.key].status ?? ""] ?? 0), 0)
}

/* Chip de uma refeição: mostra o estado (seguiu/adaptou/pulou) e abre o sheet ao tocar. */
function MealChip({
  icon: Icon,
  label,
  status,
  onClick,
}: {
  icon: LucideIcon
  label: string
  status: string | null
  onClick: () => void
}) {
  const style =
    status === "seguiu"
      ? { border: "border-nx-evo/50 bg-nx-evo/12", text: "text-nx-evo", Badge: Check }
      : status === "adaptou"
        ? { border: "border-nx-gold/50 bg-nx-gold/12", text: "text-nx-gold", Badge: Replace }
        : status === "pulou"
          ? { border: "border-nx-danger/45 bg-nx-danger/10", text: "text-nx-danger", Badge: CircleSlash }
          : { border: "border-nx-border bg-nx-container", text: "text-nx-on-surface-variant", Badge: null }
  const Badge = style.Badge
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-nx-md border py-2.5 transition-all active:scale-95",
        style.border,
        !status && "hover:border-nx-outline",
      )}
    >
      {Badge && (
        <span className="absolute right-1.5 top-1.5">
          <Badge className={cn("size-3.5", style.text)} strokeWidth={3} />
        </span>
      )}
      <Icon className={cn("size-5", status ? style.text : "text-nx-on-surface-variant")} />
      <span className={cn("text-label-sm font-semibold", status ? style.text : "text-nx-on-surface-variant")}>
        {label}
      </span>
    </button>
  )
}

/* Missão de 1 toque (Treino / Sono) */
function ToggleTile({
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
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={locked}
      aria-pressed={done}
      className={cn(
        "flex w-full items-center gap-4 rounded-nx-lg border p-4 text-left transition-all",
        !locked && "active:scale-[0.98]",
        done ? "border-nx-evo/40 bg-nx-evo/10" : "border-nx-border bg-nx-surface enabled:hover:border-nx-outline",
      )}
    >
      <div className={cn("grid size-12 shrink-0 place-items-center rounded-nx-md transition-colors", done ? "bg-nx-evo/15" : "bg-nx-container-high")}>
        {done ? <Check className="nx-pop size-6 text-nx-evo" strokeWidth={3} /> : <Icon className="size-6 text-nx-on-surface-variant" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-body-lg font-semibold text-nx-on-surface">{title}</p>
        <p className="truncate text-body-sm text-nx-on-surface-variant">{done ? "Concluída" : subtitle}</p>
      </div>
      <span className={cn("text-body-md font-bold tabular-nums", done ? "text-nx-evo" : "text-nx-on-surface-variant")}>+{points}</span>
    </button>
  )
}

interface Celebracao { pontos: number; streak: number; subiu: boolean; liga: string }

export function RegistroScreen({ onNavigate }: { onNavigate: NavigateFn }) {
  const { today, user, reload } = usePacienteData()
  const { push, node: toasts } = useNxToasts()

  const metaMl = today.aguaMetaMl || 3000
  const [state, setState] = useState<DayState>(() => fromToday(today))
  const [finalizado, setFinalizado] = useState(today.finalizado)
  const [sheetMeal, setSheetMeal] = useState<{ key: RefKey; label: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState("")
  const [celeb, setCeleb] = useState<Celebracao | null>(null)
  const saveTimer = useRef<number | null>(null)

  const xpAlim = xpAlimentacao(state.refeicoes)
  const aguaOk = state.aguaMl >= metaMl
  const earnedHabitos = xpAlim + (state.treinoOk ? 2 : 0) + (aguaOk ? 2 : 0) + (state.sonoOk ? 2 : 0)
  const tudo = xpAlim >= 3 && state.treinoOk && aguaOk && state.sonoOk
  const totalAoFechar = earnedHabitos + 1 + (tudo ? 1 : 0) // registro_diario + bônus
  const goal = user.todayGoal

  function payloadFrom(s: DayState) {
    const notas: Record<string, { nota?: string; motivo?: string }> = {}
    for (const r of REFEICOES) {
      const m = s.refeicoes[r.key]
      if (m.nota || m.motivo) notas[r.key] = { nota: m.nota, motivo: m.motivo }
    }
    return {
      cafeStatus: s.refeicoes.cafe.status,
      almocoStatus: s.refeicoes.almoco.status,
      lancheStatus: s.refeicoes.lanche.status,
      jantarStatus: s.refeicoes.jantar.status,
      refeicoesNotas: notas,
      aguaMl: s.aguaMl,
      aguaMetaMl: metaMl,
      treinoOk: s.treinoOk,
      sonoOk: s.sonoOk,
    }
  }

  const flush = useCallback(async (s: DayState) => {
    try {
      await apiPaciente.put("/registros/dia", payloadFrom(s))
    } catch { /* autosave best-effort */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaMl])

  // agenda um autosave (debounce) com o snapshot mais recente
  function scheduleSave(next: DayState) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void flush(next), 450)
  }

  function apply(mut: (s: DayState) => DayState) {
    setState((prev) => {
      const next = mut(prev)
      scheduleSave(next)
      return next
    })
  }

  function salvarRefeicao(status: MealStatus, detail: MealDetail) {
    if (!sheetMeal) return
    const { key, label } = sheetMeal
    apply((s) => ({ ...s, refeicoes: { ...s.refeicoes, [key]: { status, ...detail } } }))
    if (status === "seguiu") push(`Boa! ${label} conforme o plano`, { tone: "evo", xp: 1, icon: <Check className="size-4" strokeWidth={3} /> })
    else if (status === "adaptou") push(`Anotado — adaptação no ${label.toLowerCase()}`, { tone: "gold", xp: 0.5, icon: <Replace className="size-4" /> })
    else push("Tudo bem, amanhã tem mais 💪", { tone: "neutral" })
  }

  function addAgua(delta: number) {
    apply((s) => {
      const next = { ...s, aguaMl: s.aguaMl + delta }
      const bateuAgora = s.aguaMl < metaMl && next.aguaMl >= metaMl
      if (bateuAgora) push("Meta de água batida! 💧", { tone: "water", xp: 2, icon: <Check className="size-4" strokeWidth={3} /> })
      return next
    })
  }

  function toggleTreino() {
    apply((s) => {
      const next = { ...s, treinoOk: !s.treinoOk }
      if (next.treinoOk) push("Treino registrado", { tone: "evo", xp: 2, icon: <Dumbbell className="size-4" /> })
      return next
    })
  }
  function toggleSono() {
    apply((s) => {
      const next = { ...s, sonoOk: !s.sonoOk }
      if (next.sonoOk) push("Sono registrado", { tone: "evo", xp: 2, icon: <Moon className="size-4" /> })
      return next
    })
  }

  async function fecharDia() {
    if (finalizado || enviando) return
    setEnviando(true)
    setErro("")
    try {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      await flush(state) // garante o último estado no servidor
      const { data } = await apiPaciente.post("/registros/dia/fechar")
      const novaLiga = data?.liga ? `${data.liga.liga} ${data.liga.nivel}` : user.league
      setCeleb({
        pontos: data?.pontosGanhos ?? totalAoFechar,
        streak: data?.streakAtual ?? user.streak,
        subiu: novaLiga !== user.league,
        liga: novaLiga,
      })
      setFinalizado(true)
      void reload()
    } catch (e: any) {
      if (e?.response?.status === 409) setFinalizado(true)
      else setErro(e?.response?.data?.error || "Não foi possível fechar o dia. Tente de novo.")
    } finally {
      setEnviando(false)
    }
  }

  const subtitulo = finalizado
    ? "Dia fechado — sequência garantida 🔥"
    : earnedHabitos > 0
      ? "Feche o dia pra confirmar suas missões"
      : "Marque o que você mandou hoje"

  return (
    <div className="space-y-6 px-5 pb-6 pt-7">
      <header>
        <h1 className="text-headline-lg text-nx-on-surface">Missões de hoje</h1>
        <p className="mt-0.5 text-body-md text-nx-on-surface-variant">{subtitulo}</p>
      </header>

      {/* Barra de XP do dia — projeção ao vivo */}
      <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-label-md uppercase text-nx-on-surface-variant">XP de hoje</span>
          <span className="text-body-sm font-bold tabular-nums text-nx-evo">
            {fmtXp(earnedHabitos)}<span className="text-nx-on-surface-variant"> / {goal} XP</span>
          </span>
        </div>
        <ProgressBarNx value={goal ? (earnedHabitos / goal) * 100 : 0} tone="evo" celebrate={tudo} />
      </div>

      {/* Alimentação — 4 refeições, cada uma abre o bottom sheet */}
      <div className={cn("rounded-nx-lg border p-4 transition-colors", xpAlim >= 3 ? "border-nx-evo/40 bg-nx-evo/10" : "border-nx-border bg-nx-surface")}>
        <div className="flex items-center gap-4">
          <div className={cn("grid size-12 shrink-0 place-items-center rounded-nx-md", xpAlim >= 3 ? "bg-nx-evo/15" : "bg-nx-container-high")}>
            {xpAlim >= 3 ? <Check className="nx-pop size-6 text-nx-evo" strokeWidth={3} /> : <Utensils className="size-6 text-nx-on-surface-variant" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body-lg font-semibold text-nx-on-surface">Alimentação</p>
            <p className="truncate text-body-sm text-nx-on-surface-variant">Toque cada refeição e diga como foi</p>
          </div>
          <span className={cn("text-body-md font-bold tabular-nums", xpAlim > 0 ? "text-nx-evo" : "text-nx-on-surface-variant")}>
            {fmtXp(xpAlim)}<span className="text-nx-on-surface-variant">/4</span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {REFEICOES.map((r) => (
            <MealChip
              key={r.key}
              icon={r.icon}
              label={r.label}
              status={state.refeicoes[r.key].status}
              onClick={() => !finalizado && setSheetMeal({ key: r.key, label: r.label })}
            />
          ))}
        </div>
      </div>

      {/* Água — progresso */}
      <WaterProgress ml={state.aguaMl} metaMl={metaMl} onAdd={addAgua} />

      {/* Treino + Sono */}
      <div className="space-y-3">
        <ToggleTile icon={Dumbbell} title="Treino" subtitle="Registre seu treino" points={2} done={state.treinoOk} locked={finalizado} onToggle={toggleTreino} />
        <ToggleTile icon={Moon} title="Sono" subtitle="Durma pelo menos 7h" points={2} done={state.sonoOk} locked={finalizado} onToggle={toggleSono} />
      </div>

      {erro && <p className="text-center text-body-sm text-nx-danger">{erro}</p>}

      {/* Fechar o dia (finaliza) */}
      {finalizado ? (
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
          {enviando ? "Fechando o dia…" : `Fechar o dia · +${fmtXp(totalAoFechar)} XP`}
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

      {/* Bottom sheet de refeição */}
      <MealSheet open={!!sheetMeal} meal={sheetMeal} onClose={() => setSheetMeal(null)} onSave={salvarRefeicao} />

      {/* Microfeedback */}
      {toasts}

      {/* Celebração ao fechar o dia */}
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
              <span className="text-display-lg leading-none tabular-nums">+{fmtXp(celeb?.pontos ?? 0)}</span>
            </span>
          )
        }
        titulo={celeb?.subiu ? `Liga ${celeb.liga}` : "Dia registrado!"}
        descricao={
          celeb?.subiu
            ? `+${fmtXp(celeb.pontos)} XP · 🔥 ${celeb.streak} ${celeb.streak === 1 ? "dia" : "dias"}`
            : `Sequência de ${celeb?.streak ?? 0} ${celeb?.streak === 1 ? "dia" : "dias"} 🔥`
        }
        ctaLabel="Seguir evoluindo"
      />
    </div>
  )
}
