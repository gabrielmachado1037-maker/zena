import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { ProgressBarNx } from "./ProgressBar";

interface XpBarNxProps {
  /** Nível atual do paciente. */
  nivel: number;
  /** XP acumulado dentro do nível atual. */
  xpAtual: number;
  /** XP necessário para o próximo nível. */
  xpProximo: number;
  /** Mostra "+N" subindo quando xpAtual aumenta. */
  animarGanho?: boolean;
  className?: string;
}

/** Barra de XP com contexto de nível. Núcleo do "centro de progressão". */
export function XpBarNx({ nivel, xpAtual, xpProximo, animarGanho = true, className }: XpBarNxProps) {
  const pct = xpProximo > 0 ? (xpAtual / xpProximo) * 100 : 0;
  const [ganho, setGanho] = useState<number | null>(null);
  const [prev, setPrev] = useState(xpAtual);

  useEffect(() => {
    if (!animarGanho) return;
    if (xpAtual > prev) {
      setGanho(xpAtual - prev);
      const t = setTimeout(() => setGanho(null), 1100);
      setPrev(xpAtual);
      return () => clearTimeout(t);
    }
    setPrev(xpAtual);
  }, [xpAtual, prev, animarGanho]);

  return (
    <div className={cn("relative", className)}>
      <div className="mb-2 flex items-center justify-between text-body-sm">
        <span className="inline-flex items-center gap-2 font-semibold text-nx-on-surface">
          <span className="grid size-6 place-items-center rounded-md bg-nx-evo/15 text-label-sm font-bold text-nx-evo">
            {nivel}
          </span>
          Nível {nivel}
        </span>
        <span className="tabular-nums text-nx-on-surface-variant">
          {xpAtual}<span className="text-nx-on-surface-variant"> / {xpProximo} XP</span>
        </span>
      </div>
      <ProgressBarNx value={pct} tone="evo" celebrate={ganho != null} aria-label={`Progresso do nível ${nivel}`} />
      {ganho != null && (
        <span className="nx-rise pointer-events-none absolute -top-1 right-0 text-body-sm font-bold text-nx-evo">
          +{ganho} XP
        </span>
      )}
    </div>
  );
}
