import { useNavigate } from "react-router-dom";
import { ChevronRight, Crown, Flame, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { usePacienteData } from "@/lib/paciente-data";
import { CORES_LIGA, ICONE_LIGA } from "@/lib/ligas";
import type { RankUser } from "@/lib/nexvel-data";

const TIERS = ["Bronze", "Prata", "Ouro", "Diamante", "Mestre", "Lendário"] as const;
const nf = (n: number) => n.toLocaleString("pt-BR");

/* Ordem visual do pódio: 2º à esquerda, 1º ao centro (maior), 3º à direita. */
const PODIUM_ORDER = [1, 0, 2] as const;
const PODIUM_META = [
  { medal: "🥇", ring: "#FFD34E", h: "h-20" },
  { medal: "🥈", ring: "#C9D2E0", h: "h-14" },
  { medal: "🥉", ring: "#E0A96D", h: "h-11" },
] as const;

function Pill({ children, variant = "purple" }: { children: React.ReactNode; variant?: "gold" | "purple" }) {
  const cls = variant === "gold" ? "bg-gold/15 text-gold" : "bg-primary/15 text-primary";
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide", cls)}>{children}</span>;
}

function Podium({ top }: { top: RankUser[] }) {
  return (
    <div className="mb-6 flex items-end justify-center gap-3">
      {PODIUM_ORDER.map((idx) => {
        const u = top[idx];
        if (!u) return <div key={idx} className="w-[30%]" />;
        const meta = PODIUM_META[idx];
        const first = idx === 0;
        return (
          <div key={u.name + u.position} className="flex w-[30%] flex-col items-center">
            <span className="mb-1 text-xl" aria-hidden>{meta.medal}</span>
            <div className="relative">
              <Avatar className={cn("border-2", first ? "size-16" : "size-12")} style={{ borderColor: meta.ring }}>
                <AvatarImage src={u.avatar} alt={u.name} />
                <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {first && (
                <Crown size={18} className="absolute -top-3 left-1/2 -translate-x-1/2" style={{ color: meta.ring }} fill={meta.ring} />
              )}
            </div>
            <p className={cn("mt-1.5 max-w-full truncate text-center text-xs font-semibold", u.me && "text-primary")}>
              {u.me ? "Você" : u.name.split(" ")[0]}
            </p>
            <p className="text-[11px] font-bold text-gold">{nf(u.points)}</p>
            <div
              className={cn("mt-1.5 w-full rounded-t-lg", meta.h)}
              style={{ background: `linear-gradient(to top, ${meta.ring}00, ${meta.ring}33)`, boxShadow: `inset 0 1px 0 ${meta.ring}66` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function RankRow({ u }: { u: RankUser }) {
  return (
    <Card className={cn("flex flex-row items-center gap-3 rounded-[14px] p-3", u.me && "border-primary/50 bg-primary/10")}>
      <div className="flex w-5 justify-center text-sm font-bold text-muted-foreground">{u.position}</div>
      <Avatar className="size-10">
        <AvatarImage src={u.avatar} alt={u.name} />
        <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold leading-tight">{u.me ? "Você" : u.name}</p>
          {u.me && <Pill>VOCÊ</Pill>}
        </div>
        {u.league && <p className="truncate text-xs text-muted-foreground">{u.league}</p>}
      </div>
      <span className="text-sm font-bold text-gold">{nf(u.points)} pts</span>
    </Card>
  );
}

export function RankingScreen() {
  const navigate = useNavigate();
  const { ranking, user, myPosition, currentLeagueIndex } = usePacienteData();

  const top3 = ranking.slice(0, 3);
  const resto = ranking.slice(3);
  const tierAtual = TIERS[currentLeagueIndex] ?? "Bronze";
  const corTier = CORES_LIGA[tierAtual] ?? "#F5A623";

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-[430px] flex-1 overflow-y-auto px-4 pb-40 pt-6">
        {/* Header */}
        <div className="mb-5">
          <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight">
            <Trophy size={20} className="text-gold" /> Ranking
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">Classificação geral da sua clínica</p>
        </div>

        {ranking.length === 0 ? (
          <p className="rounded-[14px] bg-card p-8 text-center text-sm text-muted-foreground">
            O ranking ainda não foi calculado. Registre seu dia para pontuar! 🔥
          </p>
        ) : (
          <>
            {/* Pódio Top 3 */}
            {top3.length > 0 && <Podium top={top3} />}

            {/* Atalho para a Liga */}
            <button
              onClick={() => navigate("/paciente/ligas")}
              className="mb-6 flex w-full items-center gap-3 rounded-[16px] p-4 text-left transition-transform active:scale-[0.99]"
              style={{ background: `${corTier}14`, border: `1px solid ${corTier}44` }}
            >
              <span className="flex size-11 items-center justify-center rounded-full text-2xl" style={{ background: `${corTier}22` }}>
                {ICONE_LIGA[tierAtual]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold" style={{ color: corTier }}>Liga {tierAtual}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.pointsToNext > 0 ? `Faltam ${nf(user.pointsToNext)} pts para ${user.nextLeague}` : "Liga máxima atingida 👑"}
                </p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                Ver liga <ChevronRight size={16} />
              </span>
            </button>

            {/* Classificação geral (do 4º em diante) */}
            {resto.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                  <Flame size={15} className="text-gold" /> Classificação geral
                </h2>
                <div className="space-y-2">
                  {resto.map((u) => <RankRow key={u.name + u.position} u={u} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Barra fixa com a posição do próprio paciente */}
      {ranking.length > 0 && (
        <div className="fixed inset-x-0 bottom-[60px] z-30 mx-auto max-w-[430px] border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between rounded-xl bg-primary/15 px-4 py-3 ring-1 ring-primary/30">
            <span className="text-sm font-medium text-muted-foreground">
              Sua posição: <span className="font-bold text-foreground">{myPosition > 0 ? `${myPosition}º` : "—"}</span>
            </span>
            <span className="font-bold text-primary">{nf(user.points)} pts</span>
          </div>
        </div>
      )}
    </div>
  );
}
