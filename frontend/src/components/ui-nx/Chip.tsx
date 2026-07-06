import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

/** Uma cor, uma função — cada tom de chip carrega um significado fixo no app. */
type Tone = "evo" | "water" | "streak" | "gold" | "danger" | "warn" | "neutral" | "brand";

interface ChipNxProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: ReactNode;
  children?: ReactNode;
}

const TONES: Record<Tone, string> = {
  evo: "bg-nx-evo/12 text-nx-evo border-nx-evo/25",
  water: "bg-nx-water/12 text-nx-water border-nx-water/25",
  streak: "bg-nx-streak/12 text-nx-streak border-nx-streak/25",
  gold: "bg-nx-gold/12 text-nx-gold border-nx-gold/25",
  danger: "bg-nx-danger/12 text-nx-danger border-nx-danger/25",
  warn: "bg-nx-warn/12 text-nx-warn border-nx-warn/25",
  brand: "bg-nx-brand/15 text-[#c9a9ff] border-nx-brand/30",
  neutral: "bg-nx-container-high text-nx-on-surface-variant border-nx-border",
};

/** Etiqueta compacta de estado/categoria. Tom = significado (verde=progresso, azul=água...). */
export function ChipNx({ tone = "neutral", icon, className, children, ...rest }: ChipNxProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-label-md font-semibold leading-none",
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
