import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Plus, Search, Users, MessageCircle, ClipboardList, Award,
  CalendarPlus, ArrowUpRight, Flame, Clock, X,
} from "lucide-react";
import api from "../lib/api";
import Avatar from "../components/Avatar";
import { LeagueCrest } from "../components/ui-nx";
import { progressoLiga, diasDesde } from "../lib/ligas";

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
}

const LIGAS_FILTRO = ["Bronze", "Prata", "Ouro", "Diamante", "Mestre", "Lendário"];
type StatusFiltro = "todos" | "ativo" | "risco" | "inativo";

/* Cor de progresso por liga — acompanha o brasão (mesma paleta do LeagueCrest). */
const LIGA_COR: Record<string, string> = {
  Bronze: "#C77B3C",
  Prata: "#C2C9D2",
  Ouro: "#F8C84B",
  Diamante: "#8FE3FF",
  Mestre: "#A855F7",
  "Lendário": "#F8C84B",
};
const corLiga = (l: string) => LIGA_COR[l] ?? "#7CFF5B";
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
              className="w-full bg-nx-surface border border-nx-border rounded-nx-md pl-11 pr-3 py-3 text-body-sm text-nx-on-surface placeholder:text-nx-outline focus:outline-none focus:border-nx-evo/50 focus:ring-1 focus:ring-nx-evo/40 transition-colors"
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-nx-surface/70" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtrados.map((p, i) => (
              <PacienteCard key={p.id} p={p} i={i} navigate={navigate} />
            ))}
          </div>
        )}

        {novoAberto && <NovoPacienteModal onClose={() => setNovoAberto(false)} onCriado={() => { setNovoAberto(false); carregar(); }} />}
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

/* ── Chip de status ── */
function StatusChip({ label, cor }: { label: string; cor: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm font-semibold"
      style={{ background: `${cor}1a`, color: cor, border: `1px solid ${cor}33` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: cor, boxShadow: `0 0 6px ${cor}` }} />
      {label}
    </span>
  );
}

/* ── Card do paciente = "personagem em evolução" ── */
function PacienteCard({ p, i, navigate }: { p: Paciente; i: number; navigate: ReturnType<typeof useNavigate> }) {
  const reduce = useReducedMotion();
  const { pct, faltam, proxima } = progressoLiga(p.pontosTotal);
  const cor = corLiga(p.ligaAtual);
  const dias = diasDesde(p.ultimoCheckin);
  const emRisco = p.diasInativo >= 3 || dias === null || dias > 2;
  const status = statusDe(p);
  const perto = proxima != null && pct >= 85;

  const go = (to: string) => (e: React.MouseEvent) => { e.stopPropagation(); navigate(to); };
  const acoes = [
    { icon: ArrowUpRight, title: "Abrir paciente", to: `/app/pacientes/${p.id}` },
    { icon: MessageCircle, title: "Enviar mensagem", to: `/app/pacientes/${p.id}/diario?tab=mensagens` },
    { icon: ClipboardList, title: "Ver registros", to: `/app/pacientes/${p.id}/diario` },
    { icon: Award, title: "Criar desafio", to: `/app/desafios` },
    { icon: CalendarPlus, title: "Agendar retorno", to: `/app/mensagens` },
  ];

  return (
    <motion.div
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : i * 0.035, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduce ? undefined : { y: -4, boxShadow: `0 20px 54px -20px ${cor}40`, transition: { duration: 0.18 } }}
      onClick={() => navigate(`/app/pacientes/${p.id}`)}
      className="group relative cursor-pointer rounded-2xl bg-nx-surface border border-nx-border p-5 transition-colors duration-[180ms] hover:border-nx-outline"
    >
      {/* Identidade + brasão */}
      <div className="flex items-start gap-3.5">
        <div className="shrink-0 rounded-full p-[2px]" style={{ boxShadow: `0 0 0 1.5px ${cor}66` }}>
          <Avatar src={p.fotoPerfilUrl} nome={p.nome} tamanho={46} className="rounded-full" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-[17px] font-bold leading-tight text-nx-on-surface">{p.nome}</p>
          <p className="mt-1 truncate text-body-sm text-nx-on-surface-variant">{p.objetivo || "Sem objetivo definido"}</p>
          <div className="mt-2.5"><StatusChip label={status.label} cor={status.cor} /></div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <LeagueCrest liga={p.ligaAtual} size={54} animated={false} />
          <span className="text-label-sm font-bold leading-none" style={{ color: cor }}>{p.ligaAtual} {p.ligaNivel}</span>
        </div>
      </div>

      {/* XP + progresso na liga */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] font-extrabold leading-none tracking-tight tabular-nums text-nx-on-surface">{nf(p.pontosTotal)}</span>
            <span className="text-label-md font-semibold text-nx-outline">XP</span>
          </div>
          <span className="text-label-md font-semibold tabular-nums" style={{ color: cor }}>{pct}%</span>
        </div>

        <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-nx-container-high">
          <motion.div
            className="h-full rounded-full"
            style={{ background: cor, boxShadow: `0 0 12px ${cor}80, 0 0 3px ${cor}` }}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: reduce ? 0 : 0.9, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : 0.15 }}
          />
        </div>

        <p
          className="mt-2.5 text-label-sm"
          style={perto ? { color: cor, fontWeight: 600 } : { color: "#6B7280" }}
        >
          {proxima ? `${perto ? "Quase lá — faltam" : "Faltam"} ${nf(faltam)} pts para ${proxima.liga} ${proxima.nivel}` : "Liga máxima atingida 👑"}
        </p>
      </div>

      {/* Último check-in + sequência */}
      <div className="mt-4 flex items-center justify-between border-t border-nx-border pt-3.5">
        <span className={`flex items-center gap-1.5 text-label-md ${emRisco ? "text-nx-danger" : "text-nx-on-surface-variant"}`}>
          <Clock size={13} />
          {dias === null ? "Nunca registrou" : dias === 0 ? "Registrou hoje" : dias === 1 ? "Ontem" : `${dias} dias atrás`}
        </span>
        {p.streakAtual > 0 && (
          <span className="flex items-center gap-1 text-label-md font-semibold text-nx-streak">
            <Flame size={13} /> {p.streakAtual} dias
          </span>
        )}
      </div>

      {/* Ações rápidas — reveladas no hover (desktop); sempre visíveis no toque (mobile) */}
      <div className="grid grid-cols-5 gap-2 overflow-hidden transition-all duration-[180ms] ease-out mt-3 max-h-14 opacity-100 md:mt-0 md:max-h-0 md:opacity-0 md:group-hover:mt-3 md:group-hover:max-h-14 md:group-hover:opacity-100">
        {acoes.map((a) => (
          <button
            key={a.title}
            onClick={go(a.to)}
            title={a.title}
            aria-label={a.title}
            className="grid h-9 place-items-center rounded-xl border border-nx-border bg-nx-container-high text-nx-on-surface-variant transition-colors duration-150 hover:bg-nx-surface-hover hover:text-nx-on-surface"
          >
            <a.icon size={16} />
          </button>
        ))}
      </div>
    </motion.div>
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
              className="w-full bg-nx-container border border-nx-border rounded-xl px-3 py-2.5 text-body-sm text-nx-on-surface placeholder:text-nx-outline focus:outline-none focus:border-nx-evo/50 focus:ring-1 focus:ring-nx-evo/40 transition-colors"
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
