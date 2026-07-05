import { useNavigate } from "react-router-dom"
import { Search, Bell, Plus } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"

function initials(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function Topbar() {
  const navigate = useNavigate()
  const { nutricionista } = useAuth()
  const nome = nutricionista?.nome ?? "Gabriel Nutri"
  const primeiro = nome.split(" ")[0]

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Visão geral</h1>
        <p className="hidden text-xs text-muted-foreground sm:block">Bem-vindo de volta, {primeiro}</p>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar paciente, liga, desafio..."
            className="h-9 w-56 rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 lg:w-72"
            aria-label="Buscar"
          />
        </div>

        <button
          onClick={() => navigate("/app/pacientes")}
          className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Novo paciente</span>
        </button>

        <button
          className="relative flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Notificações"
        >
          <Bell className="size-[18px]" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-danger ring-2 ring-card" />
        </button>

        <Avatar className="size-9 ring-1 ring-primary/30">
          <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">
            {initials(nome)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
