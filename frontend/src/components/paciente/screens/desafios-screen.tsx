import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Zap, Trophy, Gift, CalendarClock, Flame, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePacienteData } from "@/lib/paciente-data"
import { ProgressBarNx, LevelUpOverlay, useNxToasts } from "@/components/ui-nx"
import apiPaciente from "@/lib/apiPaciente"
import type { Challenge } from "@/lib/nexvel-data"

type Tone = "water" | "evo" | "streak" | "gold"

const TEMA: Record<string, { grad: string; tone: Tone; accent: string; label: string }> = {
  hidratacao: { grad: "linear-gradient(135deg,#0A2E49,#49A8FF)", tone: "water", accent: "#49A8FF", label: "Hidratação" },
  alimentacao: { grad: "linear-gradient(135deg,#12330F,#7CFF5B)", tone: "evo", accent: "#7CFF5B", label: "Alimentação" },
  treino: { grad: "linear-gradient(135deg,#3D2007,#FF8A1F)", tone: "streak", accent: "#FF8A1F", label: "Treino" },
  sono: { grad: "linear-gradient(135deg,#1E1A42,#8B7DFF)", tone: "evo", accent: "#8B7DFF", label: "Sono" },
  custom: { grad: "linear-gradient(135deg,#3D2F08,#F8C84B)", tone: "gold", accent: "#F8C84B", label: "Desafio" },
}
const tema = (t?: string) => TEMA[t ?? "custom"] ?? TEMA.custom

const STORE = (id: string) => `nx-desafio-ok-${id}`

/** Uma bolinha do calendário do desafio: concluído ✓ · hoje ◉ · pendente ○ · perdido. */
function DayDot({ status, accent }: { status: string; accent: string }) {
  if (status === "done")
    return (
      <span className="grid size-4 place-items-center rounded-full" style={{ background: accent }}>
        <Check className="size-2.5 text-[#0A0A0A]" strokeWidth={3.5} />
      </span>
    )
  if (status === "today")
    return <span className="size-4 rounded-full border-2 motion-safe:animate-pulse" style={{ borderColor: accent, background: `${accent}22` }} />
  if (status === "missed")
    return <span className="size-4 rounded-full border border-nx-border bg-nx-container-high/40" />
  return <span className="size-4 rounded-full border border-nx-outline" />
}

function EventCard({
  c, marcando, onResgatar, onCumprir,
}: {
  c: Challenge
  marcando: boolean
  onResgatar: (c: Challenge) => void
  onCumprir: (c: Challenge) => void
}) {
  const t = tema(c.tipo)
  const Icon = c.icon
  const done = c.status === "concluido"

  const total = c.duracaoDias ?? c.dias?.length ?? 0
  const feitos = c.diasCumpridos ?? 0
  const min = c.adesaoMinima ?? total
  const bateuMeta = feitos >= min
  const faltamRecompensa = Math.max(0, min - feitos)
  const streak = c.streak ?? 0

  return (
    <article className="overflow-hidden rounded-nx-xl border border-nx-border bg-nx-surface">
      {/* Banner do evento */}
      <div className="relative h-16 overflow-hidden" style={{ background: t.grad }}>
        <Icon className="pointer-events-none absolute -bottom-4 -right-3 size-28 text-white/15" strokeWidth={1.5} />
        <div className="relative flex h-full items-start justify-between p-3">
          <span className="rounded-full bg-black/35 px-2.5 py-1 text-label-sm font-bold uppercase tracking-wide text-white backdrop-blur">
            {t.label}
          </span>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm font-bold backdrop-blur",
              done ? "bg-nx-evo/25 text-white" : "bg-black/35 text-white",
            )}
          >
            {done ? <><Check className="size-3.5" /> Concluído</> : <><CalendarClock className="size-3.5" /> {c.remaining}</>}
          </span>
        </div>
      </div>

      {/* Corpo */}
      <div className="space-y-2.5 p-3.5">
        <div>
          <h3 className="text-body-lg font-semibold text-nx-on-surface">{c.title}</h3>
          {c.description && <p className="mt-0.5 text-body-sm text-nx-on-surface-variant">{c.description}</p>}
        </div>

        {!done && (
          <>
            {/* Bloco de progresso + sequência */}
            <div className="rounded-nx-md border border-nx-border bg-nx-container-low p-2.5">
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-nx-streak" />
                <span className="text-body-sm text-nx-on-surface-variant">Sequência atual</span>
                <span className="ml-auto text-body-md font-bold text-nx-on-surface">
                  {streak > 0 ? `${streak} ${streak === 1 ? "dia" : "dias"} seguidos` : "Comece hoje 🔥"}
                </span>
              </div>

              <div className="mt-2">
                <ProgressBarNx value={c.progress} tone={t.tone} aria-label={`Progresso do desafio ${c.title}`} />
                <div className="mt-1 flex items-center justify-between text-body-sm">
                  <span className="font-semibold tabular-nums" style={{ color: t.accent }}>
                    {feitos} de {total} dias concluídos
                  </span>
                  <span className="text-nx-on-surface-variant tabular-nums">{c.progress}%</span>
                </div>
              </div>

              <p className="mt-1.5 text-body-sm text-nx-on-surface-variant">
                {bateuMeta ? (
                  <span className="font-semibold text-nx-evo">Recompensa garantida! 🎉</span>
                ) : (
                  <>Complete mais <span className="font-semibold" style={{ color: t.accent }}>{faltamRecompensa} dia{faltamRecompensa !== 1 ? "s" : ""}</span> para receber sua recompensa.</>
                )}
              </p>
            </div>

            {/* Calendário do desafio */}
            {c.dias && c.dias.length > 0 && (
              <div>
                <div className="flex flex-wrap gap-1.5">
                  {c.dias.map((d) => <DayDot key={d.dia} status={d.status} accent={t.accent} />)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-nx-on-surface-variant">
                  <span className="flex items-center gap-1"><span className="size-2.5 rounded-full" style={{ background: t.accent }} /> concluído</span>
                  <span className="flex items-center gap-1"><span className="size-2.5 rounded-full border-2" style={{ borderColor: t.accent }} /> hoje</span>
                  <span className="flex items-center gap-1"><span className="size-2.5 rounded-full border border-nx-outline" /> pendente</span>
                </div>
              </div>
            )}

            {/* Status do dia */}
            <div className="flex items-center gap-2 text-body-sm">
              {c.hojeConcluido ? (
                <><Check className="size-4 text-nx-evo" /><span className="font-semibold text-nx-evo">Hoje concluído</span></>
              ) : (
                <><Circle className="size-4 text-nx-on-surface-variant" /><span className="text-nx-on-surface-variant">Falta concluir hoje</span></>
              )}
            </div>

            {/* Sugestão: hábito já detectado nos registros — mas a confirmação continua manual */}
            {!c.hojeConcluido && c.sugestao && (
              <div className="flex items-center gap-2 rounded-nx-md border border-nx-evo/30 bg-nx-evo/8 px-3 py-2 text-body-sm text-nx-evo">
                <Check className="size-4 shrink-0" />
                <span>Você já cumpriu este hábito hoje.</span>
              </div>
            )}

            {/* Confirmação diária — todo desafio ativo, uma vez por dia */}
            {c.hojeConcluido ? (
              <button
                type="button"
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-nx-md border border-nx-border bg-nx-container-low py-2 text-body-md font-semibold text-nx-on-surface-variant opacity-70"
              >
                <Check className="size-4" /> Hoje concluído
              </button>
            ) : (
              <button
                type="button"
                disabled={marcando}
                onClick={() => onCumprir(c)}
                className="flex w-full items-center justify-center gap-2 rounded-nx-md bg-nx-evo py-2 text-body-md font-bold text-[#0A0A0A] shadow-[0_0_16px_rgba(124,255,91,0.35)] transition-opacity disabled:opacity-60"
              >
                <Zap className="size-4" /> {marcando ? "Confirmando…" : c.sugestao ? "Concluir agora" : "Concluir hoje"}
              </button>
            )}
          </>
        )}

        {/* Recompensas */}
        <div className="flex items-center gap-2 border-t border-nx-border pt-2.5">
          <span className="text-label-md uppercase text-nx-on-surface-variant">Recompensa</span>
          <div className="ml-auto flex items-center gap-2">
            {c.xp != null && c.xp > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-nx-gold/12 px-2.5 py-1 text-body-sm font-bold text-nx-gold">
                <Zap className="size-3.5" />+{c.xp} XP
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-nx-gold/12 px-2.5 py-1 text-body-sm font-bold text-nx-gold">
              <Trophy className="size-3.5" /> Conquista
            </span>
          </div>
        </div>

        {done && (
          <button
            type="button"
            onClick={() => onResgatar(c)}
            className="flex w-full items-center justify-center gap-2 rounded-nx-md bg-nx-evo/12 py-2 text-body-md font-semibold text-nx-evo transition-colors hover:bg-nx-evo/20"
          >
            <Gift className="size-4" /> Ver recompensa
          </button>
        )}
      </div>
    </article>
  )
}

export function DesafiosScreen() {
  const { challenges, reload } = usePacienteData()
  const { push, node: toasts } = useNxToasts()
  const [tab, setTab] = useState<"ativos" | "concluidos">("ativos")
  const [celeb, setCeleb] = useState<Challenge | null>(null)
  const [fila, setFila] = useState<Challenge[]>([])
  const [marcandoId, setMarcandoId] = useState<string | null>(null)
  const [destacadoId, setDestacadoId] = useState<string | null>(null)
  const focoAplicado = useRef(false)

  const ativos = challenges.filter((c) => c.status === "ativo")
  const concluidos = challenges.filter((c) => c.status === "concluido")

  // Deep-link ?d=<id> (notificação de desafio) — seleciona a aba, rola e destaca o card.
  useEffect(() => {
    if (focoAplicado.current) return
    const alvo = new URLSearchParams(window.location.search).get("d")
    if (!alvo) { focoAplicado.current = true; return }
    const alvoDesafio = challenges.find((c) => c.id === alvo)
    if (!alvoDesafio) return // aguarda os desafios carregarem
    focoAplicado.current = true
    if (alvoDesafio.status === "concluido") setTab("concluidos")
    setDestacadoId(alvo)
    window.setTimeout(() => {
      document.getElementById(`desafio-${alvo}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 300)
    window.setTimeout(() => setDestacadoId(null), 2600)
  }, [challenges])

  const doneKey = useMemo(() => concluidos.map((c) => c.id).join(","), [concluidos])

  // Ao concluir um desafio (primeira vez que aparece concluído), revela a recompensa.
  useEffect(() => {
    if (typeof window === "undefined") return
    const novos = concluidos.filter((c) => !localStorage.getItem(STORE(c.id)))
    if (novos.length === 0) return
    novos.forEach((c) => localStorage.setItem(STORE(c.id), "1"))
    setCeleb(novos[0])
    setFila(novos.slice(1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneKey])

  function fecharCeleb() {
    if (fila.length) {
      setCeleb(fila[0])
      setFila((f) => f.slice(1))
    } else {
      setCeleb(null)
    }
  }

  // Confirma o dia de hoje — a conclusão é sempre manual (backend, sem sistema paralelo).
  async function cumprir(c: Challenge) {
    if (marcandoId) return
    setMarcandoId(c.id)
    try {
      const { data } = await apiPaciente.post<{ jaMarcado?: boolean }>(
        `/registros/desafios/${c.id}/cumprir-hoje`,
      )
      await reload()
      if (!data?.jaMarcado) {
        push("Parabéns! Mais um dia concluído.", { tone: "evo", icon: <Check className="size-4" /> })
      }
    } catch {
      push("Não foi possível confirmar agora. Tente de novo.", { tone: "neutral" })
    } finally {
      setMarcandoId(null)
    }
  }

  const lista = tab === "ativos" ? ativos : concluidos
  const CelebIcon = celeb?.icon ?? Trophy

  return (
    <div className="space-y-4 px-5 pb-6 pt-5">
      <header>
        <h1 className="text-headline-lg text-nx-on-surface">Desafios</h1>
        <p className="mt-0.5 text-body-md text-nx-on-surface-variant">Acompanhe seu progresso e evolua todo dia</p>
      </header>

      {/* Segmentos */}
      <div className="grid grid-cols-2 gap-1 rounded-nx-md border border-nx-border bg-nx-container-low p-1">
        {(["ativos", "concluidos"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-nx-sm py-2 text-body-sm font-semibold transition-colors",
              tab === t ? "bg-nx-container-high text-nx-on-surface" : "text-nx-on-surface-variant",
            )}
          >
            {t === "ativos" ? `Ativos${ativos.length ? ` (${ativos.length})` : ""}` : `Concluídos${concluidos.length ? ` (${concluidos.length})` : ""}`}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-8 text-center">
          <Trophy className="mx-auto size-8 text-nx-outline" />
          <p className="mt-3 text-body-md text-nx-on-surface-variant">
            {tab === "ativos" ? "Nenhum desafio ativo agora." : "Você ainda não concluiu desafios."}
          </p>
          <p className="mt-1 text-body-sm text-nx-on-surface-variant">
            {tab === "ativos" ? "Seu nutri lança novos eventos por aqui." : "Complete um desafio e desbloqueie sua conquista."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((c) => (
            <div
              key={c.id}
              id={`desafio-${c.id}`}
              className={cn("rounded-nx-lg transition-shadow", destacadoId === c.id && "ring-2 ring-nx-evo ring-offset-2 ring-offset-nx-bg")}
            >
              <EventCard c={c} marcando={marcandoId === c.id} onResgatar={setCeleb} onCumprir={cumprir} />
            </div>
          ))}
        </div>
      )}

      {/* Celebração de conclusão do desafio inteiro */}
      <LevelUpOverlay
        open={!!celeb}
        nivel={0}
        onClose={fecharCeleb}
        eyebrow="Desafio concluído"
        ariaLabel={`Desafio concluído: ${celeb?.title ?? ""}`}
        bigContent={<CelebIcon className="size-11 text-nx-gold" />}
        titulo={celeb?.title}
        descricao={
          celeb?.xp != null && celeb.xp > 0
            ? `+${celeb.xp} XP · Conquista desbloqueada 🏆`
            : "Conquista desbloqueada 🏆"
        }
        ctaLabel="Resgatar"
      />

      {toasts}
    </div>
  )
}
