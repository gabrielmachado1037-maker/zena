import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

/** Chaves canônicas de liga (assinatura visual + moldura em index.css: .league-frame-*). */
export type LeagueKey = "bronze" | "silver" | "gold" | "diamond" | "master" | "legendary";

/** Aceita o nome PT-BR usado no backend e resolve para a chave/assinatura da liga. */
export const LEAGUE_FROM_NOME: Record<string, LeagueKey> = {
  Bronze: "bronze",
  Prata: "silver",
  Ouro: "gold",
  Diamante: "diamond",
  Mestre: "master",
  "Lendário": "legendary",
  Lendario: "legendary",
};

const META: Record<LeagueKey, { label: string; color: string; text: string }> = {
  bronze: { label: "Bronze", color: "#C77B3C", text: "text-league-bronze" },
  silver: { label: "Prata", color: "#C2C9D2", text: "text-league-silver" },
  gold: { label: "Ouro", color: "#F8C84B", text: "text-league-gold" },
  diamond: { label: "Diamante", color: "#8FE3FF", text: "text-league-diamond" },
  master: { label: "Mestre", color: "#A855F7", text: "text-league-master" },
  legendary: { label: "Lendário", color: "#F8C84B", text: "text-league-legendary" },
};

export function resolveLeague(liga: LeagueKey | string): LeagueKey {
  if (liga in META) return liga as LeagueKey;
  return LEAGUE_FROM_NOME[liga] ?? "bronze";
}

interface LeagueFrameProps {
  liga: LeagueKey | string;
  size?: number;
  children?: ReactNode;
  className?: string;
}

/** Moldura de liga em volta de um avatar/ícone — a assinatura visual da liga. */
export function LeagueFrame({ liga, size = 56, children, className }: LeagueFrameProps) {
  const key = resolveLeague(liga);
  return (
    <div
      className={cn(
        `league-frame-${key}`,
        key === "legendary" && "nx-evo-pulse",
        "rounded-full grid place-items-center overflow-hidden bg-nx-container",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}

/** Selo textual da liga (chip com a cor-assinatura). */
export function LeagueBadge({ liga, className }: { liga: LeagueKey | string; className?: string }) {
  const key = resolveLeague(liga);
  const m = META[key];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-label-md font-bold leading-none",
        m.text,
        className,
      )}
      style={{ borderColor: `${m.color}44`, background: `${m.color}18` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: m.color }} />
      Liga {m.label}
    </span>
  );
}
