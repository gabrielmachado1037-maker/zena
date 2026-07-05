
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { retentionData } from "@/lib/dashboard-data"

const chartConfig = {
  retencao: { label: "Retenção", color: "var(--chart-1)" },
  meta: { label: "Meta", color: "var(--chart-2)" },
}

export function RetentionArea() {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Retenção de pacientes</CardTitle>
            <CardDescription>Percentual retido vs. meta (12 meses)</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2.5 rounded-sm bg-chart-1" /> Retenção
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2.5 rounded-sm bg-chart-2" /> Meta
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <AreaChart data={retentionData} margin={{ left: -8, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="fillRetencao" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-retencao)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="var(--color-retencao)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillMeta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-meta)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-meta)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[50, 90]}
              tickFormatter={(v) => `${v}%`}
              className="text-xs"
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey="meta"
              type="monotone"
              fill="url(#fillMeta)"
              stroke="var(--color-meta)"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            <Area dataKey="retencao" type="monotone" fill="url(#fillRetencao)" stroke="var(--color-retencao)" strokeWidth={2.5} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
