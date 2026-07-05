
import { useState } from "react"
import {
  Plus,
  ArrowDown,
  Minus,
  Camera,
  Ruler,
  Scale,
  Smile,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { moods } from "@/lib/nexvel-data"
import { usePacienteData } from "@/lib/paciente-data"
import { ScreenHeader } from "../screen-header"
import type { NavigateFn } from "../types"

function AddButton({ label }: { label: string }) {
  return (
    <Button className="mt-4 h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
      <Plus className="size-4" />
      {label}
    </Button>
  )
}

function InfoCard({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Camera
  title: string
  subtitle: string
}) {
  return (
    <Card className="flex flex-row items-center gap-3 border-primary/25 bg-primary/10 p-4">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/20 ring-1 ring-primary/30">
        <Icon className="size-5 text-primary" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </Card>
  )
}

export function EvolucaoScreen({ onNavigate }: { onNavigate: NavigateFn }) {
  const {
    photoEntries, measures, weightData, weightHistory, moodHistory, pesoAtual, pesoDelta,
  } = usePacienteData()
  const [mood, setMood] = useState(3)

  return (
    <div className="pb-4">
      <ScreenHeader title="Evolução" onBack={() => onNavigate("registro")} />

      <div className="px-4 pt-4">
        <Tabs defaultValue="fotos">
          <TabsList className="grid w-full grid-cols-4 rounded-xl bg-secondary">
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="peso">Peso</TabsTrigger>
            <TabsTrigger value="medidas">Medidas</TabsTrigger>
            <TabsTrigger value="humor">Humor</TabsTrigger>
          </TabsList>

          {/* FOTOS */}
          <TabsContent value="fotos" className="mt-4 space-y-4">
            <InfoCard
              icon={Camera}
              title="Sua evolução"
              subtitle="Compare seu progresso ao longo do tempo"
            />
            {photoEntries.map((entry) => (
              <div key={entry.date} className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {entry.date}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { src: entry.front, label: "Frente" },
                    { src: entry.side, label: "Lado" },
                  ].map((p) => (
                    <Card key={p.label} className="overflow-hidden p-0">
                      <div className="relative aspect-[3/4]">
                        <img
                          src={p.src || "/placeholder.svg"}
                          alt={`Foto ${p.label} — ${entry.date}`}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur">
                          {p.label}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
            <AddButton label="Adicionar novas fotos" />
          </TabsContent>

          {/* PESO */}
          <TabsContent value="peso" className="mt-4 space-y-4">
            <Card className="p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Peso atual</p>
                  <p className="text-3xl font-bold">{pesoAtual}</p>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-green/15 px-3 py-1 text-green">
                  <ArrowDown className="size-4" />
                  <span className="text-sm font-semibold">
                    {pesoDelta}
                  </span>
                </div>
              </div>
              <div className="mt-4 h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weightData}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={["dataMin - 1", "dataMax + 1"]}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#13131f",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        color: "#fff",
                      }}
                      labelStyle={{ color: "#94a3b8" }}
                      formatter={(v) => [`${v} kg`, "Peso"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="peso"
                      stroke="#7c3aed"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#7c3aed" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div>
              <p className="mb-2 text-sm font-semibold text-muted-foreground">
                Histórico
              </p>
              <Card className="divide-y divide-border p-0">
                {weightHistory.map((h) => (
                  <div
                    key={h.date}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-sm text-muted-foreground">
                      {h.date}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{h.value}</span>
                      <span className="text-xs font-medium text-green">
                        {h.delta}
                      </span>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
            <AddButton label="Registrar peso" />
          </TabsContent>

          {/* MEDIDAS */}
          <TabsContent value="medidas" className="mt-4 space-y-4">
            <InfoCard
              icon={Ruler}
              title="Medições corporais"
              subtitle="Acompanhe suas medidas em cm"
            />
            <Card className="grid grid-cols-2 gap-px overflow-hidden bg-border p-0">
              {measures.map((m) => (
                <div key={m.label} className="bg-card p-4">
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-lg font-bold">{m.value}</span>
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-xs font-semibold",
                        m.delta < 0 ? "text-green" : "text-muted-foreground",
                      )}
                    >
                      {m.delta < 0 ? (
                        <ArrowDown className="size-3" />
                      ) : (
                        <Minus className="size-3" />
                      )}
                      {m.delta === 0 ? "0 cm" : `${m.delta} cm`}
                    </span>
                  </div>
                </div>
              ))}
            </Card>
            <AddButton label="Adicionar medidas" />
          </TabsContent>

          {/* HUMOR */}
          <TabsContent value="humor" className="mt-4 space-y-4">
            <Card className="border-primary/25 bg-primary/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/20 ring-1 ring-primary/30">
                  <Smile className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Como você se sente?</p>
                  <p className="text-sm text-muted-foreground">
                    Hoje, {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                {moods.map((m, i) => {
                  const selected = i === mood
                  return (
                    <button
                      key={m.emoji}
                      type="button"
                      onClick={() => setMood(i)}
                      aria-label={m.label}
                      aria-pressed={selected}
                      className={cn(
                        "flex size-12 items-center justify-center rounded-2xl text-2xl transition",
                        selected
                          ? "bg-gold/20 ring-2 ring-gold"
                          : "bg-secondary opacity-70 hover:opacity-100",
                      )}
                    >
                      <span aria-hidden>{m.emoji}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-center text-sm font-semibold text-gold">
                {moods[mood].label} <span aria-hidden>{moods[mood].emoji}</span>
              </p>

              <textarea
                rows={3}
                placeholder="Anotações (opcional)"
                className="mt-4 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </Card>

            <div>
              <p className="mb-2 text-sm font-semibold text-muted-foreground">
                Histórico
              </p>
              <Card className="divide-y divide-border p-0">
                {moodHistory.map((h) => (
                  <div
                    key={h.date}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-sm text-muted-foreground">
                      {h.date}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg" aria-hidden>
                        {h.emoji}
                      </span>
                      <span className="text-sm font-medium">{h.label}</span>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
