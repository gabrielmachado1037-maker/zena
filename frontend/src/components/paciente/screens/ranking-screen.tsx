import { useNavigate } from "react-router-dom"
import { Crown, ChevronRight, ChevronsUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePacienteData } from "@/lib/paciente-data"
import { LeagueCrest } from "@/components/ui-nx"
import type { RankUser } from "@/lib/nexvel-data"

const nf = (n: number) => n.toLocaleString("pt-BR")
const primeiro = (nome: string) => nome.split(" ")[0]
const ligaDe = (league?: string) => (league ?? "Bronze").split(" ")[0]

/* Pódio: 2º à esquerda, 1º ao centro (maior), 3º à direita. */
const ORDER = [1, 0, 2] as const
const MEDAL = [
  { color: "#F8C84B", h: 92, size: 72, glow: "rgba(248,200,75,0.45)" }, // 1º
  { color: "#C2C9D2", h: 66, size: 56, glow: "rgba(194,201,210,0.35)" }, // 2º
  { color: "#C77B3C", h: 52, size: 56, glow: "rgba(199,123,60,0.35)" }, // 3º
] as const

function Avatar({ u, size }: { u: RankUser; size: number }) {
  const real = u.avatar && !u.avatar.includes("placeholder")
  return (
    <div className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-nx-container-high" style={{ width: size, height: size }}>
      {real ? (
        <img src={u.avatar} alt={u.name} className="size-full object-cover" />
      ) : (
        <span className="font-bold text-nx-on-surface-variant" style={{ fontSize: size * 0.4 }}>{u.name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  )
}

function Podium({ top }: { top: RankUser[] }) {
  return (
    <div className="flex items-end justify-center gap-3">
      {ORDER.map((idx) => {
        const u = top[idx]
        if (!u) return <div key={idx} className="w-[30%]" />
        const m = MEDAL[idx]
        const first = idx === 0
        return (
          <div key={`${u.name}-${idx}`} className="flex w-[30%] flex-col items-center">
            {first && <Crown className="mb-1 size-5" style={{ color: m.color }} fill={m.color} />}
            <div className="relative rounded-full p-[2px]" style={{ background: m.color, boxShadow: `0 0 16px ${m.glow}` }}>
              <div className="rounded-full ring-2 ring-nx-surface">
                <Avatar u={u} size={m.size} />
              </div>
              <span
                className="absolute -bottom-1 left-1/2 grid size-5 -translate-x-1/2 place-items-center rounded-full text-label-sm font-bold text-nx-on-evo"
                style={{ background: m.color }}
              >
                {idx + 1}
              </span>
            </div>
            <p className={cn("mt-2 max-w-full truncate text-body-sm font-semibold", u.me ? "text-nx-evo" : "text-nx-on-surface")}>
              {u.me ? "Você" : primeiro(u.name)}
            </p>
            <p className="text-body-sm font-bold tabular-nums text-nx-on-surface-variant">{nf(u.points)}</p>
            <div
              className="mt-2 grid w-full place-items-center rounded-t-nx-sm"
              style={{ height: m.h, background: `linear-gradient(to top, ${m.color}05, ${m.color}2e)`, boxShadow: `inset 0 1px 0 ${m.color}55` }}
            >
              <span className="text-headline-md font-extrabold tabular-nums" style={{ color: m.color }}>{idx + 1}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RankRow({ u }: { u: RankUser }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-nx-md border px-3 py-2.5", u.me ? "border-nx-evo/50 bg-nx-evo/10" : "border-nx-border bg-nx-surface")}>
      <span className="w-6 text-center text-body-md font-bold tabular-nums text-nx-on-surface-variant">{u.position}</span>
      <Avatar u={u} size={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-md font-semibold text-nx-on-surface">
          {u.me ? "Você" : u.name}
        </p>
        {u.league && <p className="truncate text-body-sm text-nx-on-surface-variant">{u.league}</p>}
      </div>
      <LeagueCrest liga={ligaDe(u.league)} size={22} animated={false} className="shrink-0" />
      <span className="shrink-0 text-body-sm font-bold tabular-nums text-nx-on-surface">{nf(u.points)} <span className="text-nx-on-surface-variant">XP</span></span>
    </div>
  )
}

export function RankingScreen() {
  const navigate = useNavigate()
  const { ranking, user, myPosition } = usePacienteData()

  const top3 = ranking.slice(0, 3)
  const resto = ranking.slice(3)

  const meIdx = ranking.findIndex((u) => u.me)
  const acima = meIdx > 0 ? ranking[meIdx - 1] : null
  const meusPts = meIdx >= 0 ? ranking[meIdx].points : user.points
  const gap = acima ? acima.points - meusPts : 0
  const lidera = meIdx === 0
  const noPodio = meIdx >= 0 && meIdx < 3

  return (
    <div className="space-y-6 px-5 pb-24 pt-7">
      <header>
        <h1 className="text-headline-lg text-nx-on-surface">Ranking</h1>
        <p className="mt-0.5 text-body-md text-nx-on-surface-variant">Classificação geral da sua clínica</p>
      </header>

      {ranking.length === 0 ? (
        <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-8 text-center">
          <p className="text-body-md text-nx-on-surface-variant">O ranking ainda vai começar.</p>
          <p className="mt-1 text-body-sm text-nx-on-surface-variant">Feche seu dia pra entrar na disputa 🔥</p>
        </div>
      ) : (
        <>
          {top3.length > 0 && <Podium top={top3} />}

          {/* Sua posição + distância pro próximo */}
          {myPosition > 0 && (
            <div className="rounded-nx-lg border border-nx-evo/40 bg-nx-evo/8 p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-nx-md bg-nx-evo/15 text-headline-md font-extrabold tabular-nums text-nx-evo">
                  {myPosition}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-lg font-semibold text-nx-on-surface">Sua posição</p>
                  <p className="text-body-sm text-nx-on-surface-variant">{user.league}</p>
                </div>
                <span className="text-body-lg font-bold tabular-nums text-nx-on-surface">{nf(meusPts)} <span className="text-body-sm text-nx-on-surface-variant">XP</span></span>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-nx-evo/20 pt-3 text-body-sm">
                {lidera ? (
                  <span className="flex items-center gap-1.5 font-semibold text-nx-gold"><Crown className="size-4" fill="#F8C84B" /> Você lidera o ranking</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-nx-on-surface-variant">
                    <ChevronsUp className="size-4 text-nx-evo" />
                    Faltam <span className="font-bold text-nx-evo">{nf(gap)} XP</span> pra passar {acima ? primeiro(acima.name) : "o próximo"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Link pra sua liga (competição por tier) */}
          <button
            onClick={() => navigate("/paciente/ligas")}
            className="flex w-full items-center gap-3 rounded-nx-md border border-nx-border bg-nx-surface p-3 text-left transition-colors hover:border-nx-outline"
          >
            <LeagueCrest liga={ligaDe(user.league)} size={34} animated={false} />
            <div className="min-w-0 flex-1">
              <p className="text-body-md font-semibold text-nx-on-surface">Sua liga · {ligaDe(user.league)}</p>
              <p className="truncate text-body-sm text-nx-on-surface-variant">Disputa de promoção e queda</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-nx-outline" />
          </button>

          {/* Classificação geral (4º em diante) */}
          {resto.length > 0 && (
            <section className="space-y-2">
              <h2 className="px-1 text-label-md uppercase tracking-wide text-nx-on-surface-variant">Classificação geral</h2>
              {resto.map((u) => <RankRow key={`${u.name}-${u.position}`} u={u} />)}
            </section>
          )}
        </>
      )}
    </div>
  )
}
