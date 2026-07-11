import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Crown, Flame, Zap, Trophy, Medal, ChevronRight, ArrowUp, Sparkles, Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePacienteData } from "@/lib/paciente-data"
import { LeagueEmblem } from "@/components/ui-nx"
import { CORES_LIGA } from "@/lib/ligas"
import type { RankUser } from "@/lib/nexvel-data"

const nf = (n: number) => Math.round(n).toLocaleString("pt-BR")
const primeiro = (nome: string) => nome.split(" ")[0]
const ligaDe = (league?: string) => (league ?? "Bronze").split(" ")[0]
const corLiga = (league?: string) => CORES_LIGA[ligaDe(league)] ?? "#7CFF5B"

function Avatar({ u, size, ring }: { u: RankUser; size: number; ring?: string }) {
  const real = u.avatar && !u.avatar.includes("placeholder")
  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-nx-container-high"
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
    >
      {real ? (
        <img src={u.avatar} alt={u.name} className="size-full object-cover" />
      ) : (
        <span className="font-bold text-nx-on-surface-variant" style={{ fontSize: size * 0.4 }}>{u.name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  )
}

/* ── Pódio: 2º esquerda, 1º centro (maior, glow dourado animado), 3º direita ── */
const ORDER = [1, 0, 2] as const
const MEDAL = [
  { color: "#F8C84B", size: 78, glow: "rgba(248,200,75,0.55)" }, // 1º
  { color: "#C2C9D2", size: 60, glow: "rgba(194,201,210,0.35)" }, // 2º
  { color: "#C77B3C", size: 60, glow: "rgba(199,123,60,0.35)" }, // 3º
] as const

function Podium({ top }: { top: RankUser[] }) {
  return (
    <div className="flex items-end justify-center gap-3">
      {ORDER.map((idx) => {
        const u = top[idx]
        if (!u) return <div key={idx} className="w-[30%]" />
        const m = MEDAL[idx]
        const first = idx === 0
        return (
          <div key={`${u.name}-${idx}`} className={cn("flex flex-col items-center", first ? "w-[38%]" : "w-[31%]")}>
            {first && <Crown className="mb-1.5 size-6 animate-pulse" style={{ color: m.color }} fill={m.color} />}
            <div className="relative">
              {first && (
                <span
                  className="absolute inset-0 -z-0 animate-pulse rounded-full blur-xl"
                  style={{ background: m.glow }}
                />
              )}
              <div className="relative rounded-full p-[2.5px]" style={{ background: m.color, boxShadow: `0 0 18px ${m.glow}` }}>
                <div className="rounded-full ring-2 ring-nx-surface">
                  <Avatar u={u} size={m.size} />
                </div>
                <span
                  className="absolute -bottom-1.5 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full text-label-md font-extrabold text-nx-on-evo ring-2 ring-nx-surface"
                  style={{ background: m.color }}
                >
                  {idx + 1}
                </span>
              </div>
            </div>
            <p className={cn("mt-3 max-w-full truncate text-body-sm font-bold", u.me ? "text-nx-evo" : "text-nx-on-surface")}>
              {u.me ? "Você" : primeiro(u.name)}
            </p>
            <p className="text-body-sm font-bold tabular-nums" style={{ color: m.color }}>{nf(u.points)} XP</p>
          </div>
        )
      })}
    </div>
  )
}

/* ── Linha da vizinhança do ranking ── */
function RegionRow({ u, hint }: { u: RankUser; hint?: string }) {
  const cor = corLiga(u.league)
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-nx-lg border px-3 py-2.5 transition-colors",
        u.me ? "border-nx-evo/60 bg-nx-evo/10 shadow-[0_0_20px_rgba(124,255,91,0.12)]" : "border-nx-border bg-nx-surface",
      )}
    >
      <span className={cn("w-7 text-center text-body-md font-extrabold tabular-nums", u.me ? "text-nx-evo" : "text-nx-on-surface-variant")}>
        {u.position}
      </span>
      <Avatar u={u} size={40} ring={u.me ? "#7CFF5B" : undefined} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-body-md font-bold text-nx-on-surface">
          {u.me && <Star className="size-3.5 shrink-0 text-nx-evo" fill="#7CFF5B" />}
          {u.me ? "Você" : primeiro(u.name)}
        </p>
        {hint ? (
          <p className="truncate text-label-sm font-semibold text-nx-evo">{hint}</p>
        ) : (
          <p className="truncate text-label-sm text-nx-on-surface-variant">{ligaDe(u.league)}</p>
        )}
      </div>
      <LeagueEmblem liga={ligaDe(u.league)} size={24} className="shrink-0" />
      <span className="shrink-0 text-body-sm font-bold tabular-nums text-nx-on-surface">
        {nf(u.points)} <span className="text-label-sm text-nx-on-surface-variant">XP</span>
      </span>
    </div>
  )
}

function StatTile({ icon: Icon, label, value, cor }: { icon: typeof Flame; label: string; value: string; cor: string }) {
  return (
    <div className="rounded-nx-lg border border-nx-border bg-nx-surface px-3 py-3.5">
      <Icon className="size-4" style={{ color: cor }} />
      <p className="mt-2 text-body-lg font-extrabold tabular-nums text-nx-on-surface">{value}</p>
      <p className="text-label-sm text-nx-on-surface-variant">{label}</p>
    </div>
  )
}

export function RankingScreen() {
  const navigate = useNavigate()
  const { ranking, user, myPosition, achievements } = usePacienteData()

  const view = useMemo(() => {
    const total = ranking.length
    const meIdx = ranking.findIndex((u) => u.me)
    const meRow = meIdx >= 0 ? ranking[meIdx] : null
    const acima = meIdx > 0 ? ranking[meIdx - 1] : null
    const meusPts = meRow?.points ?? user.points
    const gap = acima ? Math.max(0, acima.points - meusPts) : 0
    const lidera = meIdx === 0

    // vizinhança: 2 acima + você + 2 abaixo (nunca a lista inteira)
    const start = Math.max(0, meIdx - 2)
    const regiao = meIdx >= 0 ? ranking.slice(start, meIdx + 3) : []

    // zona de classificação (real: posição vs total)
    let zona: "promocao" | "segura" | "rebaixamento" = "segura"
    if (total > 0) {
      if (myPosition <= Math.max(3, Math.ceil(total * 0.25))) zona = "promocao"
      else if (myPosition > total - Math.max(3, Math.ceil(total * 0.25))) zona = "rebaixamento"
    }
    const zonaPct = total > 1 ? ((total - myPosition) / (total - 1)) * 100 : 100

    // vitórias em ligas = conquistas de subida de liga (dado real)
    const ligaWins = (achievements ?? []).filter((a) => a.tipo === "subiu_liga").length

    // quantos poderia ultrapassar fechando o dia (estimativa honesta)
    const restanteHoje = Math.max(0, user.todayGoal - user.todayPoints)
    const alcance = meusPts + restanteHoje
    const ultrapassaveis = meIdx > 0
      ? ranking.slice(0, meIdx).filter((u) => u.points > meusPts && u.points <= alcance).length
      : 0

    // mensagem motivacional dinâmica (só com dado real)
    let msg: string
    if (lidera) msg = "Você lidera o ranking 👑 — mantenha o topo com o check-in de hoje."
    else if (restanteHoje > 0 && ultrapassaveis > 0)
      msg = `Fechar seu dia pode te fazer ultrapassar ${ultrapassaveis} ${ultrapassaveis === 1 ? "pessoa" : "pessoas"}.`
    else if (gap > 0 && gap <= 50)
      msg = `Faltam só ${nf(gap)} XP pra passar ${acima ? primeiro(acima.name) : "o próximo"}. Você consegue hoje 💪`
    else if (user.pointsToNext > 0 && user.pointsToNext <= 120 && user.nextLeague !== "Liga máxima")
      msg = `Mais ${nf(user.pointsToNext)} XP e você sobe pra ${user.nextLeague}.`
    else if (user.streak >= 3)
      msg = `Você está há ${user.streak} dias em sequência 🔥 — não deixe a chama apagar.`
    else msg = "Cada check-in te aproxima do topo. Bora garantir o de hoje 🚀"

    return { total, meIdx, meRow, acima, meusPts, gap, lidera, regiao, zona, zonaPct, ligaWins, ultrapassaveis, msg }
  }, [ranking, user, myPosition, achievements])

  const top3 = ranking.slice(0, 3)
  const ligaCor = corLiga(user.league)
  const gapBarPct = view.acima && view.acima.points > 0 ? Math.min(100, (view.meusPts / view.acima.points) * 100) : 100

  const ZONA = {
    promocao: { label: "Zona de promoção", cor: "#7CFF5B", Icon: ArrowUp },
    segura: { label: "Zona segura", cor: "#9CA3AF", Icon: Medal },
    rebaixamento: { label: "Zona de rebaixamento", cor: "#FF5D5D", Icon: ArrowUp },
  }[view.zona]

  return (
    <div className="space-y-7 px-5 pb-24 pt-7">
      {/* 1 · Cabeçalho */}
      <header>
        <h1 className="text-headline-lg text-nx-on-surface">Ranking</h1>
        <p className="mt-0.5 text-body-md text-nx-on-surface-variant">Sua evolução na clínica</p>
      </header>

      {ranking.length === 0 ? (
        <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-8 text-center">
          <p className="text-body-md text-nx-on-surface-variant">O ranking ainda vai começar.</p>
          <p className="mt-1 text-body-sm text-nx-on-surface-variant">Feche seu dia pra entrar na disputa 🔥</p>
        </div>
      ) : (
        <>
          {/* 2 · Card do próprio paciente (sempre no topo) */}
          <section
            className="relative overflow-hidden rounded-nx-xl border p-5"
            style={{ borderColor: `${ligaCor}55`, background: `linear-gradient(160deg, ${ligaCor}14, transparent 60%)`, boxShadow: `0 0 30px ${ligaCor}18` }}
          >
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <span className="absolute inset-0 -z-0 rounded-full blur-lg" style={{ background: `${ligaCor}40` }} />
                <LeagueEmblem liga={ligaDe(user.league)} size={62} className="relative" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-label-sm uppercase tracking-wide text-nx-on-surface-variant">Sua liga</p>
                <p className="truncate text-headline-md font-extrabold" style={{ color: ligaCor }}>{user.league}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-nx-streak/15 px-2 py-0.5 text-label-sm font-semibold text-nx-streak">
                    <Flame className="size-3" fill="#FF8A1F" /> {user.streak} {user.streak === 1 ? "dia" : "dias"}
                  </span>
                  <span className="text-label-md font-bold tabular-nums text-nx-on-surface">{nf(view.meusPts)} <span className="text-nx-on-surface-variant">XP</span></span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-label-sm text-nx-on-surface-variant">Posição</p>
                <p className="text-display-lg font-extrabold leading-none tabular-nums text-nx-evo">{myPosition}º</p>
                <p className="text-label-sm text-nx-on-surface-variant">de {view.total}</p>
              </div>
            </div>

            {/* barra pra ultrapassar o de cima */}
            <div className="mt-4 border-t border-white/5 pt-3">
              {view.lidera ? (
                <p className="flex items-center gap-1.5 text-body-sm font-semibold text-nx-gold">
                  <Crown className="size-4" fill="#F8C84B" /> Você lidera o ranking. Continue no topo!
                </p>
              ) : (
                <>
                  <p className="text-body-sm text-nx-on-surface-variant">
                    Você está apenas <span className="font-extrabold text-nx-evo">{nf(view.gap)} XP</span> atrás de {view.acima ? primeiro(view.acima.name) : "o próximo"}.
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-nx-container-high">
                    <div className="h-full rounded-full bg-nx-evo transition-[width] duration-700" style={{ width: `${gapBarPct}%` }} />
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => navigate("/paciente/ligas")}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-nx-md bg-nx-evo py-2.5 text-body-sm font-bold text-nx-on-evo transition-colors hover:bg-nx-evo-2"
            >
              Ver minha liga <ChevronRight className="size-4" />
            </button>
          </section>

          {/* 8 · Motivação inteligente */}
          <div className="flex items-start gap-3 rounded-nx-lg border border-nx-evo/25 bg-nx-evo/[0.06] p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-nx-md bg-nx-evo/15 text-nx-evo">
              <Sparkles className="size-[18px]" />
            </span>
            <p className="pt-0.5 text-body-sm font-medium text-nx-on-surface">{view.msg}</p>
          </div>

          {/* 3 · Pódio */}
          {top3.length > 0 && (
            <section className="rounded-nx-xl border border-nx-border bg-nx-surface/60 p-5">
              <h2 className="mb-4 text-label-md uppercase tracking-wide text-nx-on-surface-variant">Pódio da clínica</h2>
              <Podium top={top3} />
            </section>
          )}

          {/* 4 · Minha região do ranking */}
          {view.regiao.length > 0 && (
            <section className="space-y-2">
              <h2 className="px-1 text-label-md uppercase tracking-wide text-nx-on-surface-variant">Sua vizinhança</h2>
              {view.regiao.map((u) => (
                <RegionRow
                  key={`${u.name}-${u.position}`}
                  u={u}
                  hint={!u.me && view.acima && u.position === view.acima.position && view.gap > 0 ? `↑ faltam ${nf(view.gap)} XP` : undefined}
                />
              ))}
            </section>
          )}

          {/* 5 · Barra de promoção */}
          <section className="rounded-nx-lg border border-nx-border bg-nx-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-label-md uppercase tracking-wide text-nx-on-surface-variant">Sua zona</h2>
              <span className="inline-flex items-center gap-1.5 text-label-md font-bold" style={{ color: ZONA.cor }}>
                <ZONA.Icon className="size-3.5" style={{ transform: view.zona === "rebaixamento" ? "rotate(180deg)" : undefined }} /> {ZONA.label}
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full" style={{ background: "linear-gradient(90deg, #7CFF5B 0%, #7CFF5B 30%, #3A3F48 30%, #3A3F48 70%, #FF5D5D 70%, #FF5D5D 100%)" }}>
              <span
                className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-nx-bg-lowest bg-white shadow"
                style={{ left: `${Math.min(96, Math.max(4, view.zonaPct))}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-label-sm text-nx-on-surface-variant">
              <span className="flex items-center gap-1"><ArrowUp className="size-3 text-nx-evo" /> Sobem</span>
              <span>Permanecem</span>
              <span className="flex items-center gap-1"><ArrowUp className="size-3 rotate-180 text-nx-danger" /> Descem</span>
            </div>
          </section>

          {/* 6 · Próxima recompensa */}
          <section className="rounded-nx-lg border border-nx-gold/30 bg-nx-gold/[0.06] p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-nx-md bg-nx-gold/15 text-nx-gold">
                <Trophy className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                {user.nextLeague === "Liga máxima" ? (
                  <p className="text-body-md font-bold text-nx-on-surface">Você chegou à liga máxima 👑</p>
                ) : (
                  <p className="text-body-md text-nx-on-surface">
                    Faltam <span className="font-extrabold text-nx-gold">{nf(user.pointsToNext)} XP</span> para <span className="font-bold">{user.nextLeague}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-nx-container-high">
              <div className="h-full rounded-full bg-nx-gold transition-[width] duration-700" style={{ width: `${Math.min(100, Math.max(2, user.leagueProgress))}%` }} />
            </div>
          </section>

          {/* 7 · Estatísticas rápidas */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon={Trophy} label="Posição" value={`${myPosition}º`} cor="#F8C84B" />
            <StatTile icon={Flame} label={`Sequência · rec. ${user.streakBest}`} value={`${user.streak}d`} cor="#FF8A1F" />
            <StatTile icon={Zap} label="XP hoje" value={nf(user.todayPoints)} cor="#7CFF5B" />
            <StatTile icon={Medal} label="Ligas subidas" value={nf(view.ligaWins)} cor="#49A8FF" />
          </section>
        </>
      )}
    </div>
  )
}
