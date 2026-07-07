import { useEffect, useState } from "react"
import { CircleCheck, Leaf, Meh, CircleSlash, ChevronLeft, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { BottomSheetNx } from "./BottomSheet"

export type MealStatus = "seguiu" | "adaptou" | "comeu_mal" | "pulou"
export interface MealDetail {
  nota?: string
  motivo?: string
}

interface Opcao {
  status: MealStatus
  titulo: string
  xp: string
  color: string
  icon: LucideIcon
  flow: "salvar" | "texto" | "motivos"
  campoTitulo?: string
  placeholder?: string
}

/* Verde = ganhou XP · amarelo/vermelho = zero. Tons distintos dentro de cada grupo. */
const OPCOES: Opcao[] = [
  { status: "seguiu", titulo: "Segui o plano", xp: "+1 XP", color: "#22C55E", icon: CircleCheck, flow: "salvar" },
  {
    status: "adaptou", titulo: "Adaptei de forma saudável", xp: "+0,75 XP", color: "#84CC16", icon: Leaf, flow: "texto",
    campoTitulo: "O que você mudou na refeição? (opcional)",
    placeholder: "Ex.: comi ovo no lugar da tapioca · almocei fora, mas escolhi um prato equilibrado · substituí o peixe por frango grelhado",
  },
  {
    status: "comeu_mal", titulo: "Comi mal", xp: "0 XP", color: "#F59E0B", icon: Meh, flow: "texto",
    campoTitulo: "O que você comeu? (opcional)",
    placeholder: "Ex.: comi fast food · exagerei na sobremesa · beliscei besteira o dia todo",
  },
  { status: "pulou", titulo: "Pulei a refeição", xp: "0 XP", color: "#EF4444", icon: CircleSlash, flow: "motivos" },
]

const MOTIVOS_PULO = ["Falta de tempo", "Não senti fome", "Esqueci", "Outro"] as const

/**
 * Registro de uma refeição em bottom sheet — 4 estados:
 * Segui (salva na hora) · Adaptei (texto opcional) · Comi mal (texto opcional, sem punição) ·
 * Pulei (motivos). Nenhum campo é obrigatório: dá pra salvar rápido sempre.
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
  const [ativo, setAtivo] = useState<Opcao | null>(null) // opção em fluxo de detalhe (texto/motivos)
  const [nota, setNota] = useState("")
  const [motivo, setMotivo] = useState<string | null>(null)
  const [outro, setOutro] = useState("")

  useEffect(() => {
    if (open) {
      setAtivo(null)
      setNota("")
      setMotivo(null)
      setOutro("")
    }
  }, [open, meal?.key])

  function escolher(o: Opcao) {
    if (o.flow === "salvar") {
      onSave(o.status, {})
      onClose()
    } else {
      setAtivo(o)
    }
  }

  function salvarTexto() {
    if (!ativo) return
    const n = nota.trim()
    onSave(ativo.status, n ? { nota: n } : {})
    onClose()
  }

  function salvarPulou() {
    if (!motivo) return
    const texto = motivo === "Outro" ? outro.trim() || "Outro" : motivo
    onSave("pulou", { motivo: texto })
    onClose()
  }

  const titulo =
    !ativo ? "Como foi sua refeição?"
    : ativo.flow === "texto" ? ativo.campoTitulo!
    : "Por que você pulou?"

  return (
    <BottomSheetNx open={open} onClose={onClose} title={titulo} ariaLabel={`${meal?.label ?? "Refeição"} — ${titulo}`}>
      {meal && !ativo && <p className="-mt-1 mb-3 text-body-sm text-nx-on-surface-variant">{meal.label}</p>}

      {/* Escolha das 4 opções */}
      {!ativo && (
        <div className="space-y-2.5 pb-2">
          {OPCOES.map((o) => (
            <button
              key={o.status}
              type="button"
              onClick={() => escolher(o)}
              style={{ borderColor: `${o.color}80`, backgroundColor: `${o.color}14` }}
              className="flex w-full items-center gap-3 rounded-nx-lg border p-4 text-left transition-all active:scale-[0.98]"
            >
              <o.icon className="size-6 shrink-0" strokeWidth={2.2} style={{ color: o.color }} />
              <span className="flex-1 text-body-lg font-semibold text-nx-on-surface">{o.titulo}</span>
              <span className="shrink-0 text-body-md font-bold tabular-nums" style={{ color: o.color }}>{o.xp}</span>
            </button>
          ))}
        </div>
      )}

      {/* Campo de texto opcional (Adaptei / Comi mal) */}
      {ativo && ativo.flow === "texto" && (
        <div className="space-y-3 pb-2">
          <textarea
            autoFocus
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder={ativo.placeholder}
            style={{ outlineColor: ativo.color }}
            className="w-full resize-none rounded-nx-md border border-nx-border bg-nx-container p-3 text-body-md text-nx-on-surface placeholder:text-nx-on-surface-variant focus:outline focus:outline-2 focus:outline-offset-0"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAtivo(null)}
              className="flex items-center gap-1 rounded-nx-md border border-nx-border bg-nx-container px-4 py-3 text-body-md font-semibold text-nx-on-surface-variant active:scale-95"
            >
              <ChevronLeft className="size-4" /> Voltar
            </button>
            <button
              type="button"
              onClick={salvarTexto}
              style={{ backgroundColor: ativo.color }}
              className="flex-1 rounded-nx-md py-3 text-body-md font-semibold text-[#0A0A0A] transition-all active:scale-[0.98]"
            >
              Salvar refeição
            </button>
          </div>
        </div>
      )}

      {/* Motivos (Pulei) */}
      {ativo && ativo.flow === "motivos" && (
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
              placeholder="Conte o motivo (opcional)"
              className="w-full rounded-nx-md border border-nx-border bg-nx-container p-3 text-body-md text-nx-on-surface placeholder:text-nx-on-surface-variant focus:border-nx-danger focus:outline-none"
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAtivo(null)}
              className="flex items-center gap-1 rounded-nx-md border border-nx-border bg-nx-container px-4 py-3 text-body-md font-semibold text-nx-on-surface-variant active:scale-95"
            >
              <ChevronLeft className="size-4" /> Voltar
            </button>
            <button
              type="button"
              onClick={salvarPulou}
              disabled={!motivo}
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
