import { useEffect, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { BottomSheetNx } from "./BottomSheet"
import { calcularXpSonoMeta } from "@/lib/ligas"

const MIN_H = 3
const MAX_H = 14
const STEP = 0.5
const snap = (h: number) => Math.round(h * 2) / 2
const fmtH = (h: number) => (Number.isInteger(h) ? `${h}h` : `${Math.floor(h)}h30`)

/**
 * Registro de sono — o paciente informa quanto dormiu (stepper de 0,5h).
 * O XP (0–2) é calculado por tolerância vs a meta definida pela nutri.
 */
export function SleepSheet({
  open,
  metaHoras,
  valorInicial,
  onClose,
  onSave,
}: {
  open: boolean
  metaHoras: number
  valorInicial: number | null
  onClose: () => void
  onSave: (horas: number) => void
}) {
  const [horas, setHoras] = useState<number>(valorInicial ?? metaHoras)
  useEffect(() => {
    if (open) setHoras(valorInicial ?? metaHoras)
  }, [open, valorInicial, metaHoras])

  const xp = calcularXpSonoMeta(horas, metaHoras)

  return (
    <BottomSheetNx open={open} onClose={onClose} title="Quanto você dormiu?" ariaLabel="Registro de sono">
      <div className="space-y-5 pb-2">
        <p className="text-center text-body-sm text-nx-on-surface-variant">
          Meta da sua nutri: <span className="font-semibold text-nx-on-surface">{metaHoras}h</span>
        </p>

        <div className="flex items-center justify-center gap-6">
          <button type="button" aria-label="Menos meia hora"
            onClick={() => setHoras((h) => snap(Math.max(MIN_H, h - STEP)))}
            className="grid size-12 place-items-center rounded-full border border-nx-border bg-nx-container text-nx-on-surface transition-all active:scale-95">
            <Minus className="size-5" />
          </button>
          <span className="w-28 text-center text-display-lg leading-none tabular-nums text-nx-on-surface">{fmtH(horas)}</span>
          <button type="button" aria-label="Mais meia hora"
            onClick={() => setHoras((h) => snap(Math.min(MAX_H, h + STEP)))}
            className="grid size-12 place-items-center rounded-full border border-nx-border bg-nx-container text-nx-on-surface transition-all active:scale-95">
            <Plus className="size-5" />
          </button>
        </div>

        <p className="text-center text-body-md font-bold tabular-nums" style={{ color: xp > 0 ? "#7CFF5B" : "#A1A1AA" }}>
          {xp > 0 ? `+${xp} XP` : "0 XP"}
        </p>

        <button type="button" onClick={() => { onSave(horas); onClose() }}
          className="w-full rounded-nx-md bg-nx-evo py-3 text-body-md font-semibold text-nx-on-evo transition-all active:scale-[0.98]">
          Salvar sono
        </button>
      </div>
    </BottomSheetNx>
  )
}
