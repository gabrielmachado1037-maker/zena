import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Plus, Search, Users, MessageCircle, Award,
  ArrowUpRight, Flame, Clock, X, ImageOff, MoreVertical,
  TrendingUp, TrendingDown, Minus, FileText, Trash2, AlertTriangle,
} from "lucide-react";
import api from "../lib/api";
import Avatar from "../components/Avatar";
import { LeagueEmblem } from "../components/ui-nx";
import { progressoLiga, diasDesde, CORES_LIGA } from "../lib/ligas";

interface Paciente {
  id: string;
  nome: string;
  objetivo: string;
  ativo: boolean;
  fotoPerfilUrl?: string | null;
  pontosTotal: number;
  ligaAtual: string;
  ligaNivel: string;
  streakAtual: number;
  ultimoCheckin: string | null;
  diasInativo: number;
  score?: number; // aderência 30d (0–100) — vinda do backend; opcional por retrocompat
  aderenciaDelta?: number | null; // tendência 7d vs 7d anteriores (p.p.); null = sem amostra
}

/* Cor do score de aderência (0–100) por faixa: 90+ verde · 70+ verde claro · 50+ laranja · <50 vermelho. */
const scoreCor = (s: number) => (s >= 90 ? "#7CFF5B" : s >= 70 ? "#53F27C" : s >= 50 ? "#FF8A1F" : "#FF5D5D");

const LIGAS_FILTRO = ["Bronze", "Prata", "Ouro", "Diamante", "Mestre", "Lendário"];
type StatusFiltro = "todos" | "ativo" | "risco" | "inativo";

/* Cor de progresso por liga — acompanha o brasão (CORES_LIGA = arte do LeagueEmblem). */
const corLiga = (l: string) => CORES_LIGA[l] ?? "#7CFF5B";
const nf = (n: number) => n.toLocaleString("pt-BR");

/* Status derivado só dos dados que já existem — mesma regra de risco dos filtros. */
function statusDe(p: Paciente): { label: string; cor: string } {
  const dias = diasDesde(p.ultimoCheckin);
  const emRisco = p.diasInativo >= 3 || dias === null || dias > 2;
  if (emRisco) return { label: "Em risco", cor: "#FF5D5D" };
  if (dias === 0) return { label: "Evoluindo", cor: "#7CFF5B" };
  return { label: "Atenção", cor: "#FF8A1F" };
}

export default function Pacientes() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [ligaFiltro, setLigaFiltro] = useState<string | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [novoAberto, setNovoAberto] = useState(false);
  const [excluir, setExcluir] = useState<Paciente | null>(null);

  function carregar() {
    setLoading(true); setErro(null);
    api.get<{ data: Paciente[] }>("/pacientes?limit=50")
      .then((r) => setPacientes(r.data.data))
      .catch((e) => setErro(e?.response?.data?.error ?? "Não foi possível carregar os pacientes"))
      .finally(() => setLoading(false));
  }
  useEffect(carregar, []);

  const filtrados = useMemo(() => {
    return pacientes.filter((p) => {
      if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      if (ligaFiltro && p.ligaAtual !== ligaFiltro) return false;
      const dias = diasDesde(p.ultimoCheckin);
      const emRisco = p.diasInativo >= 3 || dias === null || dias > 2;
      if (statusFiltro === "ativo" && (!p.ativo || emRisco)) return false;
      if (statusFiltro === "risco" && !(p.ativo && emRisco)) return false;
      if (statusFiltro === "inativo" && p.ativo) return false;
      return true;
    });
  }, [pacientes, busca, ligaFiltro, statusFiltro]);

  // Resumo (só apresentação — leitura instantânea da carteira)
  const resumo = useMemo(() => {
    let evo = 0, at = 0, risco = 0;
    for (const p of pacientes) {
      const s = statusDe(p);
      if (s.label === "Em risco") risco++;
      else if (s.label === "Evoluindo") evo++;
      else at++;
    }
    return { evo, at, risco };
  }, [pacientes]);

  return (
    <div className="flex min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="flex-1 min-w-0 px-5 md:px-8 py-6 md:py-8 pb-24 lg:pb-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-headline-md font-bold">Pacientes</h1>
            <p className="text-body-sm text-nx-on-surface-variant mt-1">
              {loading ? "Carregando…" : `${pacientes.length} em evolução`}
            </p>
          </div>
          <button
            onClick={() => setNovoAberto(true)}
            className="flex items-center gap-2 bg-nx-evo hover:bg-nx-evo-2 text-nx-on-evo text-label-md font-bold px-4 py-2.5 rounded-nx-md transition-colors shadow-[0_8px_30px_-10px_rgba(124,255,91,0.5)]"
          >
            <Plus size={16} /> Novo Paciente
          </button>
        </div>

        {/* Leitura instantânea da carteira */}
        {!loading && !erro && pacientes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <ResumoPill cor="#7CFF5B" n={resumo.evo} label="evoluindo" />
            <ResumoPill cor="#FF8A1F" n={resumo.at} label="em atenção" />
            <ResumoPill cor="#FF5D5D" n={resumo.risco} label="em risco" />
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-col gap-3.5 mb-7">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nx-outline" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome..."
              className="w-full bg-nx-surface border border-nx-border rounded-nx-md pl-11 pr-3 py-3 text-body-sm text-nx-on-surface placeholder:text-nx-on-surface-variant focus:outline-none focus:border-nx-evo/50 focus:ring-1 focus:ring-nx-evo/40 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto hide-scrollbar pb-1">
            {(["todos", "ativo", "risco", "inativo"] as StatusFiltro[]).map((s) => (
              <Chip key={s} active={statusFiltro === s} onClick={() => setStatusFiltro(s)}>
                {s === "todos" ? "Todos" : s === "ativo" ? "Ativos" : s === "risco" ? "Em risco" : "Inativos"}
              </Chip>
            ))}
            <span className="w-px h-6 bg-nx-border mx-1 flex-shrink-0" />
            <Chip active={ligaFiltro === null} onClick={() => setLigaFiltro(null)}>Todas ligas</Chip>
            {LIGAS_FILTRO.map((l) => (
              <Chip key={l} active={ligaFiltro === l} onClick={() => setLigaFiltro(ligaFiltro === l ? null : l)}>
                {l}
              </Chip>
            ))}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-[108px] animate-pulse rounded-2xl bg-nx-surface/70 sm:h-[92px]" />
            ))}
          </div>
        ) : erro ? (
          <div className="rounded-2xl bg-nx-surface border border-nx-border p-10 text-center">
            <p className="text-nx-danger mb-3">{erro}</p>
            <button onClick={carregar} className="text-nx-evo hover:underline text-label-md">Tentar de novo</button>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-nx-on-surface-variant">
            <Users size={32} className="mb-3 opacity-50" />
            <p className="text-body-sm">Nenhum paciente encontrado.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtrados.map((p, i) => (
              <PacienteCard key={p.id} p={p} i={i} navigate={navigate} onExcluir={setExcluir} />
            ))}
          </div>
        )}

        {novoAberto && <NovoPacienteModal onClose={() => setNovoAberto(false)} onCriado={() => { setNovoAberto(false); carregar(); }} />}
        {excluir && <ExcluirModal paciente={excluir} onClose={() => setExcluir(null)} onExcluido={() => { setExcluir(null); carregar(); }} />}
      </main>
    </div>
  );
}

/* ── Pílula de resumo (leitura instantânea) ── */
function ResumoPill({ cor, n, label }: { cor: string; n: number; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-label-md"
      style={{ background: `${cor}12`, border: `1px solid ${cor}2e` }}
    >
      <span className="size-2 rounded-full" style={{ background: cor, boxShadow: `0 0 8px ${cor}` }} />
      <span className="font-bold tabular-nums" style={{ color: cor }}>{n}</span>
      <span className="text-nx-on-surface-variant">{label}</span>
    </span>
  );
}

/* ── Chip de filtro premium (ativo = verde da marca) ── */
function Chip({ children, active, onClick }: {
  children: React.ReactNode; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-label-md font-medium transition-colors duration-150 ${
        active
          ? "bg-nx-evo/12 text-nx-evo border border-nx-evo/40"
          : "bg-nx-surface text-nx-on-surface-variant border border-nx-border hover:text-nx-on-surface hover:border-nx-outline"
      }`}
    >
      {children}
    </button>
  );
}

/* ── Badge de status (pequeno) ── */
function StatusBadge({ label, cor }: { label: string; cor: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold"
      style={{ background: `${cor}1a`, color: cor, border: `1px solid ${cor}33` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: cor }} />
      {label}
    </span>
  );
}

/* ── Badge de score (0–100) por faixa ── */
function ScoreBadge({ score }: { score?: number }) {
  if (score == null) return null;
  const c = scoreCor(score);
  return (
    <span
      title={`Score de aderência ${score} (últimos 30 dias)`}
      className="grid size-11 shrink-0 place-items-center rounded-full text-body-md font-extrabold tabular-nums"
      style={{ color: c, border: `2.5px solid ${c}`, background: `${c}14` }}
    >
      {score}
    </span>
  );
}

/* ── Tendência de aderência (7d vs 7d anteriores) ── */
function TrendChip({ delta }: { delta?: number | null }) {
  if (delta == null) return null;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const cls = delta > 0 ? "text-nx-evo" : delta < 0 ? "text-nx-danger" : "text-nx-on-surface-variant";
  const txt = delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : "0%";
  return (
    <span title="Tendência vs. 7 dias anteriores" className={`inline-flex items-center gap-0.5 text-label-sm font-semibold tabular-nums ${cls}`}>
      <Icon size={11} />{txt}
    </span>
  );
}

/* ── Score (aderência 30d) + tendência ── */
function ScoreCluster({ score, delta }: { score?: number; delta?: number | null }) {
  if (score == null) return null;
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <ScoreBadge score={score} />
      <TrendChip delta={delta} />
    </div>
  );
}

/* Motivo curto e colorido — só dados já existentes; sem tendência fabricada. */
function motivoDe(p: Paciente): { texto: string; cor: string } {
  const dias = diasDesde(p.ultimoCheckin);
  if (dias === null) return { texto: "Nunca registrou", cor: "#FF5D5D" };
  if (dias >= 3) return { texto: `${dias} dias sem check-in`, cor: "#FF5D5D" };
  if (p.score != null && p.score < 40) return { texto: `Aderência baixa · ${p.score}%`, cor: "#FF8A1F" };
  if (dias >= 1) return { texto: `${dias} dia sem registrar`, cor: "#FF8A1F" };
  if (p.streakAtual >= 7) return { texto: "Ótima evolução", cor: "#7CFF5B" };
  if (p.score != null && p.score >= 60) return { texto: "No plano", cor: "#7CFF5B" };
  return { texto: "Registrou hoje", cor: "#9CA3AF" };
}

const checkinLabel = (dias: number | null) =>
  dias === null ? "Nunca" : dias === 0 ? "Hoje" : dias === 1 ? "Ontem" : `Há ${dias} dias`;

/* ── Linha do paciente (CRM compacto) ── */
function PacienteCard({ p, i, navigate, onExcluir }: {
  p: Paciente; i: number; navigate: ReturnType<typeof useNavigate>; onExcluir: (p: Paciente) => void;
}) {
  const reduce = useReducedMotion();
  const { pct, faltam, proxima } = progressoLiga(p.pontosTotal);
  const cor = corLiga(p.ligaAtual);
  const dias = diasDesde(p.ultimoCheckin);
  const emRisco = p.diasInativo >= 3 || dias === null || dias > 2;
  const status = !p.ativo ? { label: "Inativo", cor: "#9CA3AF" } : statusDe(p);
  const motivo = motivoDe(p);
  const faltamPoucoXP = proxima != null && faltam > 0 && faltam < 100;
  const [menu, setMenu] = useState(false);

  const go = (to: string) => (e: React.MouseEvent) => { e.stopPropagation(); setMenu(false); navigate(to); };
  const menuItens: MenuItem[] = [
    { icon: ArrowUpRight, title: "Abrir paciente", to: `/app/pacientes/${p.id}` },
    { icon: FileText, title: "Relatório PDF", to: `/app/pacientes/${p.id}/relatorio` },
    { icon: TrendingUp, title: "Evolução", to: `/app/pacientes/${p.id}?tab=evolucao` },
    { icon: Award, title: "Medalhas", to: `/app/pacientes/${p.id}?tab=liga` },
    { icon: Trash2, title: "Excluir paciente", danger: true, onClick: () => onExcluir(p) },
  ];

  return (
    <motion.div
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : Math.min(i, 8) * 0.03, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduce ? undefined : { y: -2, boxShadow: `0 14px 40px -22px ${cor}55`, transition: { duration: 0.18 } }}
      whileTap={reduce ? undefined : { scale: 0.995 }}
      onClick={() => navigate(`/app/pacientes/${p.id}`)}
      className="group relative flex cursor-pointer flex-col gap-3 rounded-2xl border border-nx-border bg-nx-surface p-3.5 transition-colors duration-[180ms] hover:border-nx-outline sm:flex-row sm:items-center sm:gap-4 sm:p-4"
    >
      {/* Identidade */}
      <div className="flex items-center gap-3 sm:min-w-0 sm:flex-1">
        <div className="relative shrink-0 rounded-full p-[2px]" style={{ boxShadow: `0 0 0 2px ${status.cor}` }}>
          <Avatar src={p.fotoPerfilUrl} nome={p.nome} tamanho={48} className="rounded-full" />
          {emRisco ? (
            <span className="absolute -right-0.5 -top-0.5 flex size-3">
              {!reduce && <span className="absolute inline-flex size-full animate-ping rounded-full bg-nx-danger opacity-75" />}
              <span className="relative inline-flex size-3 rounded-full bg-nx-danger ring-2 ring-nx-surface" />
            </span>
          ) : !p.fotoPerfilUrl ? (
            <span title="Sem foto" className="absolute -bottom-0.5 -right-0.5 grid size-[18px] place-items-center rounded-full border-2 border-nx-surface bg-nx-container text-nx-on-surface-variant">
              <ImageOff size={9} />
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-body-lg font-bold leading-tight text-nx-on-surface">{p.nome}</p>
            <StatusBadge label={status.label} cor={status.cor} />
          </div>
          <p className="mt-0.5 truncate text-body-sm font-medium" style={{ color: motivo.cor }}>{motivo.texto}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-label-sm text-nx-on-surface-variant">
            {p.streakAtual > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-nx-streak"><Flame size={12} /> Sequência: {p.streakAtual} dias</span>
            )}
            {p.streakAtual > 0 && <span className="text-nx-outline">·</span>}
            <span className="inline-flex items-center gap-1"><Clock size={11} /> {checkinLabel(dias)}</span>
          </p>
        </div>
        {/* score + ações — MOBILE */}
        <div className="flex shrink-0 items-center gap-1.5 sm:hidden">
          <ScoreCluster score={p.score} delta={p.aderenciaDelta} />
          <RowActions p={p} menu={menu} setMenu={setMenu} go={go} menuItens={menuItens} />
        </div>
      </div>

      {/* Brasão + XP */}
      <div className="flex items-center gap-3 sm:shrink-0 sm:gap-4">
        <div className="flex shrink-0 flex-col items-center gap-0.5 sm:w-16">
          <span className="inline-flex transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none" style={{ filter: `drop-shadow(0 0 10px ${cor}55)` }}>
            <LeagueEmblem liga={p.ligaAtual} size={44} />
          </span>
          <span className="whitespace-nowrap text-label-sm font-bold leading-none" style={{ color: cor }}>{p.ligaAtual} {p.ligaNivel}</span>
        </div>

        <div className="min-w-0 flex-1 sm:w-52 sm:flex-none">
          <div className="flex items-baseline gap-1.5">
            <span className="text-body-lg font-extrabold leading-none tabular-nums text-nx-on-surface">{nf(p.pontosTotal)}</span>
            <span className="text-label-md font-semibold text-nx-on-surface-variant">XP</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-nx-container-high">
            <motion.div
              className="h-full rounded-full transition-[filter] duration-200 group-hover:brightness-125 motion-reduce:transition-none"
              style={{ background: cor, boxShadow: `0 0 8px ${cor}66` }}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: reduce ? 0 : 0.9, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : 0.15 }}
            />
          </div>
          {faltamPoucoXP ? (
            <p className="mt-1.5 truncate text-label-sm font-bold text-nx-evo">🚀 Apenas {nf(faltam)} XP para {proxima!.liga} {proxima!.nivel}</p>
          ) : (
            <p className="mt-1.5 truncate text-label-sm text-nx-on-surface-variant">
              {proxima ? `Faltam ${nf(faltam)} XP para ${proxima.liga} ${proxima.nivel}` : "Liga máxima atingida 👑"}
            </p>
          )}
        </div>
      </div>

      {/* score + ações — DESKTOP */}
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <ScoreBadge score={p.score} />
        <RowActions p={p} menu={menu} setMenu={setMenu} go={go} menuItens={menuItens} />
      </div>
    </motion.div>
  );
}

type MenuItem = { icon: typeof ArrowUpRight; title: string; to?: string; onClick?: () => void; danger?: boolean };

/* ── Ações da linha: mensagem + menu (⋮) ── */
function RowActions({ p, menu, setMenu, go, menuItens }: {
  p: Paciente; menu: boolean; setMenu: (v: boolean) => void;
  go: (to: string) => (e: React.MouseEvent) => void;
  menuItens: MenuItem[];
}) {
  const btn = "grid size-9 shrink-0 place-items-center rounded-xl border border-nx-border bg-nx-container text-nx-on-surface-variant transition-colors hover:border-nx-outline hover:text-nx-on-surface";
  return (
    <>
      <button onClick={go(`/app/mensagens/${p.id}`)} title="Mensagem" aria-label="Enviar mensagem" className={btn}>
        <MessageCircle size={16} />
      </button>
      <div className="relative">
        <button onClick={(e) => { e.stopPropagation(); setMenu(!menu); }} title="Mais opções" aria-label="Mais opções" className={btn}>
          <MoreVertical size={16} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenu(false); }} />
            <div onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border border-nx-border bg-nx-elevated py-1 shadow-2xl">
              {menuItens.map((m) => (
                <button
                  key={m.title}
                  onClick={m.to ? go(m.to) : (e) => { e.stopPropagation(); setMenu(false); m.onClick?.(); }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-label-md transition-colors hover:bg-nx-container ${
                    m.danger ? "border-t border-nx-border/60 text-nx-danger" : "text-nx-on-surface"}`}
                >
                  <m.icon size={15} className={m.danger ? "text-nx-danger" : "text-nx-on-surface-variant"} /> {m.title}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ── Modal de exclusão (LGPD): exige digitar o nome, mesmo fluxo seguro do perfil ── */
function ExcluirModal({ paciente, onClose, onExcluido }: {
  paciente: Paciente; onClose: () => void; onExcluido: () => void;
}) {
  const [nome, setNome] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const confere = nome.trim().toLowerCase() === paciente.nome.trim().toLowerCase();

  async function confirmar() {
    if (!confere || excluindo) return;
    setExcluindo(true); setErro(null);
    try {
      await api.delete(`/pacientes/${paciente.id}`);
      onExcluido();
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? "Não foi possível excluir o paciente.");
      setExcluindo(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm md:items-center md:p-4" onClick={onClose}>
      <div className="w-full rounded-t-3xl border border-nx-border bg-nx-surface p-6 md:max-w-md md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-full bg-nx-danger/12"><AlertTriangle size={18} className="text-nx-danger" /></span>
            <h2 className="text-body-lg font-bold text-nx-on-surface">Excluir paciente</h2>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="text-nx-outline hover:text-nx-on-surface"><X size={20} /></button>
        </div>
        <p className="text-body-sm text-nx-on-surface-variant">
          Esta ação é <span className="font-semibold text-nx-danger">irreversível</span> (LGPD): os dados pessoais de <b className="text-nx-on-surface">{paciente.nome}</b> serão anonimizados e o acesso ao app removido.
        </p>
        <p className="mt-3 text-body-sm text-nx-on-surface-variant">Digite <b className="text-nx-on-surface">{paciente.nome}</b> para confirmar.</p>
        <input
          value={nome} onChange={(e) => setNome(e.target.value)} autoFocus
          placeholder={paciente.nome}
          onKeyDown={(e) => { if (e.key === "Enter") confirmar(); }}
          className="mt-2 w-full rounded-xl border border-nx-border bg-nx-container px-3 py-2.5 text-body-sm text-nx-on-surface placeholder:text-nx-on-surface-variant focus:border-nx-danger/60 focus:outline-none focus:ring-1 focus:ring-nx-danger/40"
        />
        {erro && <p className="mt-2 text-label-md text-nx-danger">{erro}</p>}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-nx-border py-2.5 text-label-md font-semibold text-nx-on-surface transition-colors hover:bg-nx-container">
            Cancelar
          </button>
          <button
            onClick={confirmar} disabled={!confere || excluindo}
            className="flex-1 rounded-xl bg-nx-danger py-2.5 text-label-md font-bold text-white transition-colors hover:brightness-110 disabled:opacity-40"
          >
            {excluindo ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NovoPacienteModal({ onClose, onCriado }: { onClose: () => void; onCriado: () => void }) {
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", objetivo: "", pesoMeta: "" });
  const [salvando, setSalvando] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function salvar() {
    if (!form.nome.trim()) return;
    setSalvando(true);
    try {
      await api.post("/pacientes", { ...form, dataInicio: new Date().toISOString() });
      onCriado();
    } catch {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div
        className="w-full md:max-w-md bg-nx-surface border border-nx-border rounded-t-3xl md:rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-body-lg font-bold">Novo paciente</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-nx-outline hover:text-nx-on-surface"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          {[
            { k: "nome", label: "Nome *", type: "text" },
            { k: "email", label: "E-mail", type: "email" },
            { k: "telefone", label: "Telefone", type: "text" },
            { k: "objetivo", label: "Objetivo", type: "text" },
            { k: "pesoMeta", label: "Peso meta (kg)", type: "number" },
          ].map((f) => (
            <input
              key={f.k}
              type={f.type}
              placeholder={f.label}
              value={(form as any)[f.k]}
              onChange={(e) => set(f.k, e.target.value)}
              className="w-full bg-nx-container border border-nx-border rounded-xl px-3 py-2.5 text-body-sm text-nx-on-surface placeholder:text-nx-on-surface-variant focus:outline-none focus:border-nx-evo/50 focus:ring-1 focus:ring-nx-evo/40 transition-colors"
            />
          ))}
        </div>
        <button
          onClick={salvar}
          disabled={salvando || !form.nome.trim()}
          className="w-full mt-5 bg-nx-evo hover:bg-nx-evo-2 disabled:opacity-40 text-nx-on-evo text-label-md font-bold py-3 rounded-xl transition-colors"
        >
          {salvando ? "Salvando..." : "Criar paciente"}
        </button>
      </div>
    </div>
  );
}
