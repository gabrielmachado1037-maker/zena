import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Search, Users, MessageCircle, BarChart3, Flame, X } from "lucide-react";
import api from "../lib/api";
import Avatar from "../components/Avatar";
import { progressoLiga, CORES_LIGA, ICONE_LIGA, diasDesde } from "../lib/ligas";

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

/* glass sem linhas brancas (border-subtle = rgba(124,58,237,.1)) */
const GLASS = "bg-nx-surface/80 backdrop-blur-md border border-nx-primary-container/10 rounded-2xl";

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

  return (
    <div className="flex min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="flex-1 min-w-0 px-5 md:px-8 py-6 md:py-8 pb-24 lg:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-headline-md">Pacientes</h1>
            <p className="text-body-sm text-nx-on-surface-variant mt-0.5">
              {loading ? "Carregando…" : `${pacientes.length} no total`}
            </p>
          </div>
          <button
            onClick={() => setNovoAberto(true)}
            className="flex items-center gap-2 bg-nx-primary-container hover:bg-[#8b46f5] text-nx-on-primary-container text-label-md font-bold px-4 py-2.5 rounded-xl transition-colors shadow-nx-glow"
          >
            <Plus size={16} /> Novo Paciente
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-nx-outline" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome..."
              className="w-full bg-nx-surface border border-nx-primary-container/10 rounded-xl pl-10 pr-3 py-2.5 text-body-sm text-nx-on-surface placeholder:text-nx-outline focus:outline-none focus:ring-1 focus:ring-nx-primary"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
            {(["todos", "ativo", "risco", "inativo"] as StatusFiltro[]).map((s) => (
              <Chip key={s} active={statusFiltro === s} onClick={() => setStatusFiltro(s)} danger={s === "risco"}>
                {s === "todos" ? "Todos" : s === "ativo" ? "Ativos" : s === "risco" ? "Em risco" : "Inativos"}
              </Chip>
            ))}
            <span className="w-px h-5 bg-nx-outline-variant mx-1 flex-shrink-0" />
            <Chip active={ligaFiltro === null} onClick={() => setLigaFiltro(null)}>Todas ligas</Chip>
            {LIGAS_FILTRO.map((l) => (
              <Chip key={l} active={ligaFiltro === l} onClick={() => setLigaFiltro(ligaFiltro === l ? null : l)}>
                {ICONE_LIGA[l]} {l}
              </Chip>
            ))}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-nx-container/60" />
            ))}
          </div>
        ) : erro ? (
          <div className={`${GLASS} p-10 text-center`}>
            <p className="text-nx-error mb-3">{erro}</p>
            <button onClick={carregar} className="text-nx-primary hover:underline text-label-md">Tentar de novo</button>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-nx-on-surface-variant">
            <Users size={32} className="mb-3 opacity-50" />
            <p className="text-body-sm">Nenhum paciente encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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

function Chip({ children, active, onClick, danger }: {
  children: React.ReactNode; active: boolean; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 text-label-md px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
        active
          ? danger ? "bg-nx-error text-[#690005]" : "bg-nx-primary-container text-nx-on-primary-container"
          : "bg-nx-surface text-nx-on-surface-variant hover:text-nx-on-surface border border-nx-primary-container/10"
      }`}
    >
      {children}
    </button>
  );
}

function PacienteCard({ p, i, navigate }: { p: Paciente; i: number; navigate: ReturnType<typeof useNavigate> }) {
  const { pct, faltam, proxima } = progressoLiga(p.pontosTotal);
  const cor = CORES_LIGA[p.ligaAtual] ?? "#A855F7";
  const dias = diasDesde(p.ultimoCheckin);
  const emRisco = dias !== null && dias > 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03, duration: 0.3 }}
      onClick={() => navigate(`/app/pacientes/${p.id}`)}
      className={`${GLASS} p-4 cursor-pointer hover:border-nx-primary/40 transition-colors`}
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar src={p.fotoPerfilUrl} nome={p.nome} tamanho={44} />
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-semibold truncate">{p.nome}</p>
          <p className="text-nx-on-surface-variant text-body-sm truncate">{p.objetivo || "Sem objetivo definido"}</p>
        </div>
        <span className="flex-shrink-0 text-label-sm font-bold px-2 py-1 rounded-lg" style={{ background: `${cor}22`, color: cor }}>
          {ICONE_LIGA[p.ligaAtual]} {p.ligaNivel}
        </span>
      </div>

      {/* Pontos + streak */}
      <div className="flex items-center justify-between mb-2 text-body-sm">
        <span className="font-medium">{p.pontosTotal} pts</span>
        {p.streakAtual > 0 && (
          <span className="text-nx-secondary flex items-center gap-1"><Flame size={12} /> {p.streakAtual} dias</span>
        )}
      </div>

      {/* Barra de progresso na liga */}
      <div className="h-1.5 rounded-full bg-nx-container-high overflow-hidden mb-1.5">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor, boxShadow: `0 0 8px ${cor}66` }} />
      </div>
      <p className="text-nx-outline text-label-sm mb-3">
        {proxima ? `Faltam ${faltam} pts para ${proxima.liga} ${proxima.nivel}` : "Liga máxima atingida 👑"}
      </p>

      {/* Último check-in + ações */}
      <div className="flex items-center justify-between pt-3 border-t border-nx-primary-container/10">
        <span className={`text-label-sm ${emRisco ? "text-nx-error" : "text-nx-on-surface-variant"}`}>
          {dias === null ? "Nunca registrou" : dias === 0 ? "Registrou hoje" : `${dias}d atrás`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/app/pacientes/${p.id}/diario?tab=mensagens`); }}
            className="p-1.5 rounded-lg text-nx-outline hover:text-nx-primary hover:bg-nx-surface-hover transition-colors"
            title="Enviar mensagem"
          >
            <MessageCircle size={15} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/app/pacientes/${p.id}/diario`); }}
            className="p-1.5 rounded-lg text-nx-outline hover:text-nx-primary hover:bg-nx-surface-hover transition-colors"
            title="Ver progresso"
          >
            <BarChart3 size={15} />
          </button>
        </div>
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
        className="w-full md:max-w-md bg-nx-surface border border-nx-primary-container/10 rounded-t-3xl md:rounded-2xl p-6"
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
              className="w-full bg-nx-container border border-nx-primary-container/10 rounded-xl px-3 py-2.5 text-body-sm text-nx-on-surface placeholder:text-nx-outline focus:outline-none focus:ring-1 focus:ring-nx-primary"
            />
          ))}
        </div>
        <button
          onClick={salvar}
          disabled={salvando || !form.nome.trim()}
          className="w-full mt-5 bg-nx-primary-container hover:bg-[#8b46f5] disabled:opacity-40 text-nx-on-primary-container text-label-md font-bold py-3 rounded-xl transition-colors"
        >
          {salvando ? "Salvando..." : "Criar paciente"}
        </button>
      </div>
    </div>
  );
}
