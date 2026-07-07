import { cn } from "@/lib/utils"

/** Ordem do pior → melhor NÃO; segue o brief: 😄 😀 😐 😕 😞 (ótimo → péssimo). */
export const MOODS = [
  { key: "otimo", emoji: "😄", label: "Ótimo" },
  { key: "bom", emoji: "😀", label: "Bom" },
  { key: "neutro", emoji: "😐", label: "Neutro" },
  { key: "dificil", emoji: "😕", label: "Difícil" },
  { key: "pessimo", emoji: "😞", label: "Péssimo" },
] as const

/**
 * Humor num toque. `value` é a chave do humor selecionado; `onSelect` grava na hora.
 */
export function MoodPicker({
  value,
  onSelect,
  disabled,
}: {
  value?: string | null
  onSelect: (key: string) => void
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {MOODS.map((m) => {
        const on = value === m.key
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onSelect(m.key)}
            disabled={disabled}
            aria-pressed={on}
            aria-label={m.label}
            className={cn(
              "flex flex-col items-center gap-1 rounded-nx-md border py-2.5 transition-all active:scale-95 disabled:opacity-60",
              on
                ? "border-nx-evo/50 bg-nx-evo/12"
                : "border-nx-border bg-nx-container hover:border-nx-outline",
            )}
          >
            <span className={cn("text-2xl leading-none transition-transform", on && "nx-pop")}>{m.emoji}</span>
            <span
              className={cn(
                "text-label-sm font-semibold",
                on ? "text-nx-evo" : "text-nx-on-surface-variant",
              )}
            >
              {m.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
