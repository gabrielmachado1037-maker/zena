import {
  Flame, Zap, Medal, Trophy, Camera, Crown, Lock,
  CalendarDays, Settings, TrendingUp, HelpCircle, LogOut, ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePacienteData } from "@/lib/paciente-data"
import { usePacienteAuth } from "@/contexts/PacienteAuthContext"
import { LeagueFrame, LeagueBadge, LeagueCrest } from "@/components/ui-nx"
import type { NavigateFn, Screen } from "../types"

/* Catálogo de conquistas — dá o efeito de COLEÇÃO (o que falta desbloquear aparece). */
const CATALOGO: { tipo: string; title: string; desc: string; icon: LucideIcon }[] = [
  { tipo: "sequencia_7", title: "Fogo Aceso", desc: "7 dias seguidos", icon: Flame },
  { tipo: "sequencia_30", title: "Imparável", desc: "30 dias seguidos", icon: Zap },
  { tipo: "subiu_liga", title: "Ascensão", desc: "Subiu de liga", icon: Medal },
  { tipo: "desafio_concluido", title: "Desafiante", desc: "Concluiu um desafio", icon: Trophy },
  { tipo: "checkpoint_foto", title: "Registro Visual", desc: "1ª foto de evolução", icon: Camera },
  { tipo: "lendario", title: "Lendário", desc: "Chegou ao topo", icon: Crown },
]

function StatCol({ value, label, tone, icon: Icon }: {
  value: string | number; label: string; tone: string; icon: LucideIcon
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-4">
      <Icon className={cn("size-5", tone)} />
      <span className="text-headline-md tabular-nums text-nx-on-surface">{value}</span>
      <span className="text-label-md uppercase text-nx-outline">{label}</span>
    </div>
  )
}

export function PerfilScreen({ onNavigate }: { onNavigate: NavigateFn }) {
  const { user, achievements, challenges, missions } = usePacienteData()
  const { logout, paciente } = usePacienteAuth()

  const ligaKey = user.league.split(" ")[0]
  const foto = paciente?.fotoUrl

  // coleção: casa cada slot do catálogo com a conquista ganha (achievements vêm desc por data)
  const earnedByTipo = new Map<string, (typeof achievements)[number]>()
  for (const a of achievements) if (a.tipo && !earnedByTipo.has(a.tipo)) earnedByTipo.set(a.tipo, a)
  const colecao = CATALOGO.map((c) => ({ ...c, earned: earnedByTipo.get(c.tipo) }))
  const earnedCount = colecao.filter((c) => c.earned).length

  const desafiosConcluidos = challenges.filter((c) => c.status === "concluido").length
  const desafiosAtivos = challenges.filter((c) => c.status === "ativo").length
  const missoesFeitas = missions.filter((m) => m.done).length

  const menu: { icon: LucideIcon; label: string; screen?: Screen; action?: () => void }[] = [
    { icon: CalendarDays, label: "Consultas", screen: "consultas" },
    { icon: TrendingUp, label: "Minha evolução", screen: "evolucao" },
    { icon: Settings, label: "Configurações", screen: "configuracoes" },
    { icon: HelpCircle, label: "Ajuda e suporte", action: () => { window.location.href = "mailto:suporte@nexvel.com.br" } },
  ]

  return (
    <div className="space-y-6 px-5 pb-6 pt-8">
      {/* Hero — identidade + pertencimento à liga */}
      <header className="flex flex-col items-center text-center">
        <div className="relative">
          <LeagueFrame liga={ligaKey} size={104} className="ring-2 ring-nx-bg">
            {foto ? (
              <img src={foto} alt={user.name} className="size-full object-cover" />
            ) : (
              <span className="text-headline-lg font-bold text-nx-on-surface">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </LeagueFrame>
          <span className="absolute -bottom-3 -right-2">
            <LeagueCrest liga={ligaKey} size={46} />
          </span>
        </div>
        <h1 className="mt-5 text-headline-lg text-nx-on-surface">{user.name}</h1>
        <div className="mt-2">
          <LeagueBadge liga={ligaKey} />
        </div>
      </header>

      {/* Stat band — Sequência · XP · Conquistas */}
      <div className="grid grid-cols-3 divide-x divide-nx-border rounded-nx-lg border border-nx-border bg-nx-surface">
        <StatCol value={user.streak} label="Sequência" tone="text-nx-streak" icon={Flame} />
        <StatCol value={user.points.toLocaleString("pt-BR")} label="XP" tone="text-nx-evo" icon={Zap} />
        <StatCol value={`${earnedCount}/${CATALOGO.length}`} label="Conquistas" tone="text-nx-gold" icon={Trophy} />
      </div>

      {/* Coleção de conquistas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-label-md uppercase tracking-wide text-nx-outline">Coleção</h2>
          <span className="text-body-sm font-semibold tabular-nums text-nx-on-surface-variant">
            {earnedCount} de {CATALOGO.length}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {colecao.map((c) => {
            const Icon = c.icon
            const got = !!c.earned
            return (
              <div
                key={c.tipo}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-nx-md border p-3 text-center transition-colors",
                  got ? "border-nx-gold/30 bg-nx-gold/8" : "border-nx-border bg-nx-container",
                )}
              >
                <div
                  className={cn(
                    "grid size-14 place-items-center rounded-full",
                    got ? "bg-nx-gold/15 shadow-[0_0_16px_rgba(248,200,75,0.25)]" : "bg-nx-container-high",
                  )}
                >
                  {got ? (
                    <Icon className="size-7 text-nx-gold" />
                  ) : (
                    <Lock className="size-6 text-nx-outline" />
                  )}
                </div>
                <div className="min-h-[2.4rem]">
                  <p className={cn("text-body-sm font-semibold leading-tight", got ? "text-nx-on-surface" : "text-nx-outline")}>
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-label-sm uppercase text-nx-outline">
                    {got ? c.earned!.date : c.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Desafios · Missões */}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => onNavigate("desafios")} className="text-left">
          <div className="h-full rounded-nx-md border border-nx-border bg-nx-surface p-4">
            <Trophy className="size-5 text-nx-evo" />
            <p className="mt-2 text-headline-md tabular-nums text-nx-on-surface">{desafiosConcluidos}</p>
            <p className="text-body-sm text-nx-outline">
              desafios vencidos{desafiosAtivos > 0 ? ` · ${desafiosAtivos} em curso` : ""}
            </p>
          </div>
        </button>
        <button type="button" onClick={() => onNavigate("registro")} className="text-left">
          <div className="h-full rounded-nx-md border border-nx-border bg-nx-surface p-4">
            <Flame className="size-5 text-nx-streak" />
            <p className="mt-2 text-headline-md tabular-nums text-nx-on-surface">
              {missoesFeitas}<span className="text-nx-outline">/{missions.length}</span>
            </p>
            <p className="text-body-sm text-nx-outline">missões de hoje</p>
          </div>
        </button>
      </div>

      {/* Histórico — linha do tempo da evolução */}
      <section className="space-y-3">
        <h2 className="px-1 text-label-md uppercase tracking-wide text-nx-outline">Histórico</h2>
        {achievements.length === 0 ? (
          <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-6 text-center">
            <p className="text-body-md text-nx-on-surface-variant">Sua história começa agora.</p>
            <p className="mt-1 text-body-sm text-nx-outline">Feche o dia e desbloqueie sua 1ª conquista.</p>
          </div>
        ) : (
          <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-2">
            {achievements.slice(0, 6).map((a, i, arr) => {
              const Icon = a.icon
              return (
                <div key={a.id} className="flex items-center gap-3 px-3 py-3">
                  <div className="relative flex flex-col items-center">
                    <div className="grid size-9 place-items-center rounded-full bg-nx-gold/15">
                      <Icon className="size-4 text-nx-gold" />
                    </div>
                    {i < arr.length - 1 && <span className="absolute top-9 h-[calc(100%-4px)] w-px bg-nx-border" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md font-medium text-nx-on-surface">{a.title}</p>
                    {a.description && <p className="truncate text-body-sm text-nx-outline">{a.description}</p>}
                  </div>
                  <span className="shrink-0 text-body-sm text-nx-outline">{a.date}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Acesso secundário (não é o foco — perfil é conquista, não formulário) */}
      <div className="overflow-hidden rounded-nx-lg border border-nx-border bg-nx-surface">
        {menu.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => (item.screen ? onNavigate(item.screen) : item.action?.())}
              className="flex w-full items-center gap-3 border-b border-nx-border px-4 py-3.5 text-left last:border-b-0 hover:bg-nx-surface-hover"
            >
              <Icon className="size-5 text-nx-on-surface-variant" />
              <span className="flex-1 text-body-md text-nx-on-surface">{item.label}</span>
              <ChevronRight className="size-4 text-nx-outline" />
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-nx-lg border border-nx-danger/30 py-3.5 text-body-sm font-medium text-nx-danger transition-colors hover:bg-nx-danger/10"
      >
        <LogOut className="size-4" />
        Sair da conta
      </button>
    </div>
  )
}
