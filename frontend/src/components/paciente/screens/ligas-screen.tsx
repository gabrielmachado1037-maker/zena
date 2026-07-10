import { Fragment } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronsUp, ChevronsDown, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePacienteData } from "@/lib/paciente-data"
import { LeagueEmblem, LEAGUE_FROM_NOME } from "@/components/ui-nx"
import { CORES_LIGA } from "@/lib/ligas"
import type { RankUser } from "@/lib/nexvel-data"

/** Glow por liga (igual à aba Ligas do nutri) para os brasões de destaque. */
const glow = (liga: string, blur = 14) => ({ filter: `drop-shadow(0 0 ${blur}px ${CORES_LIGA[liga] ?? "#7CFF5B"}55)` })

const TIERS = ["Bronze", "Prata", "Ouro", "Diamante", "Mestre", "Lendário"] as const
const nf = (n: number) => n.toLocaleString("pt-BR")

type Zone = "promo" | "safe" | "releg"

function RankRow({ u, posicao, zone }: { u: RankUser; posicao: number; zone: Zone }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-nx-md border px-3 py-2.5 transition-colors",
        u.me
          ? "border-nx-evo/50 bg-nx-evo/10"
          : zone === "promo"
            ? "border-nx-evo/20 bg-nx-evo/5"
            : zone === "releg"
              ? "border-nx-danger/20 bg-nx-danger/5"
              : "border-nx-border bg-nx-surface",
      )}
    >
      <div className="flex w-6 justify-center">
        <span
          className={cn(
            "text-body-md font-bold tabular-nums",
            zone === "promo" ? "text-nx-evo" : zone === "releg" ? "text-nx-danger" : "text-nx-on-surface-variant",
          )}
        >
          {posicao}
        </span>
      </div>
      <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-nx-container-high">
        {u.avatar && !u.avatar.includes("placeholder") ? (
          <img src={u.avatar} alt={u.name} className="size-full object-cover" />
        ) : (
          <span className="text-body-sm font-bold text-nx-on-surface-variant">{u.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-body-md font-semibold", u.me ? "text-nx-on-surface" : "text-nx-on-surface")}>
          {u.name}
          {u.me && <span className="ml-2 text-label-sm font-bold uppercase text-nx-evo">Você</span>}
        </p>
      </div>
      <span className="shrink-0 text-body-sm font-bold tabular-nums text-nx-on-surface">{nf(u.points)} <span className="text-nx-on-surface-variant">XP</span></span>
    </div>
  )
}

function ZoneDivider({ tipo, texto }: { tipo: "promo" | "releg"; texto: string }) {
  const promo = tipo === "promo"
  const Icon = promo ? ChevronsUp : ChevronsDown
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={cn("h-px flex-1", promo ? "bg-nx-evo/40" : "bg-nx-danger/40")} />
      <span className={cn("flex items-center gap-1 text-label-sm font-bold uppercase tracking-wide", promo ? "text-nx-evo" : "text-nx-danger")}>
        <Icon className="size-3.5" /> {texto}
      </span>
      <span className={cn("h-px flex-1", promo ? "bg-nx-evo/40" : "bg-nx-danger/40")} />
    </div>
  )
}

export function LigasScreen() {
  const navigate = useNavigate()
  const { user, ranking, currentLeagueIndex } = usePacienteData()

  const tierAtual = TIERS[currentLeagueIndex] ?? "Bronze"
  const nextKey = user.nextLeague.split(" ")[0]
  const temProxima = nextKey in LEAGUE_FROM_NOME

  // Jogadores da MESMA liga, ordenados por XP (o dado real vem ordenado).
  const daLiga: RankUser[] = ranking.filter((r) => r.league?.startsWith(tierAtual))
  const n = daLiga.length
  const promoCount = Math.min(3, n)
  const relegCount = n >= 7 ? 3 : 0
  const relegStart = n - relegCount

  const zoneOf = (i: number): Zone => {
    if (i < promoCount) return "promo"
    if (relegCount && i >= relegStart) return "releg"
    return "safe"
  }

  const meIdx = daLiga.findIndex((u) => u.me)
  const meZone = meIdx >= 0 ? zoneOf(meIdx) : null

  const status =
    meZone === "promo"
      ? { txt: "Você está subindo", cls: "bg-nx-evo/12 text-nx-evo", Icon: ChevronsUp }
      : meZone === "releg"
        ? { txt: "Você está na zona de queda", cls: "bg-nx-danger/12 text-nx-danger", Icon: ChevronsDown }
        : meZone === "safe"
          ? { txt: "Posição segura", cls: "bg-nx-container-high text-nx-on-surface-variant", Icon: ShieldCheck }
          : null

  return (
    <div className="px-5 pb-24 pt-5">
      {/* Top bar */}
      <div className="mb-5 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="rounded-nx-sm p-1.5 text-nx-outline hover:text-nx-on-surface">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-headline-lg text-nx-on-surface">Ligas</h1>
      </div>

      {/* Hero da liga */}
      <div className="rounded-nx-xl border border-nx-border bg-nx-surface p-5">
        <div className="flex items-center gap-4">
          <span className="inline-flex shrink-0" style={glow(tierAtual)}><LeagueEmblem liga={tierAtual} size={76} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-label-md uppercase text-nx-on-surface-variant">Sua liga</p>
            <p className="text-headline-md text-nx-on-surface">{user.league}</p>
            <p className="mt-0.5 text-body-md font-bold tabular-nums text-nx-on-surface">{nf(user.points)} XP</p>
          </div>
          {status && (
            <span className={cn("flex shrink-0 items-center gap-1 self-start rounded-full px-2.5 py-1 text-label-sm font-bold uppercase", status.cls)}>
              <status.Icon className="size-3.5" /> {meZone === "promo" ? "Subindo" : meZone === "releg" ? "Risco" : "Seguro"}
            </span>
          )}
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-nx-container-low">
          <div className="h-full rounded-full bg-nx-gold shadow-[0_0_10px_rgba(248,200,75,0.5)]" style={{ width: `${user.leagueProgress}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-body-sm text-nx-on-surface-variant">
            {user.pointsToNext > 0 ? (
              <>Faltam <span className="font-semibold text-nx-on-surface">{nf(user.pointsToNext)}</span> pra {user.nextLeague}</>
            ) : (
              "Você atingiu a liga máxima 👑"
            )}
          </p>
          {temProxima && <LeagueEmblem liga={nextKey} size={28} className="shrink-0 opacity-70" />}
        </div>
      </div>

      {/* Trajetória — escada de brasões */}
      <section className="mt-6">
        <h2 className="mb-3 text-label-md uppercase tracking-wide text-nx-on-surface-variant">Sua jornada</h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 hide-scrollbar">
          {TIERS.map((tier, i) => {
            const atual = i === currentLeagueIndex
            const passado = i < currentLeagueIndex
            return (
              <Fragment key={tier}>
                {i > 0 && <span className={cn("h-px w-3 shrink-0", passado || atual ? "bg-nx-evo/50" : "bg-nx-border")} />}
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <LeagueEmblem liga={tier} size={atual ? 52 : 40} className={cn("transition-transform", atual && "scale-105", !atual && !passado && "opacity-35", passado && "opacity-70")} />
                  <span className={cn("text-label-sm font-medium", atual ? "text-nx-on-surface" : "text-nx-on-surface-variant")}>{tier}</span>
                </div>
              </Fragment>
            )
          })}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-label-md uppercase tracking-wide text-nx-on-surface-variant">Liga {tierAtual}</h2>
          {status && (
            <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm font-semibold", status.cls)}>
              <status.Icon className="size-3.5" /> {status.txt}
            </span>
          )}
        </div>

        {n === 0 ? (
          <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-8 text-center">
            <span className="mx-auto block w-fit" style={glow(tierAtual)}><LeagueEmblem liga={tierAtual} size={64} /></span>
            <p className="mt-3 text-body-md text-nx-on-surface-variant">Você é pioneiro nesta liga.</p>
            <p className="mt-1 text-body-sm text-nx-on-surface-variant">Continue evoluindo pra defender o topo.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {daLiga.map((u, i) => (
              <Fragment key={`${u.name}-${i}`}>
                {i === promoCount && n > promoCount && (
                  <ZoneDivider tipo="promo" texto={temProxima ? `sobem pra ${nextKey}` : "zona de promoção"} />
                )}
                {relegCount > 0 && i === relegStart && <ZoneDivider tipo="releg" texto="zona de rebaixamento" />}
                <RankRow u={u} posicao={i + 1} zone={zoneOf(i)} />
              </Fragment>
            ))}
          </div>
        )}

        <p className="mt-3 px-1 text-center text-label-sm text-nx-on-surface-variant">
          Os {promoCount} primeiros sobem de liga{relegCount > 0 ? ` · os ${relegCount} últimos caem` : ""}
        </p>
      </section>
    </div>
  )
}
