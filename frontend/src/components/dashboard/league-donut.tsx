
import { Pie, PieChart, Label } from "recharts"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { leagueDistribution } from "@/lib/dashboard-data"

const chartConfig = {
  patients: { label: "Pacientes" },
  bronze: { label: "Bronze", color: "oklch(0.6 0.12 60)" },
  prata: { label: "Prata", color: "oklch(0.75 0.02 250)" },
  ouro: { label: "Ouro", color: "var(--gold)" },
  platina: { label: "Platina", color: "oklch(0.78 0.11 200)" },
  diamante: { label: "Diamante", color: "var(--primary)" },
}

const total = leagueDistribution.reduce((s, d) => s + d.patients, 0)

export function LeagueDonut() {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Distribuição por liga</CardTitle>
        <CardDescription>Pacientes ativos por nível</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[220px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={leagueDistribution} dataKey="patients" nameKey="league" innerRadius={62} strokeWidth={4}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                          {total.toLocaleString("pt-BR")}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground text-xs">
                          Pacientes
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
          {leagueDistribution.map((d) => (
            <div key={d.league} className="flex items-center gap-2 text-xs">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: d.fill }} />
              <span className="text-muted-foreground">{d.league}</span>
              <span className="ml-auto font-medium text-foreground">{d.patients}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
