import { useCallback, useRef, useState } from "react"
import {
  Check, Flame, TrendingUp, ChevronRight, Dumbbell, Moon, ChevronDown,
  Coffee, Utensils, Cookie, Soup, Leaf, Meh, CircleSlash, CircleCheck, CircleDashed, type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePacienteData, type MealState, type TodayState, XP_TREINO } from "@/lib/paciente-data"
import { calcularXpAlimentacao, valorRefeicaoXp, calcularXpSonoMeta } from "@/lib/ligas"
import apiPaciente from "@/lib/apiPaciente"
import {
  ProgressBarNx, LevelUpOverlay, LeagueCrest,
  WaterProgress, MealSheet, ChoiceSheet, SleepSheet, DaySummarySheet, MOODS,
  useNxToasts, type MealStatus, type MealDetail, type ChoiceOption, type ChoiceDetail,
} from "@/components/ui-nx"
import type { NavigateFn } from "../types"

// Ícone por refeição do plano (keys estáveis vindas do backend). Fallback = Utensils.
const MEAL_ICONS: Record<string, LucideIcon> = {
  cafe: Coffee, almoco: Utensils, lanche: Cookie, jantar: Soup,
  lanche_manha: Cookie, ceia: Moon,
}
const iconRefeicao = (key: string): LucideIcon => MEAL_ICONS[key] ?? Utensils

const MEAL_STYLE: Record<string, { color: string; Badge: LucideIcon }> = {
  seguiu: { color: "#22C55E", Badge: Check },
  adaptou: { color: "#84CC16", Badge: Leaf },
  comeu_mal: { color: "#F59E0B", Badge: Meh },
  pulou: { color: "#EF4444", Badge: CircleSlash },
}
const fmtXp = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
const formatL = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}L`
const fmtHoras = (h: number) => (Number.isInteger(h) ? `${h}h` : `${Math.floor(h)}h30`)

const TREINO_OPCOES: ChoiceOption[] = [
  { value: "conforme", title: "Treinei conforme planejado", xp: "+3 XP", tone: "evo", icon: CircleCheck },
  { value: "parcial", title: "Treinei parcialmente", xp: "+1 XP", tone: "gold", icon: CircleDashed },
  { value: "nao", title: "Não consegui treinar", xp: "0 XP", tone: "danger", icon: CircleSlash },
]
const TREINO_LABEL: Record<string, string> = { conforme: "Conforme planejado", parcial: "Parcial", nao: "Não treinou" }
const TREINO_MOTIVOS = ["Falta de tempo", "Cansaço", "Dor", "Compromissos", "Outro"]

interface DayState {
  refeicoes: Record<string, MealState>
  aguaMl: number
  treinoStatus: string | null
  treinoMotivo: string | null
  sonoHoras: number | null
}

function fromToday(t: TodayState): DayState {
  return {
    refeicoes: { ...t.refeicoes },
    aguaMl: t.aguaMl,
    treinoStatus: t.treinoStatus,
    treinoMotivo: t.treinoMotivo,
    sonoHoras: t.sonoHoras,
  }
}

/* Chip de refeição — cor por estado (verde=XP, amarelo/vermelho=zero) */
function MealChip({ icon: Icon, label, status, onClick }: {
  icon: LucideIcon; label: string; status: string | null; onClick: () => void
}) {
  const s = status ? MEAL_STYLE[status] : null
  const Badge = s?.Badge
  return (
    <button type="button" onClick={onClick}
      style={s ? { borderColor: `${s.color}80`, backgroundColor: `${s.color}14` } : undefined}
      className={cn("relative flex flex-col items-center gap-1.5 rounded-nx-md border py-2.5 transition-all active:scale-95",
        !s && "border-nx-border bg-nx-container hover:border-nx-outline")}>
      {Badge && <span className="absolute right-1.5 top-1.5"><Badge className="size-3.5" strokeWidth={3} style={{ color: s!.color }} /></span>}
      <Icon className={cn("size-5", !s && "text-nx-on-surface-variant")} style={s ? { color: s.color } : undefined} />
      <span className={cn("text-label-sm font-semibold", !s && "text-nx-on-surface-variant")} style={s ? { color: s.color } : undefined}>{label}</span>
    </button>
  )
}

/* Tile de missão graduada (Treino / Sono) que abre um bottom sheet */
function StatusTile({ icon: Icon, title, statusLabel, points, earned, done, registered, locked, onClick }: {
  icon: LucideIcon; title: string; statusLabel: string | null; points: number
  earned: number; done: boolean; registered: boolean; locked?: boolean; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} disabled={locked}
      className={cn("flex w-full items-center gap-4 rounded-nx-lg border p-4 text-left transition-all",
        !locked && "active:scale-[0.98]",
        done ? "border-nx-evo/40 bg-nx-evo/10"
          : registered ? "border-nx-border bg-nx-surface"
          : "border-nx-border bg-nx-surface enabled:hover:border-nx-outline")}>
      <div className={cn("grid size-12 shrink-0 place-items-center rounded-nx-md", done ? "bg-nx-evo/15" : "bg-nx-container-high")}>
        {done ? <Check className="nx-pop size-6 text-nx-evo" strokeWidth={3} /> : <Icon className="size-6 text-nx-on-surface-variant" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-body-lg font-semibold text-nx-on-surface">{title}</p>
        <p className="truncate text-body-sm text-nx-on-surface-variant">{registered ? statusLabel : "Toque pra registrar"}</p>
      </div>
      {registered ? (
        <span className={cn("text-body-md font-bold tabular-nums", done ? "text-nx-evo" : "text-nx-on-surface-variant")}>+{earned}</span>
      ) : (
        <span className="flex items-center gap-0.5 text-body-sm font-semibold text-nx-evo">até +{points}<ChevronDown className="size-4" /></span>
      )}
    </button>
  )
}

interface Celebracao { pontos: number; streak: number; subiu: boolean; liga: string }

export function RegistroScreen({ onNavigate }: { onNavigate: NavigateFn }) {
  const { today, user, reload } = usePacienteData()
  const { push, node: toasts } = useNxToasts()

  // Plano de missões da paciente (3–6 refeições). Valor de cada refeição = 4 ÷ N.
  const plano = today.planoRefeicoes
  const planoKeys = plano.map((r) => r.key)
  const valorRef = valorRefeicaoXp(plano.length)
  const metaSono = today.sonoMetaHoras
  const diaDeTreino = today.treinoDiaHoje

  const metaMl = today.aguaMetaMl || 3000
  const [state, setState] = useState<DayState>(() => fromToday(today))
  const [finalizado, setFinalizado] = useState(today.finalizado)
  const [sheetMeal, setSheetMeal] = useState<{ key: string; label: string } | null>(null)
  const [sheet, setSheet] = useState<"sono" | "treino" | null>(null)
  const [resumoOpen, setResumoOpen] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState("")
  const [celeb, setCeleb] = useState<Celebracao | null>(null)
  const saveTimer = useRef<number | null>(null)

  const xpAlim = calcularXpAlimentacao(planoKeys.map((k) => state.refeicoes[k]?.status ?? null))
  // Dia de descanso: treino creditado automaticamente (+3), missão não aparece.
  const xpTreino = diaDeTreino ? (XP_TREINO[state.treinoStatus ?? ""] ?? 0) : 3
  const xpSono = calcularXpSonoMeta(state.sonoHoras, metaSono)
  const aguaOk = state.aguaMl >= metaMl
  const earnedHabitos = xpAlim + xpTreino + (aguaOk ? 2 : 0) + xpSono
  const tudo = xpAlim >= 3 && xpTreino > 0 && aguaOk && xpSono > 0
  const totalAoFechar = earnedHabitos + 1 // registro_diario (+1). Teto do dia = 12 XP.
  const goal = user.todayGoal

  function payloadFrom(s: DayState) {
    const notas: Record<string, { nota?: string; motivo?: string }> = {}
    const refeicoesStatus: Record<string, string | null> = {}
    for (const k of planoKeys) {
      const m = s.refeicoes[k]
      refeicoesStatus[k] = m?.status ?? null
      if (m?.nota || m?.motivo) notas[k] = { nota: m.nota, motivo: m.motivo }
    }
    return {
      refeicoesStatus,
      refeicoesNotas: notas, aguaMl: s.aguaMl,
      treinoStatus: s.treinoStatus, treinoMotivo: s.treinoMotivo, sonoHoras: s.sonoHoras,
    }
  }

  const flush = useCallback(async (s: DayState) => {
    try { await apiPaciente.put("/registros/dia", payloadFrom(s)) } catch { /* best-effort */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaMl])

  function scheduleSave(next: DayState) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void flush(next), 450)
  }
  function apply(mut: (s: DayState) => DayState) {
    setState((prev) => { const next = mut(prev); scheduleSave(next); return next })
  }

  function salvarRefeicao(status: MealStatus, detail: MealDetail) {
    if (!sheetMeal) return
    const { key, label } = sheetMeal
    apply((s) => ({ ...s, refeicoes: { ...s.refeicoes, [key]: { status, ...detail } } }))
    if (status === "seguiu") push(`Boa! ${label} conforme o plano`, { tone: "evo", xp: valorRef, icon: <Check className="size-4" strokeWidth={3} /> })
    else if (status === "adaptou") push(`Adaptação saudável no ${label.toLowerCase()} 🌱`, { tone: "evo", xp: Math.round(valorRef * 0.75 * 100) / 100, icon: <Leaf className="size-4" /> })
    else if (status === "comeu_mal") push("Registrado! Vamos seguir em busca do objetivo 💚", { tone: "neutral" })
    else push("Tudo bem, amanhã tem mais 💪", { tone: "neutral" })
  }

  function salvarTreino(value: string, detail: ChoiceDetail) {
    apply((s) => ({ ...s, treinoStatus: value, treinoMotivo: value === "nao" ? detail.motivo ?? null : null }))
    const xp = XP_TREINO[value] ?? 0
    if (value === "conforme") push("Treino completo! 💪", { tone: "evo", xp, icon: <Dumbbell className="size-4" /> })
    else if (value === "parcial") push("Treino parcial registrado", { tone: "gold", xp, icon: <Dumbbell className="size-4" /> })
    else push("Sem treino hoje — amanhã você volta", { tone: "neutral" })
  }
  function salvarSono(horas: number) {
    apply((s) => ({ ...s, sonoHoras: horas }))
    const xp = calcularXpSonoMeta(horas, metaSono)
    if (xp > 0) push(`Sono registrado · ${fmtHoras(horas)}`, { tone: "evo", xp, icon: <Moon className="size-4" /> })
    else push("Sono fora da meta anotado — cuide do descanso", { tone: "neutral" })
  }

  function addAgua(delta: number) {
    apply((s) => {
      const next = { ...s, aguaMl: s.aguaMl + delta }
      if (s.aguaMl < metaMl && next.aguaMl >= metaMl) push("Meta de água batida! 💧", { tone: "water", xp: 2, icon: <Check className="size-4" strokeWidth={3} /> })
      return next
    })
  }

  async function fecharDia() {
    if (finalizado || enviando) return
    setEnviando(true)
    setErro("")
    try {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      await flush(state)
      const { data } = await apiPaciente.post("/registros/dia/fechar")
      const novaLiga = data?.liga ? `${data.liga.liga} ${data.liga.nivel}` : user.league
      setResumoOpen(false)
      setCeleb({
        pontos: data?.pontosGanhos ?? totalAoFechar,
        streak: data?.streakAtual ?? user.streak,
        subiu: novaLiga !== user.league, liga: novaLiga,
      })
      setFinalizado(true)
      void reload()
    } catch (e: any) {
      if (e?.response?.status === 409) { setFinalizado(true); setResumoOpen(false) }
      else setErro(e?.response?.data?.error || "Não foi possível fechar o dia. Tente de novo.")
    } finally {
      setEnviando(false)
    }
  }

  // valores de recap p/ o Resumo do dia
  const refeicoesRegistradas = planoKeys.filter((k) => state.refeicoes[k]?.status).length
  const gridColsAlim = plano.length <= 4 ? plano.length : 3
  const missoesConcluidas = [xpAlim >= 3, xpTreino > 0, aguaOk, xpSono > 0].filter(Boolean).length
  const humorSel = MOODS.find((m) => m.key === today.humor)

  const subtitulo = finalizado
    ? "Dia fechado — sequência garantida 🔥"
    : earnedHabitos > 0 ? "Feche o dia pra confirmar suas missões" : "Marque o que você mandou hoje"

  return (
    <div className="space-y-6 px-5 pb-6 pt-7">
      <header>
        <h1 className="text-headline-lg text-nx-on-surface">Missões de hoje</h1>
        <p className="mt-0.5 text-body-md text-nx-on-surface-variant">{subtitulo}</p>
      </header>

      {/* Barra de XP do dia */}
      <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-label-md uppercase text-nx-on-surface-variant">XP de hoje</span>
          <span className="text-body-sm font-bold tabular-nums text-nx-evo">
            {fmtXp(earnedHabitos)}<span className="text-nx-on-surface-variant"> / {goal} XP</span>
          </span>
        </div>
        <ProgressBarNx value={goal ? (earnedHabitos / goal) * 100 : 0} tone="evo" celebrate={tudo} />
      </div>

      {/* Alimentação */}
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
        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${gridColsAlim}, minmax(0, 1fr))` }}>
          {plano.map((r) => (
            <MealChip key={r.key} icon={iconRefeicao(r.key)} label={r.label} status={state.refeicoes[r.key]?.status ?? null}
              onClick={() => !finalizado && setSheetMeal({ key: r.key, label: r.label })} />
          ))}
        </div>
      </div>

      {/* Água */}
      <WaterProgress ml={state.aguaMl} metaMl={metaMl} onAdd={addAgua} />

      {/* Treino + Sono (bottom sheets) */}
      <div className="space-y-3">
        {diaDeTreino ? (
          <StatusTile icon={Dumbbell} title="Treino" points={3} earned={xpTreino} done={xpTreino > 0}
            registered={!!state.treinoStatus} statusLabel={state.treinoStatus ? TREINO_LABEL[state.treinoStatus] : null}
            locked={finalizado} onClick={() => setSheet("treino")} />
        ) : (
          <div className="flex items-center gap-4 rounded-nx-lg border border-nx-evo/40 bg-nx-evo/10 p-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-nx-md bg-nx-evo/15">
              <Dumbbell className="size-6 text-nx-evo" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-body-lg font-semibold text-nx-on-surface">Treino · dia de descanso</p>
              <p className="truncate text-body-sm text-nx-on-surface-variant">Hoje não tem treino no seu plano — XP creditado</p>
            </div>
            <span className="text-body-md font-bold tabular-nums text-nx-evo">+3</span>
          </div>
        )}
        <StatusTile icon={Moon} title="Sono" points={2} earned={xpSono} done={xpSono > 0}
          registered={state.sonoHoras != null} statusLabel={state.sonoHoras != null ? fmtHoras(state.sonoHoras) : null}
          locked={finalizado} onClick={() => setSheet("sono")} />
      </div>

      {erro && <p className="text-center text-body-sm text-nx-danger">{erro}</p>}

      {/* Fechar o dia */}
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
        <button type="button" onClick={() => setResumoOpen(true)}
          className={cn("flex w-full items-center justify-center gap-2 rounded-nx-lg py-4 text-body-lg font-semibold transition-all",
            "bg-nx-evo text-nx-on-evo shadow-nx-evo hover:shadow-nx-evo-strong active:scale-[0.98]")}>
          Fechar o dia · +{fmtXp(totalAoFechar)} XP
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

      {/* Sheets */}
      <MealSheet open={!!sheetMeal} meal={sheetMeal} valorRefeicao={valorRef} onClose={() => setSheetMeal(null)} onSave={salvarRefeicao} />
      <SleepSheet open={sheet === "sono"} metaHoras={metaSono} valorInicial={state.sonoHoras}
        onClose={() => setSheet(null)} onSave={salvarSono} />
      <ChoiceSheet open={sheet === "treino"} title="Como foi seu treino hoje?" options={TREINO_OPCOES}
        reasonsFor="nao" reasons={TREINO_MOTIVOS} reasonsTitle="O que te impediu?"
        onClose={() => setSheet(null)} onSave={salvarTreino} />

      <DaySummarySheet
        open={resumoOpen}
        onClose={() => setResumoOpen(false)}
        onConfirm={fecharDia}
        enviando={enviando}
        xp={totalAoFechar}
        missoesConcluidas={missoesConcluidas}
        missoesTotal={4}
        alimentacao={`${refeicoesRegistradas}/${plano.length} refeições`}
        treino={diaDeTreino ? (state.treinoStatus ? TREINO_LABEL[state.treinoStatus] : "—") : "Dia de descanso"}
        agua={`${formatL(state.aguaMl)} / ${formatL(metaMl)}`}
        sono={state.sonoHoras != null ? fmtHoras(state.sonoHoras) : "—"}
        humor={humorSel ? `${humorSel.emoji} ${humorSel.label}` : "—"}
        streak={user.streak}
        liga={user.league}
      />

      {/* Microfeedback */}
      {toasts}

      {/* Celebração */}
      <LevelUpOverlay
        open={!!celeb}
        nivel={celeb?.streak ?? 0}
        onClose={() => setCeleb(null)}
        eyebrow={celeb?.subiu ? "Nova liga" : "Dia completo"}
        ariaLabel={celeb?.subiu ? `Você subiu para a ${celeb.liga}` : "Dia registrado"}
        bigContent={
          celeb?.subiu ? <LeagueCrest liga={celeb.liga.split(" ")[0]} size={92} />
          : <span className="flex items-baseline gap-1 text-nx-evo"><span className="text-display-lg leading-none tabular-nums">+{fmtXp(celeb?.pontos ?? 0)}</span></span>
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
