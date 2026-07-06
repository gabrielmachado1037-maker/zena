import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type Tone = "evo" | "water" | "streak" | "gold" | "neutral" | "danger";

interface StatTileNxProps {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  tone?: Tone;
  /** Variação (ex.: "+2 esta semana"). Cor herda o tom quando positivo. */
  delta?: string;
  className?: string;
}

const VALUE_TONE: Record<Tone, string> = {
  evo: "text-nx-evo",
  water: "text-nx-water",
  streak: "text-nx-streak",
  gold: "text-nx-gold",
  danger: "text-nx-danger",
  neutral: "text-nx-on-surface",
};

/** Número grande + rótulo. Tabular-nums para alinhar dígitos. Base dos KPIs. */
export function StatTileNx({ label, value, unit, icon, tone = "neutral", delta, className }: StatTileNxProps) {
  return (
    <div className={cn("rounded-nx-md bg-nx-container border border-nx-border p-4", className)}>
      <div className="flex items-center justify-between">
        <span className="text-label-md uppercase text-nx-outline">{label}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={cn("text-display-lg leading-none tabular-nums", VALUE_TONE[tone])}>{value}</span>
        {unit && <span className="text-body-sm text-nx-on-surface-variant">{unit}</span>}
      </div>
      {delta && <p className="mt-1.5 text-body-sm text-nx-on-surface-variant">{delta}</p>}
    </div>
  );
}
