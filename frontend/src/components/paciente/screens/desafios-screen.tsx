import { useEffect, useMemo, useState } from "react"
import { Check, Zap, Trophy, Gift, CalendarClock } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePacienteData } from "@/lib/paciente-data"
import { ProgressBarNx, LevelUpOverlay } from "@/components/ui-nx"
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

function EventCard({ c, onResgatar }: { c: Challenge; onResgatar: (c: Challenge) => void }) {
  const t = tema(c.tipo)
  const Icon = c.icon
  const done = c.status === "concluido"

  return (
    <article className="overflow-hidden rounded-nx-xl border border-nx-border bg-nx-surface">
      {/* Banner do evento */}
      <div className="relative h-24 overflow-hidden" style={{ background: t.grad }}>
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
      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-body-lg font-semibold text-nx-on-surface">{c.title}</h3>
          {c.description && <p className="mt-0.5 text-body-sm text-nx-on-surface-variant">{c.description}</p>}
        </div>

        <div>
          <ProgressBarNx value={c.progress} tone={t.tone} celebrate={done} aria-label={`Progresso do desafio ${c.title}`} />
          <div className="mt-1.5 flex items-center justify-between text-body-sm">
            <span className="font-semibold tabular-nums" style={{ color: t.accent }}>{c.progress}%</span>
            {!done && <span className="text-nx-on-surface-variant">{c.remaining}</span>}
          </div>
        </div>

        {/* Recompensas */}
        <div className="flex items-center gap-2 border-t border-nx-border pt-3">
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
            className="flex w-full items-center justify-center gap-2 rounded-nx-md bg-nx-evo/12 py-2.5 text-body-md font-semibold text-nx-evo transition-colors hover:bg-nx-evo/20"
          >
            <Gift className="size-4" /> Ver recompensa
          </button>
        )}
      </div>
    </article>
  )
}

export function DesafiosScreen() {
  const { challenges } = usePacienteData()
  const [tab, setTab] = useState<"ativos" | "concluidos">("ativos")
  const [celeb, setCeleb] = useState<Challenge | null>(null)
  const [fila, setFila] = useState<Challenge[]>([])

  const ativos = challenges.filter((c) => c.status === "ativo")
  const concluidos = challenges.filter((c) => c.status === "concluido")

  const doneKey = useMemo(() => concluidos.map((c) => c.id).join(","), [concluidos])

  // Ao concluir um desafio (primeira vez que aparece concluído), revela a recompensa — Parte 2.
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

  const lista = tab === "ativos" ? ativos : concluidos
  const CelebIcon = celeb?.icon ?? Trophy

  return (
    <div className="space-y-5 px-5 pb-6 pt-7">
      <header>
        <h1 className="text-headline-lg text-nx-on-surface">Desafios</h1>
        <p className="mt-0.5 text-body-md text-nx-on-surface-variant">Eventos pra você evoluir mais rápido</p>
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
        <div className="space-y-4">
          {lista.map((c) => <EventCard key={c.id} c={c} onResgatar={setCeleb} />)}
        </div>
      )}

      {/* Celebração de conclusão — Parte 2 */}
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
    </div>
  )
}
