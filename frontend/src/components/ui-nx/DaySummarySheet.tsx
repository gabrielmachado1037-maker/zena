import { Utensils, Dumbbell, Droplets, Moon, Smile, Flame, Trophy, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { BottomSheetNx } from "./BottomSheet"

interface Row {
  icon: LucideIcon
  label: string
  value: string
  tone?: "evo" | "water" | "streak" | "gold" | "sleep" | "muted"
}

const TONE: Record<string, string> = {
  evo: "text-nx-evo",
  water: "text-nx-water",
  streak: "text-nx-streak",
  gold: "text-nx-gold",
  sleep: "text-nx-sleep",
  muted: "text-nx-on-surface-variant",
}

/**
 * Resumo do dia (Final do dia): recapitula tudo antes de fechar, então confirma.
 */
export function DaySummarySheet({
  open,
  onClose,
  onConfirm,
  enviando,
  xp,
  missoesConcluidas,
  missoesTotal,
  alimentacao,
  treino,
  agua,
  sono,
  humor,
  streak,
  liga,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  enviando: boolean
  xp: number
  missoesConcluidas: number
  missoesTotal: number
  alimentacao: string
  treino: string
  agua: string
  sono: string
  humor: string
  streak: number
  liga: string
}) {
  const rows: Row[] = [
    { icon: Utensils, label: "Alimentação", value: alimentacao, tone: "evo" },
    { icon: Dumbbell, label: "Treino", value: treino, tone: "streak" },
    { icon: Droplets, label: "Água", value: agua, tone: "water" },
    { icon: Moon, label: "Sono", value: sono, tone: "sleep" },
    { icon: Smile, label: "Humor", value: humor, tone: "gold" },
    { icon: Trophy, label: "Liga", value: liga, tone: "gold" },
  ]

  return (
    <BottomSheetNx open={open} onClose={onClose} title="Resumo do seu dia" ariaLabel="Resumo do dia">
      <div className="pb-2">
        {/* XP hero */}
        <div className="mb-4 flex flex-col items-center rounded-nx-lg border border-nx-evo/30 bg-nx-evo/[0.07] py-5">
          <span className="text-label-md uppercase text-nx-on-surface-variant">Você vai ganhar</span>
          <span className="mt-1 flex items-baseline gap-1 text-nx-evo">
            <span className="text-display-lg leading-none tabular-nums">+{xp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span>
            <span className="text-body-lg font-bold">XP</span>
          </span>
          <div className="mt-2 flex items-center gap-3 text-body-sm">
            <span className="flex items-center gap-1 text-nx-on-surface-variant">
              <span className="font-semibold text-nx-on-surface tabular-nums">{missoesConcluidas}/{missoesTotal}</span> missões
            </span>
            <span className="flex items-center gap-1 text-nx-streak">
              <Flame className="size-4" />
              <span className="font-semibold tabular-nums">{streak + 1}</span>
            </span>
          </div>
        </div>

        {/* Recap */}
        <div className="divide-y divide-nx-border rounded-nx-lg border border-nx-border">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 px-4 py-3">
              <r.icon className={cn("size-5 shrink-0", TONE[r.tone ?? "muted"])} />
              <span className="flex-1 text-body-md text-nx-on-surface-variant">{r.label}</span>
              <span className="text-body-md font-semibold text-nx-on-surface">{r.value}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={enviando}
          className={cn(
            "mt-4 flex w-full items-center justify-center gap-2 rounded-nx-lg py-4 text-body-lg font-semibold transition-all",
            "bg-nx-evo text-nx-on-evo shadow-nx-evo hover:shadow-nx-evo-strong active:scale-[0.98]",
            "disabled:opacity-60 disabled:pointer-events-none",
          )}
        >
          {enviando ? "Fechando o dia…" : "Fechar o dia 🔥"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full py-2 text-body-sm font-medium text-nx-on-surface-variant"
        >
          Continuar editando
        </button>
      </div>
    </BottomSheetNx>
  )
}
