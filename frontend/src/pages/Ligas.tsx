import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, SlidersHorizontal, ChevronRight, TrendingUp, TrendingDown,
  Trophy, X, RotateCcw, Users,
} from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import api from "../lib/api";
import Avatar from "../components/Avatar";
import { LeagueCrest } from "../components/ui-nx";

/* ───────── shapes reais da API ───────── */
interface LigaPaciente {
  id: string; nome: string; foto: string | null; ativo: boolean; objetivo: string | null;
  pontosTotal: number; liga: string; nivel: string; cor: string; icone: string;
  pctObjetivoPeso: number; pontuacaoPeriodo: number; posicaoGeral: number; posicaoLiga: number;
}
interface LigasResp {
  periodo: string; ano: number; semana: number | null; mes: number | null;
  total: number; totalAtivos: number;
  distribuicao: { liga: string; cor: string; icone: string; count: number }[];
  pacientes: LigaPaciente[];
}
interface RankConfig {
  pesoPesoMeta: number; pesoHabitosConsecutivos: number; pesoMetasSemanais: number;
  diasConsecutivosAlvo: number; metasSemanaisAlvo: number;
}

const LIGA_ORDEM = ["Bronze", "Prata", "Ouro", "Diamante", "Mestre", "Lendário"];
const nf = (n: number) => n.toLocaleString("pt-BR");

/* ───────── primitivos ───────── */
function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl bg-nx-surface border border-nx-border ${className}`}>{children}</div>;
}

function StateBox({ loading, error, empty, onRetry, children, minH = "h-28" }: {
  loading: boolean; error: string | null; empty?: boolean; onRetry?: () => void;
  children: React.ReactNode; minH?: string;
}) {
  if (loading) return <div className={`${minH} animate-pulse rounded-xl bg-nx-container/60`} aria-busy="true" />;
  if (error) return (
    <div className={`${minH} flex flex-col items-center justify-center gap-2 text-center`}>
      <p className="text-body-sm text-nx-danger">{error}</p>
      {onRetry && <button onClick={onRetry} className="text-label-md text-nx-evo hover:underline">Tentar de novo</button>}
    </div>
  );
  if (empty) return <div className={`${minH} flex items-center justify-center text-body-sm text-nx-on-surface-variant`}>Sem dados ainda</div>;
  return <>{children}</>;
}

function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-xl bg-nx-container p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-body-sm font-medium transition-colors ${
            value === o.value ? "bg-nx-container-high text-nx-on-surface" : "text-nx-on-surface-variant hover:text-nx-on-surface"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ───────── barra de distribuição ───────── */
function DistribuicaoBar({ dist, total, onSelect, selected }: {
  dist: LigasResp["distribuicao"]; total: number; onSelect: (l: string) => void; selected: string;
}) {
  if (total === 0) return <div className="h-3 rounded-full bg-nx-container" />;
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-nx-container">
      {dist.filter((d) => d.count > 0).map((d) => (
        <button
          key={d.liga}
          onClick={() => onSelect(d.liga)}
          title={`${d.liga}: ${d.count}`}
          className="h-full transition-opacity hover:opacity-80"
          style={{ width: `${(d.count / total) * 100}%`, background: d.cor, opacity: selected === d.liga ? 1 : 0.75 }}
        />
      ))}
    </div>
  );
}

/* ───────── card de liga ───────── */
function LigaCard({ d, active, onClick }: {
  d: LigasResp["distribuicao"][number]; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-2xl border p-4 transition-all ${
        active ? "bg-nx-surface" : "border-nx-border bg-nx-surface hover:bg-nx-surface-hover"
      }`}
      style={active ? { borderColor: `${d.cor}88`, boxShadow: `0 0 20px ${d.cor}22` } : undefined}
    >
      <LeagueCrest liga={d.liga} size={46} animated={active} />
      <span className="text-body-sm font-semibold" style={{ color: d.cor }}>{d.liga}</span>
      <span className="text-[22px] leading-none font-bold text-nx-on-surface">{d.count}</span>
      <span className="text-label-sm text-nx-on-surface-variant">{d.count === 1 ? "paciente" : "pacientes"}</span>
    </button>
  );
}

/* ───────── linha de paciente ───────── */
function PacienteRow({ p, zona, onClick }: {
  p: LigaPaciente; zona: "promo" | "queda" | null; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-nx-surface-hover ${
        zona === "promo"
          ? "border-nx-evo/30 bg-nx-evo/[0.06]"
          : zona === "queda"
          ? "border-nx-danger/30 bg-nx-danger/[0.06]"
          : "border-nx-border bg-nx-surface"
      }`}
    >
      <span className="w-5 shrink-0 text-center text-body-sm font-bold text-nx-on-surface-variant">{p.posicaoLiga}</span>
      <Avatar src={p.foto} nome={p.nome} tamanho={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-md font-semibold text-nx-on-surface">{p.nome}</p>
        <p className="truncate text-label-sm text-nx-on-surface-variant">{p.objetivo || "Sem objetivo definido"}</p>
      </div>
      {/* % objetivo de peso */}
      <div className="hidden w-24 shrink-0 sm:block">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-label-sm text-nx-on-surface-variant">Peso</span>
          <span className="text-label-sm font-medium text-nx-on-surface-variant">{p.pctObjetivoPeso}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-nx-container">
          <div className="h-full rounded-full bg-nx-evo" style={{ width: `${p.pctObjetivoPeso}%` }} />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-body-md font-bold" style={{ color: p.cor }}>{nf(p.pontosTotal)}</p>
        <p className="text-label-sm text-nx-on-surface-variant">pts · {p.liga} {p.nivel}</p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-nx-outline" />
    </button>
  );
}

/* ───────── modal de configuração ───────── */
function ConfigModal({ onClose, onSaved, zonaN, setZonaN }: {
  onClose: () => void; onSaved: () => void; zonaN: number; setZonaN: (n: number) => void;
}) {
  const { data } = useFetch<RankConfig>("/ranking/config");
  const [form, setForm] = useState<RankConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const somaPesos = form ? form.pesoPesoMeta + form.pesoHabitosConsecutivos + form.pesoMetasSemanais : 0;

  const set = (k: keyof RankConfig, v: number) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const salvar = async () => {
    if (!form) return;
    setSaving(true); setErr(null);
    try {
      await api.put("/ranking/config", form);
      onSaved();
      onClose();
    } catch (e) {
      const ax = e as { response?: { data?: { error?: string } }; message?: string };
      setErr(ax?.response?.data?.error ?? ax?.message ?? "Erro ao salvar");
    } finally { setSaving(false); }
  };

  const Field = ({ label, k, hint }: { label: string; k: keyof RankConfig; hint?: string }) => (
    <div>
      <label className="flex items-center justify-between text-body-sm text-nx-on-surface-variant">
        {label}
        <input
          type="number"
          value={form?.[k] ?? 0}
          onChange={(e) => set(k, Math.max(0, parseInt(e.target.value) || 0))}
          className="w-20 rounded-lg border border-nx-border bg-nx-container px-2 py-1 text-right text-body-md text-nx-on-surface focus:border-nx-evo/50 focus:outline-none"
        />
      </label>
      {hint && <p className="mt-0.5 text-label-sm text-nx-on-surface-variant">{hint}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-6 sm:rounded-2xl rounded-b-none" >
        <div className="flex items-center justify-between mb-5" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-body-lg font-semibold text-nx-on-surface">Configuração das Ligas</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-nx-outline hover:text-nx-on-surface"><X size={20} /></button>
        </div>

        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-label-md uppercase text-nx-on-surface-variant">Pesos da pontuação (somam 100)</p>
          <Field label="Peso — Objetivo de peso" k="pesoPesoMeta" />
          <Field label="Peso — Hábitos consecutivos" k="pesoHabitosConsecutivos" />
          <Field label="Peso — Metas semanais" k="pesoMetasSemanais" />
          <p className={`text-body-sm ${somaPesos === 100 ? "text-nx-evo" : "text-nx-streak"}`}>
            Soma atual: {somaPesos} {somaPesos !== 100 && "· o ideal é 100"}
          </p>

          <hr className="border-nx-border" />
          <p className="text-label-md uppercase text-nx-on-surface-variant">Metas-alvo</p>
          <Field label="Dias consecutivos (alvo)" k="diasConsecutivosAlvo" hint="Dias de hábitos para pontuação máxima" />
          <Field label="Metas semanais (alvo)" k="metasSemanaisAlvo" hint="Semanas com adesão ≥ 7 no mês" />

          <hr className="border-nx-border" />
          <p className="text-label-md uppercase text-nx-on-surface-variant">Faixa de corte (zona de promoção/queda)</p>
          <label className="flex items-center justify-between text-body-sm text-nx-on-surface-variant">
            Nº de pacientes na zona
            <input
              type="number" min={1} value={zonaN}
              onChange={(e) => setZonaN(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 rounded-lg border border-nx-border bg-nx-container px-2 py-1 text-right text-body-md text-nx-on-surface focus:border-nx-evo/50 focus:outline-none"
            />
          </label>
          <p className="text-label-sm text-nx-on-surface-variant">Top {zonaN} sobem de liga · Bottom {zonaN} caem.</p>

          {err && <p className="text-body-sm text-nx-danger">{err}</p>}
        </div>

        <div className="mt-6 flex gap-3" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="flex-1 rounded-xl border border-nx-border py-2.5 text-body-md text-nx-on-surface-variant hover:bg-nx-surface-hover">Cancelar</button>
          <button onClick={salvar} disabled={saving || !form}
            className="flex-1 rounded-xl bg-nx-evo py-2.5 text-body-md font-semibold text-nx-on-evo disabled:opacity-50">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ───────── página ───────── */
export default function Ligas() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<"semanal" | "mensal">("semanal");
  const [ativos, setAtivos] = useState(true);
  const [busca, setBusca] = useState("");
  const [ligaSel, setLigaSel] = useState<string | null>(null);
  const [zonaN, setZonaN] = useState(3);
  const [configOpen, setConfigOpen] = useState(false);

  const url = `/ranking/ligas?periodo=${periodo}&ativos=${ativos}`;
  const { data, loading, error, refetch } = useFetch<LigasResp>(url);

  // Liga selecionada: a escolhida ou a mais populosa
  const ligaAtiva = ligaSel ?? [...(data?.distribuicao ?? [])].sort((a, b) => b.count - a.count).find((d) => d.count > 0)?.liga ?? "Ouro";

  const pacientesLiga = useMemo(() => {
    if (!data) return [];
    const q = busca.trim().toLowerCase();
    return data.pacientes
      .filter((p) => p.liga === ligaAtiva)
      .filter((p) => !q || p.nome.toLowerCase().includes(q))
      .sort((a, b) => a.posicaoLiga - b.posicaoLiga);
  }, [data, ligaAtiva, busca]);

  const showPromo = ligaAtiva !== "Lendário";
  const showQueda = ligaAtiva !== "Bronze";
  const n = pacientesLiga.length;
  const zonaDe = (p: LigaPaciente, idx: number): "promo" | "queda" | null => {
    if (showPromo && idx < zonaN) return "promo";
    if (showQueda && idx >= n - zonaN && n > zonaN) return "queda";
    return null;
  };

  const distSel = data?.distribuicao.find((d) => d.liga === ligaAtiva);

  return (
    <div className="flex min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="flex-1 min-w-0 px-4 md:px-6 py-6 pb-24 lg:pb-6">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="flex items-center gap-2 text-headline-md text-nx-on-surface">
              <Trophy size={24} className="text-nx-gold" /> Ligas
            </h1>
            <p className="text-body-sm text-nx-on-surface-variant mt-0.5">
              {data ? `${data.totalAtivos} pacientes ativos distribuídos em 6 ligas` : "Acompanhe seus pacientes por liga"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Segmented value={periodo} onChange={setPeriodo} options={[{ value: "semanal", label: "Semanal" }, { value: "mensal", label: "Mensal" }]} />
            <button onClick={refetch} aria-label="Recarregar"
              className="grid place-items-center size-11 rounded-full bg-nx-surface border border-nx-border text-nx-on-surface-variant hover:text-nx-on-surface transition-colors">
              <RotateCcw size={17} />
            </button>
            <button onClick={() => setConfigOpen(true)}
              className="flex items-center gap-2 rounded-full bg-nx-surface border border-nx-border px-4 h-11 text-body-sm text-nx-on-surface-variant hover:text-nx-on-surface transition-colors">
              <SlidersHorizontal size={16} /> <span className="hidden sm:inline">Configurar</span>
            </button>
          </div>
        </header>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-nx-outline" />
            <input
              value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar paciente por nome…"
              className="w-full rounded-xl border border-nx-border bg-nx-surface py-2.5 pl-9 pr-3 text-body-md text-nx-on-surface placeholder:text-nx-on-surface-variant focus:border-nx-evo/50 focus:outline-none"
            />
          </div>
          <button onClick={() => setAtivos((v) => !v)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-body-sm transition-colors ${
              ativos ? "border-nx-evo/30 bg-nx-evo/10 text-nx-evo" : "border-nx-border bg-nx-surface text-nx-on-surface-variant"
            }`}>
            <Users size={16} /> Só ativos
          </button>
        </div>

        {/* Visão geral */}
        <section className="mb-8">
          <StateBox loading={loading} error={error} onRetry={refetch} empty={data?.total === 0} minH="h-40">
            {data && (
              <>
                <div className="mb-4">
                  <DistribuicaoBar dist={data.distribuicao} total={data.total} onSelect={setLigaSel} selected={ligaAtiva} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                  {LIGA_ORDEM.map((liga) => {
                    const d = data.distribuicao.find((x) => x.liga === liga)!;
                    return <LigaCard key={liga} d={d} active={ligaAtiva === liga} onClick={() => setLigaSel(liga)} />;
                  })}
                </div>
              </>
            )}
          </StateBox>
        </section>

        {/* Detalhe da liga */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-body-lg font-semibold text-nx-on-surface">
              <LeagueCrest liga={ligaAtiva} size={26} animated={false} />
              Liga {ligaAtiva}
              <span className="text-body-sm font-normal text-nx-on-surface-variant">· {pacientesLiga.length} {pacientesLiga.length === 1 ? "paciente" : "pacientes"}</span>
            </h2>
          </div>

          <StateBox loading={loading} error={error} onRetry={refetch} empty={!loading && pacientesLiga.length === 0} minH="h-32">
            <div className="space-y-2">
              {showPromo && pacientesLiga.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-nx-evo/10 px-3 py-1.5 text-body-sm font-medium text-nx-evo">
                  <TrendingUp size={15} /> Zona de promoção — Top {Math.min(zonaN, n)} sobem de liga
                </div>
              )}
              {pacientesLiga.map((p, idx) => {
                const zona = zonaDe(p, idx);
                const primeiraQueda = zona === "queda" && (idx === 0 || zonaDe(pacientesLiga[idx - 1], idx - 1) !== "queda");
                return (
                  <div key={p.id}>
                    {primeiraQueda && (
                      <div className="mb-2 flex items-center gap-2 rounded-lg bg-nx-danger/10 px-3 py-1.5 text-body-sm font-medium text-nx-danger">
                        <TrendingDown size={15} /> Zona de queda — Bottom {Math.min(zonaN, n)} caem de liga
                      </div>
                    )}
                    <PacienteRow p={p} zona={zona} onClick={() => navigate(`/app/pacientes/${p.id}`)} />
                  </div>
                );
              })}
            </div>
          </StateBox>
        </section>
      </main>

      {configOpen && <ConfigModal onClose={() => setConfigOpen(false)} onSaved={refetch} zonaN={zonaN} setZonaN={setZonaN} />}
    </div>
  );
}
