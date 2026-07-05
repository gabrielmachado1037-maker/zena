export type League = "Bronze" | "Prata" | "Ouro" | "Platina" | "Diamante"

export const leagueStyles: Record<
  League,
  { label: string; text: string; bg: string; ring: string }
> = {
  Bronze: { label: "Bronze", text: "text-amber-700", bg: "bg-amber-700/15", ring: "ring-amber-700/30" },
  Prata: { label: "Prata", text: "text-slate-300", bg: "bg-slate-400/15", ring: "ring-slate-400/30" },
  Ouro: { label: "Ouro", text: "text-gold", bg: "bg-gold/15", ring: "ring-gold/30" },
  Platina: { label: "Platina", text: "text-cyan-300", bg: "bg-cyan-400/15", ring: "ring-cyan-400/30" },
  Diamante: { label: "Diamante", text: "text-violet-300", bg: "bg-violet-400/15", ring: "ring-violet-400/30" },
}

export const kpis = [
  { key: "pacientes", label: "Pacientes ativos", value: "1.284", delta: "+12,4%", trend: "up", icon: "Users" },
  { key: "adesao", label: "Taxa de adesão", value: "87,3%", delta: "+4,1%", trend: "up", icon: "Target" },
  { key: "retencao", label: "Retenção 90d", value: "74,8%", delta: "+2,6%", trend: "up", icon: "HeartPulse" },
  { key: "desafios", label: "Desafios ativos", value: "36", delta: "+6", trend: "up", icon: "Trophy" },
  { key: "receita", label: "Receita mensal", value: "R$ 92,4k", delta: "+9,8%", trend: "up", icon: "DollarSign" },
  { key: "risco", label: "Pacientes em risco", value: "48", delta: "-5,2%", trend: "down", icon: "AlertTriangle" },
] as const

export const leagueDistribution = [
  { league: "Bronze", patients: 430, fill: "var(--color-bronze)" },
  { league: "Prata", patients: 356, fill: "var(--color-prata)" },
  { league: "Ouro", patients: 284, fill: "var(--color-ouro)" },
  { league: "Platina", patients: 148, fill: "var(--color-platina)" },
  { league: "Diamante", patients: 66, fill: "var(--color-diamante)" },
]

export const retentionData = [
  { month: "Jan", retencao: 61, meta: 65 },
  { month: "Fev", retencao: 64, meta: 66 },
  { month: "Mar", retencao: 63, meta: 67 },
  { month: "Abr", retencao: 68, meta: 68 },
  { month: "Mai", retencao: 71, meta: 70 },
  { month: "Jun", retencao: 70, meta: 71 },
  { month: "Jul", retencao: 73, meta: 72 },
  { month: "Ago", retencao: 75, meta: 73 },
  { month: "Set", retencao: 74, meta: 74 },
  { month: "Out", retencao: 78, meta: 75 },
  { month: "Nov", retencao: 80, meta: 76 },
  { month: "Dez", retencao: 82, meta: 77 },
]

export const ranking = [
  { pos: 1, name: "Camila Ferreira", handle: "@camila.f", points: 9840, league: "Diamante" as League, streak: 64 },
  { pos: 2, name: "Rafael Monteiro", handle: "@rafa.mont", points: 9120, league: "Diamante" as League, streak: 51 },
  { pos: 3, name: "Beatriz Almeida", handle: "@bia.almeida", points: 8730, league: "Platina" as League, streak: 47 },
  { pos: 4, name: "Lucas Carvalho", handle: "@lucas.cv", points: 8210, league: "Platina" as League, streak: 39 },
  { pos: 5, name: "Mariana Rocha", handle: "@mari.rocha", points: 7690, league: "Ouro" as League, streak: 33 },
  { pos: 6, name: "Thiago Nunes", handle: "@thi.nunes", points: 7120, league: "Ouro" as League, streak: 28 },
]

export const alerts = [
  {
    level: "danger" as const,
    title: "5 pacientes sem registro há 7 dias",
    desc: "Risco alto de abandono. Recomende contato imediato.",
    time: "há 12 min",
  },
  {
    level: "warning" as const,
    title: "Meta calórica ultrapassada",
    desc: "18 pacientes acima da meta diária nesta semana.",
    time: "há 1 h",
  },
  {
    level: "success" as const,
    title: "Desafio 'Hidratação 30 dias' concluído",
    desc: "212 pacientes bateram a meta de água. Ótimo engajamento!",
    time: "há 3 h",
  },
]

export const activity = [
  { name: "Camila Ferreira", action: "concluiu o desafio", target: "Proteína+", time: "há 2 min", league: "Diamante" as League },
  { name: "Rafael Monteiro", action: "registrou refeição", target: "Almoço", time: "há 9 min", league: "Diamante" as League },
  { name: "Beatriz Almeida", action: "subiu para a liga", target: "Platina", time: "há 21 min", league: "Platina" as League },
  { name: "Lucas Carvalho", action: "enviou mensagem", target: "Dúvida sobre plano", time: "há 34 min", league: "Platina" as League },
  { name: "Mariana Rocha", action: "atingiu a meta de água", target: "2,5L", time: "há 48 min", league: "Ouro" as League },
  { name: "Thiago Nunes", action: "entrou no desafio", target: "Low Carb 21d", time: "há 1 h", league: "Ouro" as League },
]

export const categoryPerformance = [
  { name: "Proteínas", value: 88, fill: "var(--chart-1)" },
  { name: "Hidratação", value: 76, fill: "var(--chart-2)" },
  { name: "Fibras", value: 64, fill: "var(--chart-3)" },
  { name: "Sono", value: 71, fill: "var(--chart-5)" },
]

export const challenges = [
  { name: "Hidratação 30 dias", participants: 212, progress: 82, days: 6, color: "bg-chart-5" },
  { name: "Proteína+", participants: 168, progress: 64, days: 11, color: "bg-primary" },
  { name: "Low Carb 21d", participants: 143, progress: 48, days: 9, color: "bg-gold" },
  { name: "Passos 10k", participants: 197, progress: 91, days: 3, color: "bg-success" },
]

export const patientsAtRisk = [
  { name: "Pedro Alves", reason: "Sem registro há 9 dias", risk: 92, league: "Bronze" as League },
  { name: "Juliana Costa", reason: "Adesão em queda (-34%)", risk: 81, league: "Prata" as League },
  { name: "Fernando Dias", reason: "Meta não atingida 3 semanas", risk: 76, league: "Prata" as League },
  { name: "Aline Souza", reason: "Sem resposta a mensagens", risk: 68, league: "Ouro" as League },
]
