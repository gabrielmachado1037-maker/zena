
import {
  LogOut,
  History,
  TrendingUp,
  Settings,
  HelpCircle,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePacienteData } from "@/lib/paciente-data"
import { usePacienteAuth } from "@/contexts/PacienteAuthContext"
import type { NavigateFn, Screen } from "../types"

export function PerfilScreen({ onNavigate }: { onNavigate: NavigateFn }) {
  const { user, stats } = usePacienteData()
  const { logout } = usePacienteAuth()
  const menu: {
    icon: LucideIcon
    label: string
    screen?: Screen
  }[] = [
    { icon: History, label: "Histórico", screen: "progresso" },
    { icon: TrendingUp, label: "Minhas Evoluções", screen: "evolucao" },
    { icon: Settings, label: "Configurações" },
    { icon: HelpCircle, label: "Ajuda e Suporte" },
  ]

  return (
    <div className="px-4 pb-4 pt-8">
      {/* Profile header */}
      <div className="flex flex-col items-center text-center">
        <Avatar className="size-24 ring-2 ring-primary/40">
          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <h1 className="mt-3 text-xl font-bold">{user.name}</h1>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold ring-1 ring-gold/30">
          {user.league}
        </span>
      </div>

      {/* Stats */}
      <Card className="mt-6 grid grid-cols-3 divide-x divide-border p-0">
        {stats.map((s) => (
          <div key={s.label} className="px-2 py-4 text-center">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </Card>

      {/* Menu */}
      <div className="mt-6 space-y-3">
        {menu.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => item.screen && onNavigate(item.screen)}
              className="w-full text-left"
            >
              <Card className="flex flex-row items-center gap-3 p-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                  <Icon className="size-5 text-primary" />
                </div>
                <span className="flex-1 font-medium">{item.label}</span>
                <ChevronRight className="size-5 text-muted-foreground" />
              </Card>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={logout}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
      >
        <LogOut className="size-4" />
        Sair da conta
      </button>
    </div>
  )
}
