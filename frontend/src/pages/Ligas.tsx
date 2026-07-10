import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, SlidersHorizontal, ChevronRight, ChevronDown, TrendingUp, TrendingDown,
  Trophy, X, RotateCcw, Users, Flame, Zap, ArrowUp, ArrowRight, Filter,
} from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import api from "../lib/api";
import Avatar from "../components/Avatar";
import { LeagueEmblem } from "../components/ui-nx";
import { LIGAS } from "../lib/ligas";
import type { DesafioCard } from "../lib/desafios";

/* ───────── shapes reais das APIs (reutilizadas, sem backend novo) ───────── */
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
/** Subconjunto do /dashboard/ligas que reusamos aqui (engajamento + promoções). */
interface DashLigas {
  aderenciaSemana: { atual: number; anterior: number; delta: number };
  subiramSemana: { id: string; nome: string; foto: string | null; liga: string; ligaNivel: string }[];
}
interface RankConfig {
  pesoPesoMeta: number; pesoHabitosConsecutivos: number; pesoMetasSemanais: number;
  diasConsecutivosAlvo: number; metasSemanaisAlvo: number;
}

const LIGA_ORDEM = ["Bronze", "Prata", "Ouro", "Diamante", "Mestre", "Lendário"];
const LIGA_ORDEM_DESC = [...LIGA_ORDEM].reverse(); // Lendário → Bronze (topo primeiro)
const nf = (n: number) => n.toLocaleString("pt-BR");

/** Descrição curta por liga (copy de interface). */
const LIGA_DESC: Record<string, string> = {
  "Lendário": "O topo. Referência absoluta.",
  Mestre: "Excelência é o padrão.",
  Diamante: "Disciplina que inspira.",
  Ouro: "Consistência gera resultados.",
  Prata: "Construindo hábitos sólidos.",
  Bronze: "Todo campeão começa aqui.",
};

/** Faixa de XP agregada por liga (min..max dos 3 níveis) — espelho de lib/ligas.ts. */
const FAIXA_XP: Record<string, { de: number; ate: number | null }> = (() => {
  const m: Record<string, { de: number; ate: number | null }> = {};
  for (const t of LIGAS) {
    if (!m[t.liga]) m[t.liga] = { de: t.de, ate: t.ate };
    else { m[t.liga].de = Math.min(m[t.liga].de, t.de); m[t.liga].ate = t.ate; }
  }
  return m;
})();
function faixaLabel(liga: string): string {
  const f = FAIXA_XP[liga];
  if (!f) return "";
  return f.ate === null ? `${nf(f.de)}+ XP` : `${nf(f.de)} – ${nf(f.ate - 1)} XP`;
}

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ───────── microinterações ───────── */
/** Contador animado (180–900ms), respeita reduced-motion. */
function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (prefersReduced()) { setV(target); return; }
    let raf = 0; const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setV(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick); else setV(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

/** Barra que enche ao montar (transition 600ms). */
function Bar({ pct, color, className = "h-2" }: { pct: number; color: string; className?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(pct)); return () => cancelAnimationFrame(id); }, [pct]);
  return (
    <div className={`overflow-hidden rounded-full bg-nx-container ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
        style={{ width: `${w}%`, background: color }}
      />
    </div>
  );
}

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

function AvatarStack({ pacientes, max = 5, extra }: { pacientes: LigaPaciente[]; max?: number; extra: number }) {
  return (
    <div className="flex items-center">
      {pacientes.slice(0, max).map((p, i) => (
        <div key={p.id} style={{ marginLeft: i ? -10 : 0, zIndex: max - i }} className="rounded-full">
          <Avatar src={p.foto} nome={p.nome} tamanho={30} borda="2px solid #111318" />
        </div>
      ))}
      {extra > 0 && <span className="ml-2 text-label-md font-semibold text-nx-on-surface-variant">+{extra}</span>}
    </div>
  );
}

/* ───────── indicadores do topo ───────── */
function EngajamentoCard({ ader }: { ader: DashLigas["aderenciaSemana"] | null }) {
  const val = Math.round(useCountUp(ader?.atual ?? 0));
  const delta = ader?.delta ?? 0;
  const pos = delta >= 0;
  // Sparkline honesto: 2 pontos reais (semana anterior → atual). Pronto p/ série histórica.
  const a = ader?.anterior ?? 0, b = ader?.atual ?? 0;
  const y = (n: number) => 22 - (Math.max(0, Math.min(100, n)) / 100) * 20;
  const stroke = pos ? "#7CFF5B" : "#FF5D5D";
  return (
    <Card className="p-4">
      <p className="text-label-md text-nx-on-surface-variant">Índice de engajamento</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[30px] leading-none font-bold text-nx-evo tabular-nums">{val}%</span>
        {ader && (
          <svg width="72" height="26" viewBox="0 0 72 26" className="shrink-0" aria-hidden>
            <defs>
              <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={stroke} stopOpacity="0.28" />
                <stop offset="1" stopColor={stroke} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`M2 ${y(a)} L70 ${y(b)} L70 26 L2 26 Z`} fill="url(#sparkFill)" />
            <path d={`M2 ${y(a)} L70 ${y(b)}`} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
            <circle cx="70" cy={y(b)} r="2.6" fill={stroke} />
          </svg>
        )}
      </div>
      <p className={`mt-2 flex items-center gap-1 text-label-md font-medium ${pos ? "text-nx-evo" : "text-nx-danger"}`}>
        {pos ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {pos ? "+" : ""}{delta}% vs semana passada
      </p>
    </Card>
  );
}

function AtivosCard({ ativos, total }: { ativos: number; total: number }) {
  const val = Math.round(useCountUp(ativos));
  const pct = total ? Math.round((ativos / total) * 100) : 0;
  return (
    <Card className="p-4">
      <p className="text-label-md text-nx-on-surface-variant">Pacientes ativos</p>
      <p className="mt-1 text-[30px] leading-none font-bold text-nx-on-surface tabular-nums">
        {val} <span className="text-body-sm font-normal text-nx-on-surface-variant">de {total}</span>
      </p>
      <Bar pct={pct} color="#7CFF5B" className="mt-4 h-2" />
      <p className="mt-2 text-label-md text-nx-on-surface-variant">{pct}% da carteira</p>
    </Card>
  );
}

function MovCard({ tipo, valor }: { tipo: "promo" | "queda"; valor: number | null }) {
  const isPromo = tipo === "promo";
  const has = valor !== null;
  const val = Math.round(useCountUp(valor ?? 0));
  return (
    <Card className="p-4">
      <p className="text-label-md text-nx-on-surface-variant">{isPromo ? "Promoções" : "Rebaixamentos"}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className={`text-[30px] leading-none font-bold tabular-nums ${has ? (isPromo ? "text-nx-evo" : "text-nx-danger") : "text-nx-on-surface-variant"}`}>
          {has ? val : "—"}
        </span>
        <span className={`grid size-6 place-items-center rounded-full ${isPromo ? "bg-nx-evo/12 text-nx-evo" : "bg-nx-danger/12 text-nx-danger"} ${!has && "opacity-40"}`}>
          {isPromo ? <ArrowUp size={14} /> : <TrendingDown size={14} />}
        </span>
      </div>
      <p className="mt-4 text-label-md text-nx-on-surface-variant">
        {has ? "esta semana" : "aguardando dados"}
      </p>
    </Card>
  );
}

/* ───────── linha de liga (lista principal) ───────── */
function LigaRow({ liga, ordinal, count, cor, pacientes, zonaN, expanded, onToggle }: {
  liga: string; ordinal: number; count: number; cor: string;
  pacientes: LigaPaciente[]; zonaN: number; expanded: boolean; onToggle: () => void;
}) {
  // Progresso médio da população da liga dentro da própria faixa de XP.
  const f = FAIXA_XP[liga];
  const pct = (() => {
    if (!count || !f) return 0;
    if (f.ate === null) return 100;
    const span = f.ate - f.de || 1;
    const soma = pacientes.reduce((s, p) => s + Math.min(1, Math.max(0, (p.pontosTotal - f.de) / span)), 0);
    return Math.round((soma / count) * 100);
  })();
  const extra = Math.max(0, count - 5);

  return (
    <div
      className={`group rounded-2xl border transition-all duration-200 ${
        expanded ? "bg-nx-surface" : "border-nx-border bg-nx-surface hover:bg-nx-surface-hover"
      }`}
      style={expanded ? { borderColor: `${cor}66`, boxShadow: `0 0 24px ${cor}20` } : undefined}
    >
      <button onClick={onToggle} className="flex w-full items-center gap-4 p-4 text-left">
        <span className="w-4 shrink-0 text-center text-body-md font-bold text-nx-on-surface-variant tabular-nums">{ordinal}</span>
        <div
          className="shrink-0 transition-transform duration-200 group-hover:scale-105"
          style={{ filter: `drop-shadow(0 0 12px ${cor}55)` }}
        >
          <LeagueEmblem liga={liga} size={58} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-lg font-bold" style={{ color: cor }}>{liga}</p>
          <p className="truncate text-label-md text-nx-on-surface-variant">{LIGA_DESC[liga]}</p>
          <p className="mt-0.5 text-label-md text-nx-on-surface-variant">{count} {count === 1 ? "paciente" : "pacientes"}</p>
        </div>
        <div className="hidden shrink-0 sm:block">
          <AvatarStack pacientes={pacientes} extra={extra} />
        </div>
        <div className="hidden w-44 shrink-0 md:block">
          <p className="mb-1.5 text-body-sm font-semibold" style={{ color: cor }}>{faixaLabel(liga)}</p>
          <div className="flex items-center gap-2">
            <Bar pct={pct} color={cor} className="h-2 flex-1" />
            <span className="w-9 text-right text-label-md font-medium text-nx-on-surface-variant tabular-nums">{pct}%</span>
          </div>
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-full text-nx-on-surface-variant transition-colors group-hover:text-nx-on-surface">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-nx-border px-4 pb-4 pt-3">
          {/* faixas de XP / avatares no mobile (escondidos no header pequeno) */}
          <div className="mb-3 flex items-center justify-between gap-2 md:hidden">
            <span className="text-body-sm font-semibold" style={{ color: cor }}>{faixaLabel(liga)}</span>
            <AvatarStack pacientes={pacientes} extra={extra} />
          </div>
          <PacientesDaLiga liga={liga} pacientes={pacientes} cor={cor} zonaN={zonaN} />
        </div>
      )}
    </div>
  );
}

/* ───────── lista de pacientes da liga (reusa zonas promo/queda existentes) ───────── */
function PacientesDaLiga({ liga, pacientes, cor, zonaN }: { liga: string; pacientes: LigaPaciente[]; cor: string; zonaN: number }) {
  const navigate = useNavigate();
  const n = pacientes.length;
  const showPromo = liga !== "Lendário";
  const showQueda = liga !== "Bronze";
  const zonaDe = (idx: number): "promo" | "queda" | null => {
    if (showPromo && idx < zonaN) return "promo";
    if (showQueda && idx >= n - zonaN && n > zonaN) return "queda";
    return null;
  };
  if (n === 0) return <p className="py-4 text-center text-body-sm text-nx-on-surface-variant">Nenhum paciente nesta liga ainda.</p>;

  return (
    <div className="space-y-2">
      {showPromo && (
        <div className="flex items-center gap-2 rounded-lg bg-nx-evo/10 px-3 py-1.5 text-body-sm font-medium text-nx-evo">
          <TrendingUp size={15} /> Zona de promoção — Top {Math.min(zonaN, n)} sobem de liga
        </div>
      )}
      {pacientes.map((p, idx) => {
        const zona = zonaDe(idx);
        const primeiraQueda = zona === "queda" && (idx === 0 || zonaDe(idx - 1) !== "queda");
        return (
          <div key={p.id} className="animate-[nx-pop_0.3s_ease-out_both]" style={{ animationDelay: `${Math.min(idx, 8) * 24}ms` }}>
            {primeiraQueda && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-nx-danger/10 px-3 py-1.5 text-body-sm font-medium text-nx-danger">
                <TrendingDown size={15} /> Zona de queda — Bottom {Math.min(zonaN, n)} caem de liga
              </div>
            )}
            <button
              onClick={() => navigate(`/app/pacientes/${p.id}`)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-nx-surface-hover ${
                zona === "promo" ? "border-nx-evo/30 bg-nx-evo/[0.06]"
                : zona === "queda" ? "border-nx-danger/30 bg-nx-danger/[0.06]"
                : "border-nx-border bg-nx-surface"
              }`}
            >
              <span className="w-5 shrink-0 text-center text-body-sm font-bold text-nx-on-surface-variant tabular-nums">{p.posicaoLiga}</span>
              <Avatar src={p.foto} nome={p.nome} tamanho={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-md font-semibold text-nx-on-surface">{p.nome}</p>
                <p className="truncate text-label-sm text-nx-on-surface-variant">{p.objetivo || "Sem objetivo definido"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-body-md font-bold tabular-nums" style={{ color: cor }}>{nf(p.pontosTotal)}</p>
                <p className="text-label-sm text-nx-on-surface-variant">pts · {p.liga} {p.nivel}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-nx-outline" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── painel lateral ───────── */
function BatalhaSemana({ pacientes, distribuicao }: { pacientes: LigaPaciente[]; distribuicao: LigasResp["distribuicao"] }) {
  // Escolhe as 2 ligas com mais "movimento" no período (soma de pontuacaoPeriodo).
  const soma: Record<string, number> = {};
  for (const p of pacientes) soma[p.liga] = (soma[p.liga] || 0) + p.pontuacaoPeriodo;
  const rank = LIGA_ORDEM
    .map((l) => ({ liga: l, pts: Math.round(soma[l] || 0), cor: distribuicao.find((d) => d.liga === l)?.cor || "#9CA3AF" }))
    .filter((r) => (distribuicao.find((d) => d.liga === r.liga)?.count || 0) > 0)
    .sort((a, b) => b.pts - a.pts);
  const dias = Math.max(0, 7 - (new Date().getDay() || 7));

  if (rank.length < 2) {
    return (
      <Card className="p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-body-md font-semibold text-nx-on-surface">Batalha da semana <Flame size={15} className="text-nx-streak" /></h3>
        <p className="py-4 text-center text-body-sm text-nx-on-surface-variant">Poucas ligas ativas para uma batalha.</p>
      </Card>
    );
  }
  const [a, b] = rank;
  const totalPts = a.pts + b.pts || 1;
  const pctA = Math.round((a.pts / totalPts) * 100);

  return (
    <Card className="p-4">
      <h3 className="mb-4 flex items-center gap-1.5 text-body-md font-semibold text-nx-on-surface">
        Batalha da semana <Flame size={15} className="text-nx-streak" />
      </h3>
      <div className="relative flex items-center justify-between">
        {[a, b].map((r) => (
          <div key={r.liga} className="flex flex-col items-center gap-1" style={{ filter: `drop-shadow(0 0 10px ${r.cor}55)` }}>
            <LeagueEmblem liga={r.liga} size={52} />
            <span className="text-label-md font-semibold" style={{ color: r.cor }}>{r.liga}</span>
          </div>
        ))}
        <span className="absolute left-1/2 top-[26px] grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-nx-border bg-nx-container text-label-md font-bold text-nx-on-surface-variant">VS</span>
      </div>
      <div className="relative mt-4 flex h-2.5 overflow-hidden rounded-full">
        <div className="h-full transition-[width] duration-500" style={{ width: `${pctA}%`, background: a.cor }} />
        <div className="h-full flex-1" style={{ background: b.cor }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-label-md font-medium">
        <span style={{ color: a.cor }}>{a.pts} pts</span>
        <span style={{ color: b.cor }}>{b.pts} pts</span>
      </div>
      <p className="mt-3 text-center text-label-md text-nx-evo">
        {dias > 0 ? `Faltam ${dias} ${dias === 1 ? "dia" : "dias"} para o resultado.` : "Resultado sai hoje!"}
      </p>
    </Card>
  );
}

function EmDestaque({ pacientes }: { pacientes: LigaPaciente[] }) {
  const navigate = useNavigate();
  const top = [...pacientes].sort((a, b) => b.pontuacaoPeriodo - a.pontuacaoPeriodo).slice(0, 3);
  const medalha = ["#F8C84B", "#C2C9D2", "#C77B3C"];
  return (
    <Card className="p-4">
      <h3 className="mb-4 text-body-md font-semibold text-nx-on-surface">Em destaque</h3>
      {top.length === 0 ? (
        <p className="py-3 text-center text-body-sm text-nx-on-surface-variant">Sem movimento no período ainda.</p>
      ) : (
        <div className="space-y-3">
          {top.map((p, i) => (
            <button key={p.id} onClick={() => navigate(`/app/pacientes/${p.id}`)}
              className="flex w-full items-center gap-3 text-left transition-colors hover:opacity-90">
              <span className="grid size-6 shrink-0 place-items-center rounded-full text-label-sm font-bold text-nx-on-evo tabular-nums" style={{ background: medalha[i] }}>{i + 1}</span>
              <Avatar src={p.foto} nome={p.nome} tamanho={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-md font-semibold text-nx-on-surface">{p.nome}</p>
                <p className="truncate text-label-sm font-medium" style={{ color: p.cor }}>{p.liga}</p>
              </div>
              <span className="shrink-0 text-body-sm font-bold text-nx-evo tabular-nums">+{Math.round(p.pontuacaoPeriodo)} XP</span>
            </button>
          ))}
        </div>
      )}
      <button onClick={() => navigate("/app/pacientes")}
        className="mt-4 w-full rounded-xl border border-nx-border py-2 text-body-sm text-nx-on-surface-variant transition-colors hover:bg-nx-surface-hover hover:text-nx-on-surface">
        Ver ranking completo
      </button>
    </Card>
  );
}

function Movimentacoes({ subiram }: { subiram: DashLigas["subiramSemana"] }) {
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-body-md font-semibold text-nx-on-surface">Movimentações</h3>
      </div>
      {subiram.length === 0 ? (
        // UI pronta: quando o backend emitir quedas/entradas de liga, entram aqui.
        <p className="py-3 text-center text-body-sm text-nx-on-surface-variant">Nenhuma movimentação de liga esta semana.</p>
      ) : (
        <ul className="space-y-3">
          {subiram.map((s) => (
            <li key={s.id} className="flex items-center gap-3">
              <Avatar src={s.foto} nome={s.nome} tamanho={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-md font-semibold text-nx-on-surface">{s.nome}</p>
                <p className="truncate text-label-sm text-nx-on-surface-variant">
                  subiu para <span className="font-semibold text-nx-evo">{s.liga}</span>
                </p>
              </div>
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-nx-evo/12 text-nx-evo"><ArrowUp size={14} /></span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ───────── rodapé: desafio da semana (só leitura, vem da aba Desafios) ───────── */
function DesafioSemana({ desafios }: { desafios: DesafioCard[] | null }) {
  const navigate = useNavigate();
  const ativo = desafios?.[0] ?? null;
  const pct = ativo?.taxaConclusao ?? null;

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute -right-8 -top-8 size-40 rounded-full bg-nx-brand/10 blur-2xl" aria-hidden />
      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-nx-brand/15 text-nx-brand">
            <Zap size={28} />
          </span>
          <div>
            <p className="text-label-md text-nx-on-surface-variant">Desafio da semana</p>
            {ativo ? (
              <>
                <p className="text-body-lg font-bold text-nx-on-surface">{ativo.titulo}</p>
                <p className="text-body-sm font-medium text-nx-brand">Participe e ganhe até +{ativo.pontosBonus} XP</p>
              </>
            ) : (
              <p className="text-body-md text-nx-on-surface-variant">Nenhum desafio ativo no momento</p>
            )}
          </div>
        </div>

        {ativo && (
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-[26px] leading-none font-bold text-nx-on-surface tabular-nums">
                {pct !== null ? `${pct}%` : "—"}
              </p>
              <p className="text-label-sm text-nx-on-surface-variant">participando</p>
            </div>
            {ativo.diasRestantes !== null && (
              <div className="text-center">
                <p className="text-[26px] leading-none font-bold text-nx-brand tabular-nums">{ativo.diasRestantes}</p>
                <p className="text-label-sm text-nx-on-surface-variant">{ativo.diasRestantes === 1 ? "dia restante" : "dias restantes"}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => navigate("/app/desafios")}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-nx-brand px-5 py-2.5 text-body-sm font-semibold text-white transition-transform duration-200 hover:scale-[1.03]"
        >
          Ver desafio <ArrowRight size={16} />
        </button>
      </div>
    </Card>
  );
}

/* ───────── modal de configuração (reutilizado tal como antes) ───────── */
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
      onSaved(); onClose();
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
      <Card className="w-full max-w-md p-6 sm:rounded-2xl rounded-b-none">
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
  const [periodo, setPeriodo] = useState<"semanal" | "mensal">("semanal");
  const [ativos, setAtivos] = useState(true);
  const [busca, setBusca] = useState("");
  const [zonaN, setZonaN] = useState(3);
  const [configOpen, setConfigOpen] = useState(false);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [expandida, setExpandida] = useState<string | null>(null);
  const filtrosRef = useRef<HTMLDivElement>(null);

  const { data, loading, error, refetch } = useFetch<LigasResp>(`/ranking/ligas?periodo=${periodo}&ativos=${ativos}`);
  // Reuso de endpoints existentes (mesmo módulo/gate). Falhas não quebram a tela.
  const dash = useFetch<DashLigas>("/dashboard/ligas");
  const desafios = useFetch<DesafioCard[]>("/desafios?status=em_curso");

  const q = busca.trim().toLowerCase();
  const pacientesFiltrados = useMemo(() => {
    if (!data) return [];
    return q ? data.pacientes.filter((p) => p.nome.toLowerCase().includes(q)) : data.pacientes;
  }, [data, q]);

  const porLiga = (liga: string) =>
    pacientesFiltrados.filter((p) => p.liga === liga).sort((a, b) => a.posicaoLiga - b.posicaoLiga);

  return (
    <div className="flex min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="flex-1 min-w-0 px-4 md:px-6 py-6 pb-24 lg:pb-6">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="flex items-center gap-2 text-headline-md text-nx-on-surface">
              <Trophy size={24} className="text-nx-gold" /> Ligas
            </h1>
            <p className="text-body-sm text-nx-on-surface-variant mt-0.5">Transformando hábitos em conquistas.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Segmented value={periodo} onChange={setPeriodo}
              options={[{ value: "semanal", label: "Semana" }, { value: "mensal", label: "Mês" }]} />
            <div className="relative" ref={filtrosRef}>
              <button onClick={() => setFiltrosOpen((v) => !v)}
                className={`flex items-center gap-2 rounded-xl border px-4 h-11 text-body-sm transition-colors ${
                  filtrosOpen || busca || !ativos ? "border-nx-evo/30 bg-nx-evo/10 text-nx-evo" : "border-nx-border bg-nx-surface text-nx-on-surface-variant hover:text-nx-on-surface"
                }`}>
                <Filter size={16} /> <span className="hidden sm:inline">Filtros</span>
              </button>
              {filtrosOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setFiltrosOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-nx-border bg-nx-surface p-4 shadow-nx-card animate-[nx-pop_0.2s_ease-out_both]">
                    <div className="relative mb-3">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-nx-outline" />
                      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar paciente…"
                        className="w-full rounded-xl border border-nx-border bg-nx-container py-2.5 pl-9 pr-3 text-body-md text-nx-on-surface placeholder:text-nx-on-surface-variant focus:border-nx-evo/50 focus:outline-none" />
                    </div>
                    <button onClick={() => setAtivos((v) => !v)}
                      className={`mb-2 flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-body-sm transition-colors ${
                        ativos ? "border-nx-evo/30 bg-nx-evo/10 text-nx-evo" : "border-nx-border bg-nx-container text-nx-on-surface-variant"
                      }`}>
                      <Users size={16} /> Somente pacientes ativos
                    </button>
                    <button onClick={() => { setConfigOpen(true); setFiltrosOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-xl border border-nx-border bg-nx-container px-3 py-2.5 text-body-sm text-nx-on-surface-variant hover:text-nx-on-surface">
                      <SlidersHorizontal size={16} /> Configurar ligas
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={refetch} aria-label="Recarregar"
              className="grid place-items-center size-11 rounded-xl bg-nx-surface border border-nx-border text-nx-on-surface-variant hover:text-nx-on-surface transition-colors">
              <RotateCcw size={17} />
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Coluna principal */}
          <div className="min-w-0 space-y-6">
            {/* Indicadores */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {loading || dash.loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-2xl bg-nx-container/60" aria-busy="true" />
                ))
              ) : error ? (
                <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-2xl border border-nx-border py-8 text-center">
                  <p className="text-body-sm text-nx-danger">{error}</p>
                  <button onClick={refetch} className="text-label-md text-nx-evo hover:underline">Tentar de novo</button>
                </div>
              ) : (
                <>
                  <EngajamentoCard ader={dash.data?.aderenciaSemana ?? null} />
                  <AtivosCard ativos={data?.totalAtivos ?? 0} total={data?.total ?? 0} />
                  <MovCard tipo="promo" valor={dash.data?.subiramSemana.length ?? 0} />
                  <MovCard tipo="queda" valor={null} />
                </>
              )}
            </section>

            {/* Classificação das Ligas */}
            <section>
              <h2 className="mb-4 text-body-lg font-semibold text-nx-on-surface">Classificação das Ligas</h2>
              <StateBox loading={loading} error={error} onRetry={refetch} empty={data?.total === 0} minH="h-64">
                {data && (
                  <div className="space-y-3">
                    {LIGA_ORDEM_DESC.map((liga, i) => {
                      const d = data.distribuicao.find((x) => x.liga === liga)!;
                      return (
                        <LigaRow
                          key={liga}
                          liga={liga}
                          ordinal={i + 1}
                          count={d.count}
                          cor={d.cor}
                          pacientes={porLiga(liga)}
                          zonaN={zonaN}
                          expanded={expandida === liga}
                          onToggle={() => setExpandida((cur) => (cur === liga ? null : liga))}
                        />
                      );
                    })}
                  </div>
                )}
              </StateBox>
            </section>

            {/* Rodapé: Desafio da semana */}
            <DesafioSemana desafios={desafios.data} />
          </div>

          {/* Painel lateral */}
          <aside className="space-y-6">
            {data && !loading && !error && (
              <>
                <BatalhaSemana pacientes={data.pacientes} distribuicao={data.distribuicao} />
                <EmDestaque pacientes={data.pacientes} />
                <Movimentacoes subiram={dash.data?.subiramSemana ?? []} />
              </>
            )}
          </aside>
        </div>
      </main>

      {configOpen && <ConfigModal onClose={() => setConfigOpen(false)} onSaved={refetch} zonaN={zonaN} setZonaN={setZonaN} />}
    </div>
  );
}
