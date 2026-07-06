import { cn } from "../../lib/utils";

type Tone = "evo" | "water" | "streak" | "gold";

interface ProgressBarNxProps {
  /** 0–100. Valores fora do intervalo são fixados. */
  value: number;
  tone?: Tone;
  /** Anima um brilho atravessando a barra (ao concluir uma missão). */
  celebrate?: boolean;
  className?: string;
  "aria-label"?: string;
}

const FILL: Record<Tone, string> = {
  evo: "bg-gradient-to-r from-nx-success to-nx-evo shadow-[0_0_12px_rgba(124,255,91,0.45)]",
  water: "bg-nx-water shadow-[0_0_12px_rgba(73,168,255,0.4)]",
  streak: "bg-nx-streak shadow-[0_0_12px_rgba(255,138,31,0.4)]",
  gold: "bg-nx-gold shadow-[0_0_12px_rgba(248,200,75,0.4)]",
};

/** Barra de progresso do Nexvel DS. Verde = evolução por padrão. */
export function ProgressBarNx({
  value,
  tone = "evo",
  celebrate,
  className,
  "aria-label": ariaLabel,
}: ProgressBarNxProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn("nx-xp-track h-2 w-full", celebrate && "nx-xp-sheen", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", FILL[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
