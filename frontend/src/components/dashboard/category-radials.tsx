
import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { categoryPerformance } from "@/lib/dashboard-data"

export function CategoryRadials() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Desempenho por categoria</CardTitle>
        <CardDescription>Aderência média dos pacientes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {categoryPerformance.map((cat) => (
            <div key={cat.name} className="flex flex-col items-center">
              <ChartContainer
                config={{ value: { label: cat.name } }}
                className="aspect-square h-[110px] w-[110px]"
              >
                <RadialBarChart
                  data={[cat]}
                  startAngle={90}
                  endAngle={-270}
                  innerRadius={44}
                  outerRadius={58}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" background={{ fill: "var(--muted)" }} cornerRadius={8} fill={cat.fill} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-lg font-semibold">
                    {`${cat.value}%`}
                  </text>
                </RadialBarChart>
              </ChartContainer>
              <p className="-mt-1 text-xs font-medium text-muted-foreground">{cat.name}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
