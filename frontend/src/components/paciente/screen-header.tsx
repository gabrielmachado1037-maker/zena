
import { ChevronLeft } from "lucide-react"

export function ScreenHeader({
  title,
  onBack,
}: {
  title: string
  onBack: () => void
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
      <button
        type="button"
        onClick={onBack}
        aria-label="Voltar"
        className="flex size-9 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-muted"
      >
        <ChevronLeft className="size-5" />
      </button>
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
    </header>
  )
}
