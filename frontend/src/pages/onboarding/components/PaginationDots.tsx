import { cn } from "../../../lib/utils";

/** Indicador de páginas: ativo = pílula verde alongada; inativo = ponto cinza. */
export function PaginationDots({
  count,
  active,
  onDot,
  className = "",
}: {
  count: number;
  active: number;
  onDot?: (i: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)} role="tablist" aria-label="Progresso do onboarding">
      {Array.from({ length: count }).map((_, i) => {
        const on = i === active;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={`Slide ${i + 1} de ${count}`}
            onClick={() => onDot?.(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none",
              on ? "w-7 bg-nx-evo" : "w-1.5 bg-white/25 hover:bg-white/40",
            )}
          />
        );
      })}
    </div>
  );
}
