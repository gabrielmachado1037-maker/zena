import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface CardNxProps extends HTMLAttributes<HTMLDivElement> {
  /** Realce em foco/celebração: anel + brilho verde de evolução. */
  glow?: boolean;
  /** Cor da borda funcional (ex.: "water", "streak", "gold"). Padrão: borda neutra. */
  accent?: "evo" | "water" | "streak" | "gold" | "danger" | "none";
  children?: ReactNode;
}

const ACCENT_BORDER: Record<NonNullable<CardNxProps["accent"]>, string> = {
  none: "border-nx-border",
  evo: "border-nx-evo/30",
  water: "border-nx-water/30",
  streak: "border-nx-streak/30",
  gold: "border-nx-gold/30",
  danger: "border-nx-danger/30",
};

/** Superfície-base do Nexvel DS: container elevado, cantos generosos, borda sutil. */
export function CardNx({ glow, accent = "none", className, children, ...rest }: CardNxProps) {
  return (
    <div
      className={cn(
        "rounded-nx-lg bg-nx-surface border p-5 shadow-nx-card",
        ACCENT_BORDER[accent],
        glow && "shadow-nx-evo border-nx-evo/40",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardNxHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between gap-3 mb-4", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardNxTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-headline-md text-nx-on-surface", className)} {...rest}>
      {children}
    </h3>
  );
}
