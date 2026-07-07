import { useEffect, useState } from "react"
import { ChevronLeft, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { BottomSheetNx } from "./BottomSheet"

export type ChoiceTone = "evo" | "gold" | "streak" | "danger" | "water" | "neutral"
export interface ChoiceOption {
  value: string
  title: string
  xp?: string
  tone: ChoiceTone
  icon?: LucideIcon
}
export interface ChoiceDetail {
  motivo?: string
}

const TONE_STYLE: Record<ChoiceTone, { border: string; bg: string; text: string }> = {
  evo: { border: "border-nx-evo/50", bg: "hover:bg-nx-evo/10", text: "text-nx-evo" },
  gold: { border: "border-nx-gold/50", bg: "hover:bg-nx-gold/10", text: "text-nx-gold" },
  streak: { border: "border-nx-streak/50", bg: "hover:bg-nx-streak/10", text: "text-nx-streak" },
  danger: { border: "border-nx-danger/50", bg: "hover:bg-nx-danger/10", text: "text-nx-danger" },
  water: { border: "border-nx-water/50", bg: "hover:bg-nx-water/10", text: "text-nx-water" },
  neutral: { border: "border-nx-border", bg: "hover:bg-nx-surface-hover", text: "text-nx-on-surface-variant" },
}

/**
 * Bottom sheet de escolha única (Sono, Treino…). Opções com XP + cor.
 * Se `reasonsFor` casar com a opção escolhida, abre um segundo passo de motivos.
 */
export function ChoiceSheet({
  open,
  title,
  subtitle,
  options,
  reasonsFor,
  reasons,
  reasonsTitle,
  onClose,
  onSave,
}: {
  open: boolean
  title: string
  subtitle?: string
  options: ChoiceOption[]
  reasonsFor?: string
  reasons?: string[]
  reasonsTitle?: string
  onClose: () => void
  onSave: (value: string, detail: ChoiceDetail) => void
}) {
  const [fase, setFase] = useState<"escolha" | "motivo">("escolha")
  const [motivo, setMotivo] = useState<string | null>(null)
  const [outro, setOutro] = useState("")

  useEffect(() => {
    if (open) {
      setFase("escolha")
      setMotivo(null)
      setOutro("")
    }
  }, [open, title])

  function escolher(value: string) {
    if (reasonsFor && value === reasonsFor && reasons?.length) {
      setFase("motivo")
    } else {
      onSave(value, {})
      onClose()
    }
  }

  function salvarMotivo() {
    if (!motivo || !reasonsFor) return
    const texto = motivo === "Outro" ? outro.trim() || "Outro" : motivo
    onSave(reasonsFor, { motivo: texto })
    onClose()
  }

  const tituloFase = fase === "escolha" ? title : reasonsTitle ?? "Por quê?"

  return (
    <BottomSheetNx open={open} onClose={onClose} title={tituloFase} ariaLabel={tituloFase}>
      {subtitle && fase === "escolha" && (
        <p className="-mt-1 mb-3 text-body-sm text-nx-on-surface-variant">{subtitle}</p>
      )}

      {fase === "escolha" && (
        <div className="space-y-2.5 pb-2">
          {options.map((o) => {
            const s = TONE_STYLE[o.tone]
            const Icon = o.icon
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => escolher(o.value)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-nx-lg border bg-nx-container p-4 text-left transition-all active:scale-[0.98]",
                  s.border,
                  s.bg,
                )}
              >
                {Icon && <Icon className={cn("size-6 shrink-0", s.text)} strokeWidth={2.2} />}
                <span className="flex-1 text-body-lg font-semibold text-nx-on-surface">{o.title}</span>
                {o.xp && <span className={cn("shrink-0 text-body-md font-bold tabular-nums", s.text)}>{o.xp}</span>}
              </button>
            )
          })}
        </div>
      )}

      {fase === "motivo" && (
        <div className="space-y-3 pb-2">
          <div className="grid grid-cols-2 gap-2">
            {reasons!.map((m) => {
              const on = motivo === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(m)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-nx-md border py-3 text-body-md font-medium transition-all active:scale-95",
                    on
                      ? "border-nx-danger/50 bg-nx-danger/12 text-nx-danger"
                      : "border-nx-border bg-nx-container text-nx-on-surface hover:border-nx-outline",
                  )}
                >
                  {m}
                </button>
              )
            })}
          </div>
          {motivo === "Outro" && (
            <input
              autoFocus
              value={outro}
              onChange={(e) => setOutro(e.target.value)}
              placeholder="Conte o motivo"
              className="w-full rounded-nx-md border border-nx-border bg-nx-container p-3 text-body-md text-nx-on-surface placeholder:text-nx-on-surface-variant focus:border-nx-danger focus:outline-none"
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFase("escolha")}
              className="flex items-center gap-1 rounded-nx-md border border-nx-border bg-nx-container px-4 py-3 text-body-md font-semibold text-nx-on-surface-variant active:scale-95"
            >
              <ChevronLeft className="size-4" /> Voltar
            </button>
            <button
              type="button"
              onClick={salvarMotivo}
              disabled={!motivo || (motivo === "Outro" && !outro.trim())}
              className="flex-1 rounded-nx-md bg-nx-container-high py-3 text-body-md font-semibold text-nx-on-surface transition-all active:scale-[0.98] disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </div>
      )}
    </BottomSheetNx>
  )
}
