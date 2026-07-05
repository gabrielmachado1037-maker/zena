import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import { derivarKpis, ligasComDados, TONE_TEXT } from "../lib/relatorios";
import type { RelatoriosResp, Periodo } from "../lib/relatorios";

/* ───────── primitivos (mesmo visual das telas redesenhadas) ───────── */
function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl bg-nx-surface border border-white/5 ${className}`}>{children}</div>;
}

function StateBox({ loading, error, empty, onRetry, children, minH = "h-28" }: {
  loading: boolean; error: string | null; empty?: boolean; onRetry?: () => void;
  children: React.ReactNode; minH?: string;
}) {
  if (loading) return <div className={`${minH} animate-pulse rounded-xl bg-nx-container/60`} aria-busy="true" />;
  if (error)
    return (
      <div className={`${minH} flex flex-col items-center justify-center gap-2 text-center`}>
        <p className="text-body-sm text-nx-error">{error}</p>
        {onRetry && <button onClick={onRetry} className="text-label-md text-nx-primary hover:underline">Tentar de novo</button>}
      </div>
    );
  if (empty) return <div className={`${minH} flex items-center justify-center text-body-sm text-nx-outline`}>Sem dados ainda</div>;
  return <>{children}</>;
}

const TOOLTIP_STYLE = { background: "#1e1e2c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#e3e0f4" } as const;

/* ───────── página ───────── */
export default function Relatorios() {
  const [periodo, setPeriodo] = useState<Periodo>("mensal");
  const rel = useFetch<RelatoriosResp>(`/relatorios?periodo=${periodo}`);

  const kpis = derivarKpis(rel.data, periodo);
  const ligas = ligasComDados(rel.data);
  const engaj = rel.data?.engajamentoMensal ?? [];

  return (
    <div className="flex min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="flex-1 min-w-0 px-4 md:px-6 py-6 pb-24 lg:pb-6">
        {/* Header + filtro global de período */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-headline-md text-nx-on-surface">Centro de Relatórios</h1>
            <p className="text-body-sm text-nx-on-surface-variant mt-0.5">Desempenho clínico e engajamento dos pacientes</p>
          </div>
          <PeriodoToggle value={periodo} onChange={setPeriodo} />
        </header>

        {/* KPIs — número weight 600 (hero) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((k) => (
            <Card key={k.key} className="p-5">
              <p className="text-body-sm text-nx-on-surface-variant">{k.label}</p>
              <StateBox loading={rel.loading} error={rel.error} onRetry={rel.refetch} empty={k.value == null && !rel.loading && !rel.error} minH="h-14">
                <p className={`text-[32px] leading-none font-semibold tracking-tight mt-2 ${TONE_TEXT[k.tone]}`}>{k.value ?? "—"}</p>
                {k.hint && <p className="text-label-sm text-nx-outline mt-2">{k.hint}</p>}
              </StateBox>
            </Card>
          ))}
        </section>

        {/* Gráficos — desktop lado a lado, mobile empilhado */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Distribuição por Liga */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={18} className="text-nx-primary" />
              <h2 className="text-body-lg font-semibold">Distribuição por Liga</h2>
            </div>
            <p className="text-body-sm text-nx-on-surface-variant mb-4">Pacientes por liga (pontuação acumulada)</p>
            <StateBox loading={rel.loading} error={rel.error} onRetry={rel.refetch} empty={ligas.vazio} minH="h-64">
              <LeagueDonut data={ligas.data} total={ligas.total} />
            </StateBox>
          </Card>

          {/* Engajamento ao longo do tempo */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-nx-tertiary" />
              <h2 className="text-body-lg font-semibold">Engajamento ao longo do tempo</h2>
            </div>
            <p className="text-body-sm text-nx-on-surface-variant mb-4">% de pacientes ativos por mês · últimos 6 meses</p>
            <StateBox loading={rel.loading} error={rel.error} onRetry={rel.refetch} empty={engaj.length === 0} minH="h-64">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={engaj} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="relEngaj" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4edea3" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#4edea3" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fill: "#958da1", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#958da1", fontSize: 11 }} axisLine={false} tickLine={false} width={34} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Engajamento"]} />
                    <Area type="monotone" dataKey="pct" stroke="#4edea3" strokeWidth={2.5} fill="url(#relEngaj)" dot={{ r: 3, fill: "#4edea3" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </StateBox>
          </Card>
        </section>
      </main>
    </div>
  );
}

/* ───────── subcomponentes ───────── */
function PeriodoToggle({ value, onChange }: { value: Periodo; onChange: (p: Periodo) => void }) {
  const opts: { key: Periodo; label: string }[] = [
    { key: "semanal", label: "Semanal" },
    { key: "mensal", label: "Mensal" },
  ];
  return (
    <div className="inline-flex rounded-xl bg-nx-surface border border-white/5 p-1 self-start">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-4 py-2 rounded-lg text-body-sm font-medium transition-colors ${
            value === o.key ? "bg-nx-primary-container text-nx-on-primary-container" : "text-nx-on-surface-variant hover:text-nx-on-surface"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LeagueDonut({ data, total }: { data: { liga: string; count: number; cor: string }[]; total: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="liga" innerRadius={62} outerRadius={86} paddingAngle={2} stroke="none" cornerRadius={4}>
              {data.map((d) => <Cell key={d.liga} fill={d.cor} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => {
              const v = Number(value);
              return [`${v} (${Math.round((v / total) * 100)}%)`, name];
            }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[28px] font-semibold leading-none text-nx-on-surface">{total}</span>
          <span className="text-label-sm uppercase text-nx-on-surface-variant mt-1">pacientes</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full">
        {data.map((d) => (
          <div key={d.liga} className="flex items-center gap-2 text-body-sm">
            <span className="size-2.5 rounded-full shrink-0" style={{ background: d.cor }} />
            <span className="text-nx-on-surface-variant truncate">{d.liga}</span>
            <span className="ml-auto text-nx-outline">{Math.round((d.count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
