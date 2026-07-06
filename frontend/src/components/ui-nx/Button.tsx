import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type Variant = "evo" | "surface" | "ghost" | "danger" | "brand";
type Size = "sm" | "md" | "lg";

interface ButtonNxProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/**
 * Botão base do Nexvel DS.
 * - `evo` (padrão): ação de progresso — verde sólido, texto escuro, brilho verde. É o CTA dominante.
 * - `surface`: ação secundária em superfície elevada.
 * - `ghost`: ação terciária, sem preenchimento.
 * - `danger`: ação destrutiva/risco.
 * - `brand`: identidade institucional (raro — logo/Liga Mestre).
 */
const VARIANTS: Record<Variant, string> = {
  evo: "bg-nx-evo text-nx-on-evo font-semibold hover:bg-nx-evo-2 active:scale-[0.98] shadow-nx-evo hover:shadow-nx-evo-strong",
  surface:
    "bg-nx-container-high text-nx-on-surface font-medium border border-nx-border hover:bg-nx-elevated active:scale-[0.98]",
  ghost:
    "bg-transparent text-nx-on-surface-variant font-medium hover:bg-nx-surface-hover hover:text-nx-on-surface active:scale-[0.98]",
  danger:
    "bg-nx-danger/15 text-nx-danger font-semibold border border-nx-danger/30 hover:bg-nx-danger/25 active:scale-[0.98]",
  brand:
    "bg-nx-brand text-white font-semibold hover:brightness-110 active:scale-[0.98] shadow-nx-glow",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-body-sm gap-1.5 rounded-nx-sm",
  md: "h-11 px-5 text-body-md gap-2 rounded-nx-md",
  lg: "h-14 px-6 text-body-lg gap-2.5 rounded-nx-lg",
};

export const ButtonNx = forwardRef<HTMLButtonElement, ButtonNxProps>(function ButtonNx(
  { variant = "evo", size = "md", block, leftIcon, rightIcon, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-nx-evo/60 focus-visible:ring-offset-2 focus-visible:ring-offset-nx-bg",
        "disabled:opacity-40 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
});
