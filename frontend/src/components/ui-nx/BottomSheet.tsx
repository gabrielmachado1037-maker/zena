import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

/**
 * BottomSheetNx — folha inferior nativa do app do paciente.
 * Backdrop (tap-out), ESC, arraste-pra-baixo, trava de scroll do body e foco preso.
 * Respeita prefers-reduced-motion (sem slide, sem fade).
 */
export function BottomSheetNx({
  open,
  onClose,
  title,
  ariaLabel,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  ariaLabel?: string
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<number | null>(null)

  // Escape + trava de scroll + foco ao abrir
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const t = window.setTimeout(() => panelRef.current?.focus(), 20)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener("keydown", onKey)
      window.clearTimeout(t)
    }
  }, [open, onClose])

  // Reset do arraste quando abre
  useEffect(() => {
    if (open) setDragY(0)
  }, [open])

  if (!open) return null

  function onTouchStart(e: React.TouchEvent) {
    dragStart.current = e.touches[0].clientY
  }
  function onTouchMove(e: React.TouchEvent) {
    if (dragStart.current == null) return
    const dy = e.touches[0].clientY - dragStart.current
    if (dy > 0) setDragY(dy)
  }
  function onTouchEnd() {
    if (dragY > 90) onClose()
    else setDragY(0)
    dragStart.current = null
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div
        className="nx-backdrop-in absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        tabIndex={-1}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        className={cn(
          "nx-sheet-in relative w-full max-w-md rounded-t-nx-xl border-t border-nx-border",
          "bg-nx-surface pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-nx-card outline-none",
        )}
      >
        {/* Alça + área de arraste */}
        <div
          className="flex cursor-grab touch-none justify-center pb-1 pt-3 active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <span className="h-1.5 w-11 rounded-full bg-nx-container-high" />
        </div>
        {title && (
          <h2 className="px-5 pb-1 pt-1 text-headline-md text-nx-on-surface">{title}</h2>
        )}
        <div className="px-5 pt-2">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
