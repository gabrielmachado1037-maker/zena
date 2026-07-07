import { Droplets, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const QUICK_ADD = [250, 500, 750, 1000] as const

function formatL(ml: number) {
  const l = ml / 1000
  return `${l.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}L`
}

/**
 * Água como PROGRESSO (não contador). Barra animada + botões rápidos + celebração
 * ao bater a meta. Controlado: o pai guarda `ml` e reage a `onAdd`.
 */
export function WaterProgress({
  ml,
  metaMl,
  points = 2,
  onAdd,
}: {
  ml: number
  metaMl: number
  points?: number
  onAdd: (delta: number) => void
}) {
  const pct = Math.min(100, metaMl ? (ml / metaMl) * 100 : 0)
  const done = ml >= metaMl && metaMl > 0

  return (
    <div
      className={cn(
        "rounded-nx-lg border p-4 transition-colors",
        done ? "border-nx-water/40 bg-nx-water/10" : "border-nx-border bg-nx-surface",
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-nx-md transition-colors",
            done ? "bg-nx-water/15" : "bg-nx-container-high",
          )}
        >
          {done ? (
            <Check className="nx-pop size-6 text-nx-water" strokeWidth={3} />
          ) : (
            <Droplets className="size-6 text-nx-water" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body-lg font-semibold text-nx-on-surface">Água</p>
          <p className="text-body-sm text-nx-on-surface-variant">
            {done ? "Meta batida — continue se quiser" : "Beba ao longo do dia"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-body-lg font-bold tabular-nums text-nx-on-surface">{formatL(ml)}</p>
          <p className="text-label-md uppercase text-nx-on-surface-variant">/ {formatL(metaMl)}</p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-nx-container-high">
        <div
          className="relative h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #2E7DD1, #49A8FF)",
            transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <span className="nx-water-shimmer absolute inset-0 rounded-full" />
        </div>
      </div>

      {done ? (
        <div className="nx-goal-burst mt-3 flex items-center justify-center gap-2 rounded-nx-md bg-nx-water/12 py-2.5">
          <Check className="size-4 text-nx-water" strokeWidth={3} />
          <span className="text-body-sm font-semibold text-nx-water">Meta concluída</span>
          <span className="text-body-sm font-bold tabular-nums text-nx-water">+{points} XP</span>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {QUICK_ADD.map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => onAdd(delta)}
              className="rounded-nx-md border border-nx-border bg-nx-container py-2 text-label-md font-semibold text-nx-water transition-all hover:border-nx-water/50 active:scale-95"
            >
              +{delta === 1000 ? "1L" : `${delta}ml`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
