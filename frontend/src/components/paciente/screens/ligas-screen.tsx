import { useNavigate } from "react-router-dom";
import { ChevronLeft, Flame, Check, Lock, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { usePacienteData } from "@/lib/paciente-data";
import { CORES_LIGA, ICONE_LIGA } from "@/lib/ligas";
import type { RankUser } from "@/lib/nexvel-data";

const TIERS = ["Bronze", "Prata", "Ouro", "Diamante", "Mestre", "Lendário"] as const;
const nf = (n: number) => n.toLocaleString("pt-BR");

/* Benefícios: copy de produto (estático). O ESTADO é derivado da liga real do paciente. */
const BENEFICIOS = [
  "Acesso básico ao ranking",
  "Desafios exclusivos Prata",
  "Badge dourado no perfil",
  "Desafios premium + destaque",
  "Acesso VIP + suporte prioritário",
  "Status máximo + troféu físico",
];

type Estado = "feito" | "atual" | "bloqueado";

function Pill({ children, variant = "neutral" }: { children: React.ReactNode; variant?: "gold" | "purple" | "green" | "neutral" }) {
  const cls = {
    gold: "bg-gold/15 text-gold",
    purple: "bg-primary/15 text-primary",
    green: "bg-green/15 text-green",
    neutral: "bg-secondary text-muted-foreground",
  }[variant];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", cls)}>{children}</span>;
}

function ZoneBanner({ tipo, texto }: { tipo: "promo" | "queda"; texto: string }) {
  const promo = tipo === "promo";
  return (
    <div className={cn("flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold", promo ? "bg-green/12 text-green" : "bg-danger/12 text-danger")}>
      <span className={cn("size-2 rounded-full", promo ? "bg-green" : "bg-danger")} />
      {texto}
    </div>
  );
}

function RankRow({ u, streakDias }: { u: RankUser; streakDias?: number }) {
  return (
    <Card className={cn("flex flex-row items-center gap-3 rounded-[14px] p-3", u.me && "border-primary/50 bg-primary/10")}>
      <div className="flex w-5 justify-center text-sm font-bold text-muted-foreground">{u.position}</div>
      <Avatar className="size-10">
        <AvatarImage src={u.avatar} alt={u.name} />
        <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold leading-tight">{u.name}</p>
          {u.me && <Pill variant="purple">VOCÊ</Pill>}
        </div>
        {u.league && <p className="truncate text-xs text-muted-foreground">{u.league}</p>}
      </div>
      {streakDias != null && streakDias > 0 && (
        <span className="flex items-center gap-0.5 text-xs font-medium text-gold">
          <Flame size={12} /> {streakDias}d
        </span>
      )}
      <span className="text-sm font-bold text-gold">{nf(u.points)} pts</span>
    </Card>
  );
}

function BenefitRow({ label, estado }: { label: string; estado: Estado }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-[14px] px-3.5 py-3", estado === "atual" ? "bg-gold/10 ring-1 ring-gold/40" : "bg-card")}>
      <span className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full",
        estado === "feito" && "bg-green/15 text-green",
        estado === "atual" && "bg-gold/20 text-gold",
        estado === "bloqueado" && "bg-secondary text-muted-foreground",
      )}>
        {estado === "bloqueado" ? <Lock size={14} /> : <Check size={15} />}
      </span>
      <span className={cn("flex-1 text-sm", estado === "bloqueado" ? "text-muted-foreground" : "text-foreground")}>{label}</span>
      {estado === "atual" && <Pill variant="gold">Atual</Pill>}
    </div>
  );
}

export function LigasScreen() {
  const navigate = useNavigate();
  const { user, ranking, currentLeagueIndex } = usePacienteData();

  const tierAtual = TIERS[currentLeagueIndex] ?? "Bronze";
  const corTier = CORES_LIGA[tierAtual] ?? "#F5A623";

  // Top jogadores da MESMA liga (dado real). Reordena posições dentro da liga.
  const daLiga: RankUser[] = ranking
    .filter((r) => r.league?.startsWith(tierAtual))
    .map((r, i) => ({ ...r, position: i + 1 }));

  return (
    <div className="mx-auto max-w-[430px] px-4 pb-28 pt-5">
      {/* Top bar */}
      <div className="mb-5 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground">
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-[22px] font-bold leading-none tracking-tight">Ligas</h1>
          <p className="mt-1 text-xs text-muted-foreground">Sua posição atual</p>
        </div>
      </div>

      {/* Card herói da liga */}
      <Card
        className="mb-6 rounded-[18px] p-5"
        style={{ borderColor: `${corTier}66`, boxShadow: `0 0 24px ${corTier}33` }}
      >
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full text-3xl" style={{ background: `${corTier}22` }}>
            {ICONE_LIGA[tierAtual]}
          </span>
          <div className="flex-1">
            <p className="text-xl font-extrabold uppercase tracking-wide" style={{ color: corTier }}>{user.league}</p>
            <p className="text-lg font-bold text-gold">{nf(user.points)} pts</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full" style={{ width: `${user.leagueProgress}%`, background: corTier, boxShadow: `0 0 8px ${corTier}88` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {user.pointsToNext > 0 ? `Faltam ${nf(user.pointsToNext)} pts para ${user.nextLeague}` : "Você atingiu a liga máxima 👑"}
        </p>
      </Card>

      {/* Trajetória das Ligas */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-bold text-foreground">Trajetória das Ligas</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {TIERS.map((tier, i) => {
            const atual = i === currentLeagueIndex;
            const passado = i < currentLeagueIndex;
            return (
              <div key={tier} className="flex shrink-0 flex-col items-center gap-1.5">
                <div
                  className={cn("flex size-14 items-center justify-center rounded-2xl text-2xl transition-opacity", !atual && !passado && "opacity-40")}
                  style={{ background: atual ? `${CORES_LIGA[tier]}22` : "var(--secondary, #1B1C28)", boxShadow: atual ? `0 0 16px ${CORES_LIGA[tier]}55` : undefined }}
                >
                  {ICONE_LIGA[tier]}
                </div>
                <span className={cn("text-[11px] font-medium", atual ? "text-foreground" : "text-muted-foreground")}>{tier}</span>
                {atual && <span className="size-1.5 rounded-full" style={{ background: CORES_LIGA[tier] }} />}
              </div>
            );
          })}
        </div>
      </section>

      {/* Benefícios da sua liga */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-bold text-foreground">Benefícios da sua liga</h2>
        <div className="space-y-2">
          {BENEFICIOS.map((label, i) => {
            const estado: Estado = i < currentLeagueIndex ? "feito" : i === currentLeagueIndex ? "atual" : "bloqueado";
            return <BenefitRow key={label} label={label} estado={estado} />;
          })}
        </div>
      </section>

      {/* Top jogadores da liga */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Trophy size={15} className="text-gold" /> Top jogadores — Liga {tierAtual}
        </h2>
        {daLiga.length === 0 ? (
          <p className="rounded-[14px] bg-card p-6 text-center text-sm text-muted-foreground">Ainda não há outros jogadores nesta liga.</p>
        ) : (
          <div className="space-y-2">
            <ZoneBanner tipo="promo" texto="Zona de promoção — Top 3 sobem!" />
            {daLiga.map((u) => <RankRow key={u.name + u.position} u={u} />)}
            <ZoneBanner tipo="queda" texto="Zona de queda — Bottom 3 descem!" />
          </div>
        )}
      </section>
    </div>
  );
}
