import { useCallback, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

type ToastTone = "evo" | "water" | "gold" | "streak" | "neutral"

interface NxToast {
  id: number
  message: string
  tone: ToastTone
  icon?: ReactNode
  xp?: number
}

const TONE: Record<ToastTone, string> = {
  evo: "text-nx-evo",
  water: "text-nx-water",
  gold: "text-nx-gold",
  streak: "text-nx-streak",
  neutral: "text-nx-on-surface",
}

/**
 * Microfeedback do app do paciente. `push` empilha um toast que sobe acima do
 * bottom-nav e some sozinho. Renderize `node` em qualquer lugar da tela.
 * Uso: const { push, node } = useNxToasts()
 */
export function useNxToasts() {
  const [items, setItems] = useState<NxToast[]>([])
  const counter = useRef(0)

  const push = useCallback(
    (message: string, opts?: { tone?: ToastTone; icon?: ReactNode; xp?: number; duration?: number }) => {
      const id = ++counter.current
      setItems((prev) => [...prev.slice(-2), { id, message, tone: opts?.tone ?? "evo", icon: opts?.icon, xp: opts?.xp }])
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, opts?.duration ?? 2400)
    },
    [],
  )

  const node =
    items.length > 0
      ? createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-5"
            role="status"
            aria-live="polite"
          >
            {items.map((t) => (
              <div
                key={t.id}
                className="nx-toast-in flex max-w-sm items-center gap-2.5 rounded-full border border-nx-border bg-nx-container-high/95 px-4 py-2.5 shadow-nx-card backdrop-blur"
              >
                {t.icon && <span className={cn("shrink-0", TONE[t.tone])}>{t.icon}</span>}
                <span className="text-body-sm font-medium text-nx-on-surface">{t.message}</span>
                {t.xp != null && (
                  <span className={cn("shrink-0 text-body-sm font-bold tabular-nums", TONE[t.tone])}>
                    +{t.xp} XP
                  </span>
                )}
              </div>
            ))}
          </div>,
          document.body,
        )
      : null

  return { push, node }
}
