import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from "recharts";
import {
  Search, Bell, TrendingUp, CheckCircle2, ArrowUpDown, Rocket,
  AlertTriangle, Send, SlidersHorizontal, CalendarClock, Plus, ChevronDown, HeartPulse,
} from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import Avatar from "../components/Avatar";

/* ───────── shapes reais da API ───────── */
interface LigasResp {
  kpis: {
    pacientesAtivos: number; novosMes: number; retencao30: number;
    checkinsHoje: number; pctCheckins: number; emRisco: number; indiceSaude: number;
    ligaClinica: { liga: string; nivel: string; cor: string; icone: string };
  };
  distribuicaoLigas: { liga: string; count: number; cor: string }[];
  retencaoMensal: { label: string; pct: number }[];
  topRanking: { pos: number; nome: string; pontos: number; liga: string; ligaNivel: string; streak: number; foto: string | null }[];
  alertas: { id: string; nome: string; foto: string | null; diasInativo: number; liga: string; ultimoCheckin: string | null }[];
  pedidosAjuste: { registroId: string; pacienteId: string; pacienteNome: string }[];
  desempenhoCategoria: { alimentacao: number; treino: number; agua: number; sono: number };
}
interface DashResp { pacientesAtivos: number; adesaoPlanos: number; novosPacientesMes: number }

/* ───────── primitivos ───────── */
function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl bg-nx-surface border border-white/5 ${className}`}>{children}</div>
  );
}

function StateBox({
  loading, error, empty, onRetry, children, minH = "h-28",
}: {
  loading: boolean; error: string | null; empty?: boolean; onRetry?: () => void;
  children: React.ReactNode; minH?: string;
}) {
  if (loading)
    return <div className={`${minH} animate-pulse rounded-xl bg-nx-container/60`} aria-busy="true" />;
  if (error)
    return (
      <div className={`${minH} flex flex-col items-center justify-center gap-2 text-center`}>
        <p className="text-body-sm text-nx-error">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-label-md text-nx-primary hover:underline">Tentar de novo</button>
        )}
      </div>
    );
  if (empty)
    return <div className={`${minH} flex items-center justify-center text-body-sm text-nx-outline`}>Sem dados ainda</div>;
  return <>{children}</>;
}

/* ───────── página ───────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const ligas = useFetch<LigasResp>("/dashboard/ligas");
  const dash = useFetch<DashResp>("/dashboard");

  const hoje = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long" });

  return (
    <div className="flex min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="flex-1 min-w-0 px-4 md:px-6 py-6 pb-24 lg:pb-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-headline-md text-nx-on-surface">Visão Geral</h1>
            <p className="text-body-sm text-nx-on-surface-variant mt-0.5">Resumo clínico do dia {hoje}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button aria-label="Buscar" className="grid place-items-center size-11 rounded-full bg-nx-surface border border-white/5 text-nx-on-surface-variant hover:text-nx-on-surface transition-colors">
              <Search size={18} />
            </button>
            <button aria-label="Notificações" className="relative grid place-items-center size-11 rounded-full bg-nx-surface border border-white/5 text-nx-on-surface-variant hover:text-nx-on-surface transition-colors">
              <Bell size={18} />
              <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-nx-secondary" />
            </button>
          </div>
        </header>

        {/* KPIs */}
        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <Kpi label="Pacientes Ativos" loading={ligas.loading} error={ligas.error} onRetry={ligas.refetch}
            value={ligas.data?.kpis.pacientesAtivos} trend={ligas.data ? `+${ligas.data.kpis.novosMes}` : undefined} trendIcon={TrendingUp} />
          <Kpi label="Taxa de Adesão" loading={dash.loading} error={dash.error} onRetry={dash.refetch}
            value={dash.data != null ? `${dash.data.adesaoPlanos}%` : undefined} trend="Meta" trendIcon={CheckCircle2} />
          <Kpi label="Retenção 30d" loading={ligas.loading} error={ligas.error} onRetry={ligas.refetch}
            value={ligas.data ? `${ligas.data.kpis.retencao30}%` : undefined} trend="Estável" trendIcon={ArrowUpDown} trendMuted />
          <Kpi label="Desafios Ativos" loading={false} error={null} value={undefined} emptyNote="sem endpoint" trendIcon={Rocket} />
          <Kpi label="Check-ins Hoje" loading={ligas.loading} error={ligas.error} onRetry={ligas.refetch}
            value={ligas.data?.kpis.checkinsHoje}
            trend={ligas.data ? `${ligas.data.kpis.pctCheckins}% dos ativos` : undefined} trendIcon={HeartPulse} />
          <Kpi label="Pacientes em Risco" loading={ligas.loading} error={ligas.error} onRetry={ligas.refetch}
            value={ligas.data?.kpis.emRisco} trend="Atenção" trendIcon={AlertTriangle} danger />
        </section>

        {/* Radar de Urgência */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-body-lg font-semibold text-nx-on-surface">Radar de Urgência</h2>
            <button onClick={() => navigate("/app/pacientes")} className="text-body-sm text-nx-primary hover:underline">Ver todos os alertas</button>
          </div>
          <StateBox loading={ligas.loading} error={ligas.error} onRetry={ligas.refetch} empty={ligas.data?.alertas.length === 0} minH="h-40">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ligas.data?.alertas.slice(0, 3).map((a, i) => (
                <RadarCard key={a.id} nome={a.nome} foto={a.foto} dias={a.diasInativo} variant={i} onClick={() => navigate(`/app/pacientes/${a.id}`)} />
              ))}
            </div>
          </StateBox>
        </section>

        {/* Índice de Saúde + Retenção + Alertas */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
          {/* Índice de Saúde Clínica */}
          <Card className="lg:col-span-4 p-6 flex flex-col items-center">
            <p className="text-label-md uppercase text-nx-on-surface-variant self-start">Índice de Saúde Clínica</p>
            <StateBox loading={ligas.loading} error={ligas.error} onRetry={ligas.refetch} minH="h-52">
              <Gauge value={ligas.data?.kpis.indiceSaude ?? 0} />
              <div className="flex items-center justify-around w-full mt-2">
                <div className="text-center">
                  <p className="text-body-sm text-nx-on-surface-variant">Próxima meta</p>
                  <p className="text-body-md font-semibold text-nx-tertiary">90 pts</p>
                </div>
                <div className="text-center">
                  <p className="text-body-sm text-nx-on-surface-variant">Liga clínica</p>
                  <p className="text-body-md font-semibold" style={{ color: ligas.data?.kpis.ligaClinica.cor }}>
                    {ligas.data ? `${ligas.data.kpis.ligaClinica.liga}` : "—"}
                  </p>
                </div>
              </div>
            </StateBox>
          </Card>

          {/* Retenção de Pacientes */}
          <Card className="lg:col-span-5 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-body-lg font-semibold">Retenção de Pacientes</h3>
              <span className="flex items-center gap-1 text-body-sm text-nx-on-surface-variant rounded-lg bg-nx-container px-3 py-1.5">
                Últimos 6 meses <ChevronDown size={14} />
              </span>
            </div>
            <StateBox loading={ligas.loading} error={ligas.error} onRetry={ligas.refetch}
              empty={(ligas.data?.retencaoMensal.length ?? 0) === 0} minH="h-56">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ligas.data?.retencaoMensal ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nxRet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fill: "#958da1", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#1e1e2c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#e3e0f4" }}
                      formatter={(v) => [`${v}%`, "Retenção"]} />
                    <Area type="monotone" dataKey="pct" stroke="#d2bbff" strokeWidth={2.5} fill="url(#nxRet)" dot={{ r: 3, fill: "#d2bbff" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </StateBox>
          </Card>

          {/* Alertas */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <AlertsColumn ligas={ligas} onNovoLembrete={() => navigate("/app/pacientes")} />
          </div>
        </section>

        {/* Top Pacientes + Distribuição + Saúde por Categoria */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Pacientes */}
          <Card className="p-6">
            <h3 className="text-body-lg font-semibold mb-4">Top Pacientes (Engajamento)</h3>
            <StateBox loading={ligas.loading} error={ligas.error} onRetry={ligas.refetch}
              empty={(ligas.data?.topRanking.length ?? 0) === 0} minH="h-40">
              <ol className="flex flex-col gap-4">
                {ligas.data?.topRanking.slice(0, 3).map((p) => (
                  <li key={p.pos} className="flex items-center gap-3">
                    <span className="text-label-md text-nx-outline w-4">{p.pos}º</span>
                    <Avatar src={p.foto} nome={p.nome} tamanho={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-semibold truncate">{p.nome}</p>
                      <div className="h-1 rounded-full bg-white/8 mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-nx-secondary" style={{ width: `${Math.min(100, (p.pontos / (ligas.data!.topRanking[0].pontos || 1)) * 100)}%` }} />
                      </div>
                    </div>
                    <span className="text-label-md text-nx-secondary shrink-0">{p.pontos} XP</span>
                  </li>
                ))}
              </ol>
            </StateBox>
          </Card>

          {/* Distribuição de Ligas */}
          <Card className="p-6">
            <h3 className="text-body-lg font-semibold mb-2">Distribuição de Ligas</h3>
            <StateBox loading={ligas.loading} error={ligas.error} onRetry={ligas.refetch}
              empty={(ligas.data?.distribuicaoLigas.filter(d => d.count > 0).length ?? 0) === 0} minH="h-52">
              <LeagueDonut data={ligas.data?.distribuicaoLigas ?? []} />
            </StateBox>
          </Card>

          {/* Saúde por Categoria */}
          <Card className="p-6">
            <h3 className="text-body-lg font-semibold mb-4">Saúde por Categoria</h3>
            <StateBox loading={ligas.loading} error={ligas.error} onRetry={ligas.refetch} minH="h-52">
              <div className="grid grid-cols-2 gap-4">
                <Ring label="Hidratação" pct={ligas.data?.desempenhoCategoria.agua ?? 0} color="#d2bbff" />
                <Ring label="Proteína" pct={ligas.data?.desempenhoCategoria.alimentacao ?? 0} color="#4edea3" />
                <Ring label="Sono" pct={ligas.data?.desempenhoCategoria.sono ?? 0} color="#ffb95f" />
                <Ring label="Treino" pct={ligas.data?.desempenhoCategoria.treino ?? 0} color="#A855F7" />
              </div>
            </StateBox>
          </Card>
        </section>
      </main>

      {/* FAB Preciso de ajuste */}
      <button
        onClick={() => navigate("/app/feed")}
        className="fixed bottom-24 lg:bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-5 py-3 bg-nx-surface/70 backdrop-blur-xl border border-white/10 shadow-nx-glow text-nx-on-surface hover:bg-nx-surface transition-colors"
      >
        <AlertTriangle size={18} className="text-nx-secondary" />
        <span className="text-body-sm font-medium">Preciso de ajuste</span>
      </button>
    </div>
  );
}

/* ───────── subcomponentes ───────── */
function Kpi({
  label, value, trend, trendIcon: TrendIcon, danger, trendMuted, loading, error, onRetry, emptyNote,
}: {
  label: string; value?: React.ReactNode; trend?: string;
  trendIcon: React.ComponentType<{ size?: number; className?: string }>;
  danger?: boolean; trendMuted?: boolean; loading: boolean; error: string | null;
  onRetry?: () => void; emptyNote?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-body-sm text-nx-on-surface-variant">{label}</p>
      <StateBox loading={loading} error={error} onRetry={onRetry} empty={value == null && !loading && !error} minH="h-12">
        <p className={`text-headline-md mt-1 ${danger ? "text-nx-error" : "text-nx-on-surface"}`}>
          {value ?? "—"}
        </p>
        {trend && (
          <p className={`flex items-center gap-1 text-label-md mt-2 ${
            danger ? "text-nx-error" : trendMuted ? "text-nx-on-surface-variant" : "text-nx-tertiary"
          }`}>
            <TrendIcon size={12} className="" /> {trend}
          </p>
        )}
        {value == null && emptyNote && <p className="text-label-sm text-nx-outline mt-2">{emptyNote}</p>}
      </StateBox>
    </Card>
  );
}

const RADAR = [
  { reason: (d: number) => `${d} DIAS SEM CHECK-IN`, action: "Enviar motivação", icon: Send, accent: "border-nx-primary-container/40", btn: "bg-nx-container text-nx-on-surface" },
  { reason: (_d: number) => `BAIXA ADESÃO`, action: "Ajustar plano", icon: SlidersHorizontal, accent: "border-nx-primary-container/40", btn: "bg-nx-container text-nx-on-surface" },
  { reason: (_d: number) => `RETORNO VENCIDO`, action: "Agendar retorno", icon: CalendarClock, accent: "border-nx-secondary-container/60 shadow-[0_0_20px_rgba(238,152,0,0.15)]", btn: "bg-transparent text-nx-secondary border border-nx-secondary-container/60" },
];

function RadarCard({ nome, foto, dias, variant, onClick }: { nome: string; foto: string | null; dias: number; variant: number; onClick: () => void }) {
  const v = RADAR[variant % RADAR.length];
  return (
    <Card className={`p-4 ${v.accent}`}>
      <div className="flex items-center gap-3 mb-3">
        <Avatar src={foto} nome={nome} tamanho={40} />
        <div className="min-w-0">
          <p className="text-body-md font-bold truncate">{nome}</p>
          <p className="text-label-sm text-nx-secondary flex items-center gap-1">{v.reason(dias)}</p>
        </div>
      </div>
      <button onClick={onClick} className={`w-full rounded-xl py-2.5 text-body-sm font-medium ${v.btn}`}>{v.action}</button>
    </Card>
  );
}

function AlertsColumn({ ligas, onNovoLembrete }: {
  ligas: ReturnType<typeof useFetch<LigasResp>>; onNovoLembrete: () => void;
}) {
  const items: { level: "urgente" | "alerta" | "sucesso"; title: string }[] = [];
  if (ligas.data) {
    if (ligas.data.kpis.emRisco > 0) items.push({ level: "urgente", title: `${ligas.data.kpis.emRisco} pacientes em risco de abandono` });
    if (ligas.data.pedidosAjuste.length > 0) items.push({ level: "alerta", title: `${ligas.data.pedidosAjuste.length} pedidos de ajuste pendentes` });
    if (ligas.data.kpis.checkinsHoje > 0) items.push({ level: "sucesso", title: `${ligas.data.kpis.checkinsHoje} check-ins registrados hoje` });
  }

  const styles = {
    urgente: "border-nx-error-container/70 text-nx-error",
    alerta: "border-nx-secondary-container/70 text-nx-secondary",
    sucesso: "border-nx-tertiary-container/70 text-nx-tertiary",
  } as const;
  const labels = { urgente: "URGENTE", alerta: "ALERTA", sucesso: "SUCESSO" } as const;

  return (
    <StateBox loading={ligas.loading} error={ligas.error} empty={items.length === 0 && !ligas.loading} minH="h-52">
      {items.map((it, i) => (
        <div key={i} className={`rounded-xl bg-nx-surface border-l-2 border p-4 ${styles[it.level]} border-y-white/5 border-r-white/5`}>
          <p className="text-label-md uppercase">{labels[it.level]}</p>
          <p className="text-body-sm text-nx-on-surface mt-1">{it.title}</p>
        </div>
      ))}
      <button onClick={onNovoLembrete} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-3 text-body-sm text-nx-on-surface-variant hover:text-nx-on-surface hover:border-white/20 transition-colors">
        <Plus size={16} /> Novo Lembrete
      </button>
    </StateBox>
  );
}

function Gauge({ value }: { value: number }) {
  const r = 70, c = 2 * Math.PI * r, off = c - (Math.min(100, value) / 100) * c;
  const label = value >= 80 ? "EXCELENTE" : value >= 60 ? "BOM" : value >= 40 ? "REGULAR" : "ATENÇÃO";
  return (
    <div className="relative grid place-items-center my-4" style={{ width: 180, height: 180 }}>
      <svg width="180" height="180" className="-rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
        <circle cx="90" cy="90" r={r} fill="none" stroke="#d2bbff" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ filter: "drop-shadow(0 0 6px rgba(210,187,255,0.5))" }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-headline-lg font-bold text-nx-on-surface">{value}</p>
        <p className="text-label-md text-nx-primary">{label}</p>
      </div>
    </div>
  );
}

function Ring({ label, pct, color }: { label: string; pct: number; color: string }) {
  const r = 26, c = 2 * Math.PI * r, off = c - (Math.min(100, pct) / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative grid place-items-center" style={{ width: 72, height: 72 }}>
        <svg width="72" height="72" className="-rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
        </svg>
        <span className="absolute text-label-md text-nx-on-surface">{pct}%</span>
      </div>
      <span className="text-label-sm uppercase text-nx-on-surface-variant">{label}</span>
    </div>
  );
}

function LeagueDonut({ data }: { data: { liga: string; count: number; cor: string }[] }) {
  const filtered = data.filter((d) => d.count > 0);
  const total = filtered.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div className="flex flex-col items-center">
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={filtered} dataKey="count" nameKey="liga" innerRadius={58} outerRadius={80} paddingAngle={2} stroke="none" cornerRadius={4}>
              {filtered.map((d) => <Cell key={d.liga} fill={d.cor} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#1e1e2c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#e3e0f4" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 w-full">
        {filtered.map((d) => (
          <div key={d.liga} className="flex items-center gap-2 text-body-sm">
            <span className="size-2.5 rounded-full" style={{ background: d.cor }} />
            <span className="text-nx-on-surface-variant">{d.liga}</span>
            <span className="ml-auto text-nx-outline">{Math.round((d.count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
