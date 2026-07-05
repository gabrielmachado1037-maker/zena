
import { CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { usePacienteData } from "@/lib/paciente-data"
import type { Challenge } from "@/lib/nexvel-data"

function ChallengeCard({ c }: { c: Challenge }) {
  const Icon = c.icon
  const done = c.status === "concluido"
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1"
          style={{
            background: `color-mix(in srgb, ${c.color} 15%, transparent)`,
            borderColor: "transparent",
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c.color} 30%, transparent)`,
          }}
        >
          <Icon className="size-5" style={{ color: c.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{c.title}</p>
          <p className="text-sm text-muted-foreground">{c.description}</p>
        </div>
        {done && <CheckCircle2 className="size-5 shrink-0 text-green" />}
      </div>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${c.progress}%`, background: c.color }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-semibold" style={{ color: c.color }}>
            {c.progress}%
          </span>
          <span className="text-muted-foreground">{c.remaining}</span>
        </div>
      </div>
    </Card>
  )
}

export function DesafiosScreen() {
  const { challenges } = usePacienteData()
  const active = challenges.filter((c) => c.status === "ativo")
  const done = challenges.filter((c) => c.status === "concluido")

  return (
    <div className="px-4 pb-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Desafios</h1>
      <Tabs defaultValue="ativos">
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-secondary">
          <TabsTrigger value="ativos">Ativos</TabsTrigger>
          <TabsTrigger value="concluidos">Concluídos</TabsTrigger>
        </TabsList>
        <TabsContent value="ativos" className="mt-4 space-y-3">
          {active.map((c) => (
            <ChallengeCard key={c.id} c={c} />
          ))}
        </TabsContent>
        <TabsContent value="concluidos" className="mt-4 space-y-3">
          {done.map((c) => (
            <ChallengeCard key={c.id} c={c} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
