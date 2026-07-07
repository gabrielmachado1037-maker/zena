import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { NexvelLogo } from "../../onboarding/components/NexvelLogo";
import { cn } from "../../../lib/utils";

/** Logo NEXVEL + subtítulo "NUTRITION PRO" (marca da área web da nutri). */
export function ProLogo({ size = "text-[26px]", className = "" }: { size?: string; className?: string }) {
  return (
    <div className={cn("leading-none", className)}>
      <NexvelLogo className={size} />
      <p className="mt-1 text-label-md font-semibold uppercase tracking-[0.35em] text-[#A1A1AA]">Nutrition Pro</p>
    </div>
  );
}

/** Botão primário verde da web (mesmo verde da marca; não-uppercase, cantos 12px). */
export function PrimaryBtn({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-nx-evo px-6 font-bold text-nx-on-evo",
        "shadow-nx-evo transition-all duration-150 hover:bg-nx-evo-2 hover:shadow-nx-evo-strong active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-nx-evo/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
        "disabled:opacity-50 disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Input escuro reutilizável (label + campo). */
export const INPUT_DARK =
  "nx-input w-full rounded-xl border border-white/[0.08] bg-[#0B0F0C] px-4 py-3 text-body-md text-white " +
  "placeholder:text-[#52525b] transition-colors focus:border-nx-evo/60 focus:outline-none focus:ring-2 focus:ring-nx-evo/30";

export function Input({
  label, ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">{label}</label>
      <input className={INPUT_DARK} {...rest} />
    </div>
  );
}
