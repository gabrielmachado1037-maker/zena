import type { ButtonHTMLAttributes } from "react";
import { ButtonNx } from "../../../components/ui-nx";
import { cn } from "../../../lib/utils";

/**
 * Botões do onboarding — três variações reutilizáveis:
 * - PrimaryButton: verde cheio, texto escuro (reusa o ButtonNx `evo` do DS).
 * - OutlineButton: contorno verde, fundo transparente, texto branco.
 * - TextButton: só texto verde, sem fundo.
 * Todos com feedback ao toque (scale/opacity) e alvo de toque ≥ 52px.
 */

export function PrimaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <ButtonNx
      variant="evo"
      size="lg"
      block
      className={cn("h-[54px] rounded-full text-body-md font-bold uppercase tracking-wide", className)}
      {...props}
    >
      {children}
    </ButtonNx>
  );
}

export function OutlineButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "flex h-[54px] w-full items-center justify-center rounded-full border border-nx-evo/70 bg-transparent",
        "text-body-md font-bold uppercase tracking-wide text-white transition-all duration-150",
        "hover:bg-nx-evo/10 active:scale-[0.98] active:opacity-90",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-nx-evo/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "flex h-12 w-full items-center justify-center rounded-full bg-transparent",
        "text-body-md font-bold uppercase tracking-wide text-nx-evo transition-all duration-150",
        "hover:text-nx-evo-2 active:scale-[0.98] active:opacity-80",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-nx-evo/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
