import { useEffect, useState } from "react"
import { CircleCheck, Replace, CircleSlash, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { BottomSheetNx } from "./BottomSheet"

export type MealStatus = "seguiu" | "adaptou" | "pulou"
export interface MealDetail {
  nota?: string
  motivo?: string
}

const MOTIVOS_PULO = ["Falta de tempo", "Não senti fome", "Esqueci", "Outro"] as const

const OPCOES = [
  { status: "seguiu" as const, icon: CircleCheck, titulo: "Segui conforme o plano", xp: "+1 XP", tone: "evo" },
  { status: "adaptou" as const, icon: Replace, titulo: "Fiz adaptações", xp: "+0,5 XP", tone: "gold" },
  { status: "pulou" as const, icon: CircleSlash, titulo: "Pulei essa refeição", xp: "0 XP", tone: "danger" },
]

const TONE_STYLE: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  evo: { border: "border-nx-evo/50", bg: "hover:bg-nx-evo/10", text: "text-nx-evo", icon: "text-nx-evo" },
  gold: { border: "border-nx-gold/50", bg: "hover:bg-nx-gold/10", text: "text-nx-gold", icon: "text-nx-gold" },
  danger: { border: "border-nx-danger/50", bg: "hover:bg-nx-danger/10", text: "text-nx-danger", icon: "text-nx-danger" },
}

/**
 * Fluxo de registro de uma refeição em bottom sheet:
 * Seguiu → salva na hora · Adaptou → "o que mudou?" (obrigatório) · Pulei → motivo.
 */
export function MealSheet({
  open,
  meal,
  onClose,
  onSave,
}: {
  open: boolean
  meal: { key: string; label: string } | null
  onClose: () => void
  onSave: (status: MealStatus, detail: MealDetail) => void
}) {
  const [fase, setFase] = useState<"escolha" | "adaptou" | "pulou">("escolha")
  const [nota, setNota] = useState("")
  const [motivo, setMotivo] = useState<string | null>(null)
  const [outro, setOutro] = useState("")

  // Reinicia ao (re)abrir para uma refeição
  useEffect(() => {
    if (open) {
      setFase("escolha")
      setNota("")
      setMotivo(null)
      setOutro("")
    }
  }, [open, meal?.key])

  function escolher(status: MealStatus) {
    if (status === "seguiu") {
      onSave("seguiu", {})
      onClose()
    } else if (status === "adaptou") {
      setFase("adaptou")
    } else {
      setFase("pulou")
    }
  }

  function salvarAdaptou() {
    if (!nota.trim()) return
    onSave("adaptou", { nota: nota.trim() })
    onClose()
  }

  function salvarPulou() {
    if (!motivo) return
    const texto = motivo === "Outro" ? outro.trim() || "Outro" : motivo
    onSave("pulou", { motivo: texto })
    onClose()
  }

  const titulo =
    fase === "escolha"
      ? "Como foi sua refeição?"
      : fase === "adaptou"
        ? "O que mudou na refeição?"
        : "Por que você pulou?"

  return (
    <BottomSheetNx open={open} onClose={onClose} title={titulo} ariaLabel={`${meal?.label ?? "Refeição"} — ${titulo}`}>
      {meal && (
        <p className="-mt-1 mb-3 text-body-sm text-nx-on-surface-variant">{meal.label}</p>
      )}

      {fase === "escolha" && (
        <div className="space-y-2.5 pb-2">
          {OPCOES.map((o) => {
            const s = TONE_STYLE[o.tone]
            return (
              <button
                key={o.status}
                type="button"
                onClick={() => escolher(o.status)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-nx-lg border bg-nx-container p-4 text-left transition-all active:scale-[0.98]",
                  s.border,
                  s.bg,
                )}
              >
                <o.icon className={cn("size-6 shrink-0", s.icon)} strokeWidth={2.2} />
                <span className="flex-1 text-body-lg font-semibold text-nx-on-surface">{o.titulo}</span>
                <span className={cn("shrink-0 text-body-md font-bold tabular-nums", s.text)}>{o.xp}</span>
              </button>
            )
          })}
        </div>
      )}

      {fase === "adaptou" && (
        <div className="space-y-3 pb-2">
          <textarea
            autoFocus
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder="Ex.: comi pão no lugar da tapioca · almocei fora · substituí alimentos"
            className="w-full resize-none rounded-nx-md border border-nx-border bg-nx-container p-3 text-body-md text-nx-on-surface placeholder:text-nx-on-surface-variant focus:border-nx-gold focus:outline-none"
          />
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
              onClick={salvarAdaptou}
              disabled={!nota.trim()}
              className="flex-1 rounded-nx-md bg-nx-gold py-3 text-body-md font-semibold text-nx-on-evo transition-all active:scale-[0.98] disabled:opacity-40"
            >
              Salvar refeição
            </button>
          </div>
        </div>
      )}

      {fase === "pulou" && (
        <div className="space-y-3 pb-2">
          <div className="grid grid-cols-2 gap-2">
            {MOTIVOS_PULO.map((m) => {
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
              onClick={salvarPulou}
              disabled={!motivo || (motivo === "Outro" && !outro.trim())}
              className="flex-1 rounded-nx-md bg-nx-container-high py-3 text-body-md font-semibold text-nx-on-surface transition-all active:scale-[0.98] disabled:opacity-40"
            >
              Salvar refeição
            </button>
          </div>
        </div>
      )}
    </BottomSheetNx>
  )
}
