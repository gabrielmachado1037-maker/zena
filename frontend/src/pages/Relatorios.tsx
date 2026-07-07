import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert, Utensils, Activity, CalendarDays, ChevronRight, AlertTriangle, Clock, HeartPulse,
} from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import { piorHabito, diaCritico } from "../lib/relatorios";
import type { RelatoriosResp, Periodo, RefeicaoBreakdown, HabitoAd, PacienteRisco } from "../lib/relatorios";
import Avatar from "../components/mensagens/Avatar";

// Insights (nutricionista) — leituras acionáveis da carteira, não um relatório frio.
// Cada bloco é uma frase pronta + o mínimo de visual pra sustentá-la. Sem gráficos pesados.

const corPct = (pct: number) => (pct >= 70 ? "#7CFF5B" : pct >= 40 ? "#FF8A1F" : "#FF5D5D");

/* ───────── primitivos ───────── */
function Panel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-nx-lg border border-nx-border bg-nx-surface ${className}`}>{children}</div>;
}

function SectionHead({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className="text-nx-on-surface-variant">{icon}</span>
        <h2 className="text-body-lg font-semibold text-nx-on-surface">{title}</h2>
      </div>
      {hint && <p className="mt-0.5 text-body-sm text-nx-on-surface-variant">{hint}</p>}
    </div>
  );
}

function StateBox({ loading, error, empty, onRetry, children, minH = "h-28" }: {
  loading: boolean; error: string | null; empty?: boolean; onRetry?: () => void;
  children: React.ReactNode; minH?: string;
}) {
  if (loading) return <div className={`${minH} animate-pulse rounded-nx-md bg-nx-container/60`} aria-busy="true" />;
  if (error)
    return (
      <div className={`${minH} flex flex-col items-center justify-center gap-2 text-center`}>
        <p className="text-body-sm text-nx-danger">{error}</p>
        {onRetry && <button onClick={onRetry} className="text-label-md text-nx-evo hover:underline">Tentar de novo</button>}
      </div>
    );
  if (empty) return <div className={`${minH} flex items-center justify-center text-body-sm text-nx-on-surface-variant`}>Sem dados ainda</div>;
  return <>{children}</>;
}

/* ───────── página ───────── */
export default function Relatorios() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<Periodo>("mensal");
  const rel = useFetch<RelatoriosResp>(`/relatorios?periodo=${periodo}`);
  const d = rel.data;
  const janela = periodo === "semanal" ? "na semana" : "no mês";

  const risco = d?.pacientesRisco ?? [];
  const habitos = d?.habitos ?? [];
  const breakdown = d?.refeicoesBreakdown ?? [];
  const pior = d?.piorRefeicao ?? null;
  const semRefeicao = breakdown.length > 0 && breakdown.every((x) => x.amostra === 0);
  const piorHab = piorHabito(habitos);
  const dias = diaCritico(d?.diasSemana ?? []);

  return (
    <div className="flex min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="mx-auto w-full max-w-6xl min-w-0 px-4 py-6 pb-24 md:px-6 lg:pb-8">
        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-headline-lg text-nx-on-surface">Insights</h1>
            <p className="mt-1 text-body-sm text-nx-on-surface-variant">
              O que precisa da sua atenção {janela} — e onde agir primeiro.
            </p>
          </div>
          <PeriodoToggle value={periodo} onChange={setPeriodo} />
        </header>

        {/* Pulso da carteira — 3 sinais num painel só (sem cards aninhados) */}
        <Panel className="mb-6 grid grid-cols-1 divide-y divide-nx-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Sinal
            label="Aderência média"
            loading={rel.loading} error={rel.error} onRetry={rel.refetch}
            empty={!!d && d.kpis.adesaoMedia == null}
            value={d && d.kpis.adesaoMedia != null ? d.kpis.adesaoMedia.toLocaleString("pt-BR") : null}
            unit="/10"
            hint={d ? `${d.kpis.adesaoAmostra} check-ins ${janela}` : undefined}
            tone={d?.kpis.adesaoMedia == null ? "neutral" : d.kpis.adesaoMedia >= 7 ? "evo" : d.kpis.adesaoMedia >= 5 ? "streak" : "danger"}
          />
          <Sinal
            label="Retenção · 30 dias"
            loading={rel.loading} error={rel.error} onRetry={rel.refetch}
            value={d ? `${d.kpis.retencao30}` : null}
            unit="%"
            hint={d ? (d.riscoResumo.emRisco > 0 ? `${d.riscoResumo.emRisco} em risco de sair` : "ninguém em risco") : undefined}
            hintTone={d && d.riscoResumo.emRisco > 0 ? "danger" : "evo"}
            tone={d ? (d.kpis.retencao30 >= 70 ? "evo" : d.kpis.retencao30 >= 45 ? "streak" : "danger") : "neutral"}
          />
          <Sinal
            label="Consultas no mês"
            loading={rel.loading} error={rel.error} onRetry={rel.refetch}
            value={d ? `${d.kpis.consultasMes}` : null}
            hint={d ? `${d.kpis.pacientesAtivos} pacientes ativos` : undefined}
            tone="neutral"
          />
        </Panel>

        {/* Pacientes em risco — o insight mais acionável, em destaque */}
        <Panel className="mb-6 p-6">
          <SectionHead
            icon={<ShieldAlert size={18} />}
            title="Pacientes em risco"
            hint="Quem está escorregando agora — toque para agir"
          />
          <StateBox loading={rel.loading} error={rel.error} onRetry={rel.refetch} minH="h-40"
            empty={!!d && risco.length === 0}>
            {risco.length === 0 ? null : (
              <ul className="-mx-2 flex flex-col">
                {risco.map((p) => <RiscoRow key={p.id} p={p} onClick={() => navigate(`/app/pacientes/${p.id}`)} />)}
              </ul>
            )}
          </StateBox>
          {!rel.loading && !rel.error && risco.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
              <HeartPulse size={26} className="text-nx-evo" />
              <p className="text-body-md font-medium text-nx-on-surface">Ninguém em risco agora 💚</p>
              <p className="text-body-sm text-nx-on-surface-variant">Sua carteira está engajada — siga reconhecendo quem evolui.</p>
            </div>
          )}
        </Panel>

        {/* Onde as pessoas falham — hábitos + momento do dia, lado a lado */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel className="p-6">
            <SectionHead
              icon={<Activity size={18} />}
              title="Hábitos mais difíceis"
              hint={piorHab ? `${piorHab.label} é o que mais escapa · ${piorHab.pct}% de adesão` : `Adesão por hábito ${janela}`}
            />
            <StateBox loading={rel.loading} error={rel.error} onRetry={rel.refetch} minH="h-40"
              empty={!!d && habitos.every((h) => h.pct == null)}>
              <div className="flex flex-col gap-4">
                {habitos.map((h) => (
                  <Bar key={h.id} label={h.label} pct={h.pct} foco={piorHab?.id === h.id}
                    sub={h.amostra > 0 ? `${h.amostra} registros ${janela}` : "sem registro ainda"} />
                ))}
              </div>
            </StateBox>
          </Panel>

          <Panel className="p-6">
            <SectionHead
              icon={<Utensils size={18} />}
              title="Comportamento por refeição"
              hint={pior ? `${pior.label} é o momento mais difícil · ${pior.pct}% seguido` : `Seguiu / Adaptou / Pulou ${janela}`}
            />
            <StateBox loading={rel.loading} error={rel.error} onRetry={rel.refetch} minH="h-40" empty={semRefeicao}>
              <div className="flex flex-col gap-4">
                {breakdown.map((m) => (
                  <MealBreakdownRow key={m.refeicao} m={m} foco={pior?.refeicao === m.refeicao} />
                ))}
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-nx-border pt-3">
                  {ALIM_LEGENDA.map((e) => (
                    <span key={e.key} className="flex items-center gap-1.5 text-label-sm">
                      <span className="size-2.5 rounded-full" style={{ background: e.color }} />
                      <span className="text-nx-on-surface-variant">{e.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </StateBox>
          </Panel>
        </div>

        {/* Dias críticos */}
        <Panel className="p-6">
          <SectionHead
            icon={<CalendarDays size={18} />}
            title="Dias críticos"
            hint={dias.headline ?? `Adesão por dia da semana ${janela}`}
          />
          <StateBox loading={rel.loading} error={rel.error} onRetry={rel.refetch} minH="h-40"
            empty={!!d && (d.diasSemana ?? []).every((x) => x.pct == null)}>
            <WeekStrip dias={d?.diasSemana ?? []} piorDow={dias.pior?.dow ?? null} />
          </StateBox>
        </Panel>
      </main>
    </div>
  );
}

/* ───────── subcomponentes ───────── */
const SINAL_TONE: Record<string, string> = {
  evo: "text-nx-evo", streak: "text-nx-streak", danger: "text-nx-danger", neutral: "text-nx-on-surface",
};

const ALIM_LEGENDA = [
  { key: "seguiu", label: "Seguiu", color: "#22C55E" },
  { key: "adaptou", label: "Adaptou", color: "#84CC16" },
  { key: "comeu_mal", label: "Comeu mal", color: "#F59E0B" },
  { key: "pulou", label: "Pulou", color: "#EF4444" },
] as const;

/* Barra segmentada Seguiu/Adaptou/Pulou de uma refeição (cor + rótulo, nunca só cor). */
function MealBreakdownRow({ m, foco }: { m: RefeicaoBreakdown; foco?: boolean }) {
  const semDado = m.amostra === 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-body-sm">
        <span className={`font-medium ${foco ? "text-nx-danger" : "text-nx-on-surface"}`}>{m.label}</span>
        {foco && <span className="rounded-full bg-nx-danger/15 px-2 py-0.5 text-label-sm font-bold text-nx-danger">FOCO</span>}
        <span className="ml-auto text-label-sm text-nx-on-surface-variant">
          {semDado ? "sem registro" : `${m.amostra} ${m.amostra === 1 ? "refeição" : "refeições"}`}
        </span>
      </div>
      {semDado ? (
        <div className="h-2.5 rounded-full bg-nx-container-low" />
      ) : (
        <div className="flex h-2.5 overflow-hidden rounded-full bg-nx-container-low">
          {ALIM_LEGENDA.map((e) => {
            const pct = m[e.key] ?? 0;
            return pct > 0 ? (
              <div key={e.key} style={{ width: `${pct}%`, background: e.color }} title={`${e.label} ${pct}%`} />
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function Sinal({ label, value, unit, hint, hintTone, tone, loading, error, onRetry, empty }: {
  label: string; value: string | null; unit?: string; hint?: string;
  hintTone?: "danger" | "evo"; tone: string;
  loading: boolean; error: string | null; onRetry?: () => void; empty?: boolean;
}) {
  return (
    <div className="p-5">
      <p className="text-body-sm text-nx-on-surface-variant">{label}</p>
      <StateBox loading={loading} error={error} onRetry={onRetry} empty={empty} minH="h-14">
        <p className={`mt-2 flex items-baseline gap-1 leading-none ${SINAL_TONE[tone]}`}>
          <span className="text-[34px] font-semibold tracking-tight tabular-nums">{value ?? "—"}</span>
          {unit && <span className="text-body-md font-medium text-nx-on-surface-variant">{unit}</span>}
        </p>
        {hint && (
          <p className={`mt-2 text-label-sm ${hintTone === "danger" ? "text-nx-danger" : hintTone === "evo" ? "text-nx-evo" : "text-nx-on-surface-variant"}`}>
            {hint}
          </p>
        )}
      </StateBox>
    </div>
  );
}

function RiscoRow({ p, onClick }: { p: PacienteRisco; onClick: () => void }) {
  const risco = p.tone === "risco";
  return (
    <li>
      <button
        onClick={onClick}
        className="group flex w-full items-center gap-3 rounded-nx-md px-2 py-2.5 text-left transition-colors hover:bg-nx-container-high/50"
      >
        <Avatar url={p.avatarUrl} nome={p.nome} className="size-10 rounded-full text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-md font-medium text-nx-on-surface">{p.nome}</p>
          <p className={`mt-0.5 flex items-center gap-1.5 text-body-sm ${risco ? "text-nx-danger" : "text-nx-streak"}`}>
            {risco ? <AlertTriangle size={13} /> : <Clock size={13} />}
            {p.motivo}
          </p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-nx-outline transition-colors group-hover:text-nx-on-surface" />
      </button>
    </li>
  );
}

function Bar({ label, pct, foco, sub }: { label: string; pct: number | null; foco?: boolean; sub: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-body-sm">
        <span className={`flex items-center gap-1.5 ${foco ? "font-semibold text-nx-on-surface" : "text-nx-on-surface-variant"}`}>
          {label}
          {foco && <span className="rounded-full bg-nx-danger/15 px-2 py-0.5 text-label-sm font-bold uppercase text-nx-danger">foco</span>}
        </span>
        <span className="tabular-nums text-nx-on-surface">{pct == null ? "—" : `${pct}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-nx-container-low">
        <div className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct ?? 0}%`, background: pct == null ? "transparent" : corPct(pct) }} />
      </div>
      <p className="mt-1 text-label-sm text-nx-on-surface-variant">{sub}</p>
    </div>
  );
}

function WeekStrip({ dias, piorDow }: { dias: { dow: number; label: string; pct: number | null; amostra: number }[]; piorDow: number | null }) {
  return (
    <div className="flex items-end justify-between gap-2 pt-2 sm:gap-3">
      {dias.map((day) => {
        const pior = day.dow === piorDow;
        const h = day.pct == null ? 0 : Math.max(6, day.pct);
        return (
          <div key={day.dow} className="flex flex-1 flex-col items-center gap-2">
            <span className={`text-label-sm tabular-nums ${pior ? "text-nx-danger font-bold" : "text-nx-on-surface-variant"}`}>
              {day.pct == null ? "—" : `${day.pct}%`}
            </span>
            <div className="flex h-28 w-full max-w-[44px] items-end overflow-hidden rounded-nx-sm bg-nx-container-low">
              <div
                className="w-full rounded-nx-sm transition-[height] duration-500 ease-out"
                style={{ height: `${h}%`, background: day.pct == null ? "transparent" : corPct(day.pct) }}
              />
            </div>
            <span className={`text-label-sm uppercase ${pior ? "text-nx-danger font-bold" : "text-nx-on-surface-variant"}`}>{day.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function PeriodoToggle({ value, onChange }: { value: Periodo; onChange: (p: Periodo) => void }) {
  const opts: { key: Periodo; label: string }[] = [
    { key: "semanal", label: "Semanal" },
    { key: "mensal", label: "Mensal" },
  ];
  return (
    <div className="inline-flex self-start rounded-nx-md border border-nx-border bg-nx-surface p-1">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-nx-sm px-4 py-2 text-body-sm font-medium transition-colors ${
            value === o.key ? "bg-nx-container-high text-nx-on-surface" : "text-nx-on-surface-variant hover:text-nx-on-surface"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
