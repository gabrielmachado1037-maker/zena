import { useEffect, useState } from "react"
import { Flame, Trophy, ChevronRight, Check } from "lucide-react"
import { usePacienteData } from "@/lib/paciente-data"
import apiPaciente from "@/lib/apiPaciente"
import {
  CardNx,
  ChipNx,
  ProgressBarNx,
  LeagueCrest,
  LEAGUE_FROM_NOME,
  MoodPicker,
  useNxToasts,
} from "@/components/ui-nx"
import type { NavigateFn } from "../types"

/* Anel de progresso animado (SVG) — usado compacto no card "Missão de hoje". */
function ProgressRing({
  pct,
  size = 120,
  stroke = 10,
  children,
}: {
  pct: number
  size?: number
  stroke?: number
  children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const target = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ
  const [offset, setOffset] = useState(circ)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setOffset(target)
      return
    }
    const id = requestAnimationFrame(() => setOffset(target))
    return () => cancelAnimationFrame(id)
  }, [target])

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1C212B" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#7CFF5B"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)",
            filter: "drop-shadow(0 0 6px rgba(124,255,91,0.5))",
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

const STREAK_MARCOS = [7, 14, 30, 60, 100]

function marcoSequencia(streak: number) {
  const marco = STREAK_MARCOS.find((m) => m > streak) ?? streak
  const faltam = Math.max(0, marco - streak)
  const anterior = [...STREAK_MARCOS].reverse().find((m) => m <= streak) ?? 0
  const base = marco - anterior || 1
  const pct = Math.min(100, ((streak - anterior) / base) * 100)
  return { marco, faltam, pct }
}

export function HomeScreen({ onNavigate }: { onNavigate: NavigateFn }) {
  const { user, today, missions, challenges, myPosition } = usePacienteData()
  const { push, node: toasts } = useNxToasts()
  const [humor, setHumor] = useState<string | null>(today.humor)

  const total = missions.length
  const done = missions.filter((m) => m.done).length
  const pct = total ? (done / total) * 100 : 0
  const completo = done === total && total > 0
  const faltam = total - done

  const ligaKey = user.league.split(" ")[0]
  const nextKey = user.nextLeague.split(" ")[0]
  const temProxima = nextKey in LEAGUE_FROM_NOME
  const desafio = challenges.find((c) => c.status === "ativo")
  const seq = marcoSequencia(user.streak)

  const subtitulo = completo
    ? "Dia completo — mandou bem 💚"
    : done === 0
      ? "Bora começar o dia?"
      : `Faltam ${faltam} ${faltam === 1 ? "missão" : "missões"} pra fechar o dia`

  async function salvarHumor(key: string) {
    setHumor(key)
    try {
      await apiPaciente.put("/registros/humor", { humor: key })
      push("Humor registrado", { tone: "evo", icon: <Check className="size-4" strokeWidth={3} /> })
    } catch {
      push("Não deu pra salvar o humor", { tone: "neutral" })
    }
  }

  return (
    <div className="space-y-5 px-5 pb-6 pt-7">
      {/* Saudação */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-headline-lg text-nx-on-surface">Olá, {user.firstName}</h1>
          <p className="mt-0.5 text-body-md text-nx-on-surface-variant">{subtitulo}</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("perfil")}
          aria-label="Abrir perfil"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-nx-container-high text-body-md font-bold text-nx-on-surface ring-1 ring-nx-border"
        >
          {user.firstName.charAt(0).toUpperCase()}
        </button>
      </header>

      {/* Humor — um toque */}
      <CardNx className="flex flex-col gap-3">
        <p className="text-label-md uppercase text-nx-on-surface-variant">Como você está hoje?</p>
        <MoodPicker value={humor} onSelect={salvarHumor} />
      </CardNx>

      {/* 1 — SEQUÊNCIA (foco) */}
      <CardNx accent="streak" className="flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-nx-streak/12">
          <Flame className="size-8 text-nx-streak" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-display-lg leading-none tabular-nums text-nx-on-surface">{user.streak}</span>
            <span className="text-body-md text-nx-on-surface-variant">{user.streak === 1 ? "dia" : "dias"} de sequência</span>
          </div>
          {user.streak > 0 ? (
            <>
              <div className="mt-2">
                <ProgressBarNx value={seq.pct} tone="streak" aria-label="Progresso da sequência" />
              </div>
              <p className="mt-1.5 text-body-sm text-nx-on-surface-variant">
                {seq.faltam > 0
                  ? <>Faltam <span className="font-semibold text-nx-on-surface">{seq.faltam}</span> pra marca de {seq.marco} dias</>
                  : "Você está no topo da sua sequência 🔥"}
                {user.streakBest > user.streak && <> · melhor: {user.streakBest}</>}
              </p>
            </>
          ) : (
            <p className="mt-1 text-body-sm text-nx-on-surface-variant">Feche o dia pra acender sua chama 🔥</p>
          )}
        </div>
      </CardNx>

      {/* 2 — LIGA & XP (a barra de XP é o progresso pra próxima liga) */}
      <button type="button" onClick={() => onNavigate("ligas")} className="block w-full text-left">
        <CardNx accent="gold" className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <LeagueCrest liga={ligaKey} size={54} />
            <div className="flex-1">
              <p className="text-label-md uppercase text-nx-on-surface-variant">Sua liga</p>
              <p className="text-headline-md text-nx-on-surface">{user.league}</p>
            </div>
            <div className="text-right">
              <p className="text-body-lg font-bold tabular-nums text-nx-on-surface">
                {user.points.toLocaleString("pt-BR")}
              </p>
              <p className="text-label-md uppercase text-nx-on-surface-variant">XP</p>
            </div>
          </div>
          <ProgressBarNx value={user.leagueProgress} tone="gold" aria-label="Progresso na liga" />
          <div className="flex items-center justify-between gap-3 text-body-sm">
            <span className="text-nx-on-surface-variant">
              Faltam <span className="font-semibold text-nx-on-surface">{user.pointsToNext.toLocaleString("pt-BR")}</span> pra {user.nextLeague}
            </span>
            {temProxima ? (
              <span className="flex shrink-0 items-center gap-1 opacity-70">
                <LeagueCrest liga={nextKey} size={30} animated={false} />
                <ChevronRight className="size-4 text-nx-outline" />
              </span>
            ) : (
              <ChevronRight className="size-4 shrink-0 text-nx-outline" />
            )}
          </div>
        </CardNx>
      </button>

      {/* 3 — MISSÃO DE HOJE (anel de progresso + CTA) */}
      <CardNx glow={completo} className="flex items-center gap-5">
        <ProgressRing pct={pct}>
          {completo ? (
            <div className="grid size-11 place-items-center rounded-full bg-nx-evo/15 nx-evo-pulse">
              <Check className="size-6 text-nx-evo" strokeWidth={3} />
            </div>
          ) : (
            <span className="text-headline-lg leading-none text-nx-evo tabular-nums">
              {done}<span className="text-nx-outline">/{total}</span>
            </span>
          )}
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-label-md uppercase text-nx-on-surface-variant">Missão de hoje</p>
          <p className="text-body-lg font-semibold text-nx-on-surface">
            {completo ? "Tudo registrado hoje" : `${faltam} ${faltam === 1 ? "missão" : "missões"} pra fechar`}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ChipNx tone="water" icon={<Trophy className="size-3.5" />}>#{myPosition > 0 ? myPosition : "—"} na liga</ChipNx>
          </div>
          {!completo && (
            <button
              type="button"
              onClick={() => onNavigate("registro")}
              className="mt-3 flex items-center gap-1 rounded-nx-md bg-nx-evo px-4 py-2 text-body-sm font-semibold text-nx-on-evo active:scale-95"
            >
              Continuar missões <ChevronRight className="size-4" />
            </button>
          )}
        </div>
      </CardNx>

      {/* 4 — PROGRESSO DAS MISSÕES (lista) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-label-md uppercase tracking-wide text-nx-on-surface-variant">Progresso das missões</h2>
          <span className="text-body-sm font-semibold tabular-nums text-nx-on-surface-variant">
            {done}/{total} <span className="text-nx-evo">✓</span>
          </span>
        </div>

        <CardNx className="divide-y divide-nx-border p-0">
          {missions.map((m) => {
            const Icon = m.icon
            return (
              <button
                key={m.id}
                type="button"
                disabled={m.done}
                onClick={() => onNavigate("registro")}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors enabled:hover:bg-nx-surface-hover disabled:cursor-default"
              >
                <div className={`grid size-10 shrink-0 place-items-center rounded-nx-md ${m.done ? "bg-nx-evo/15" : "bg-nx-container-high"}`}>
                  <Icon className={`size-5 ${m.done ? "text-nx-evo" : "text-nx-on-surface-variant"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-body-md font-medium ${m.done ? "text-nx-on-surface-variant line-through" : "text-nx-on-surface"}`}>
                    {m.title}
                  </p>
                  {!m.done && <p className="truncate text-body-sm text-nx-on-surface-variant">{m.subtitle}</p>}
                </div>
                {m.done ? (
                  <span className="flex items-center gap-1 text-body-sm font-bold text-nx-evo">
                    <Check className="size-4" strokeWidth={3} />+{m.earned.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-body-sm font-semibold text-nx-evo">
                    Registrar <ChevronRight className="size-4" />
                  </span>
                )}
              </button>
            )
          })}
        </CardNx>
      </section>

      {/* Desafio ativo (opcional) */}
      {desafio && (
        <button type="button" onClick={() => onNavigate("desafios")} className="block w-full text-left">
          <CardNx accent="evo" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-nx-md bg-nx-evo/12">
                  <desafio.icon className="size-5 text-nx-evo" />
                </div>
                <div>
                  <p className="text-label-md uppercase text-nx-on-surface-variant">Desafio ativo</p>
                  <p className="text-body-lg font-semibold text-nx-on-surface">{desafio.title}</p>
                </div>
              </div>
              <span className="text-body-sm text-nx-on-surface-variant">{desafio.remaining}</span>
            </div>
            <ProgressBarNx value={desafio.progress} tone="evo" aria-label={`Progresso do desafio ${desafio.title}`} />
          </CardNx>
        </button>
      )}

      {toasts}
    </div>
  )
}
