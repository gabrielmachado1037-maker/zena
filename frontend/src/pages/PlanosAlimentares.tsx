import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, ChevronRight, Clock, AlertCircle, X, ExternalLink } from "lucide-react";
import api from "../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plano {
  id: string;
  dataCriacao: string;
  cafeManha: string;
  lancheManha: string | null;
  almoco: string;
  lancheTarde: string | null;
  jantar: string;
  ceia: string | null;
  observacoes: string | null;
}

interface PacienteComPlano {
  id: string;
  nome: string;
  objetivo: string;
  plano: Plano | null;
}

type Filtro = "todos" | "com_plano" | "sem_plano";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function dataRelativa(iso: string) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "ontem";
  if (diff < 30) return `há ${diff} dias`;
  const m = Math.floor(diff / 30);
  return `há ${m} mês${m > 1 ? "es" : ""}`;
}

const REFEICOES: { key: keyof Plano; label: string; emoji: string }[] = [
  { key: "cafeManha",   label: "Café da manhã",  emoji: "☀️" },
  { key: "lancheManha", label: "Lanche da manhã", emoji: "🍎" },
  { key: "almoco",      label: "Almoço",          emoji: "🍽️" },
  { key: "lancheTarde", label: "Lanche da tarde", emoji: "🥪" },
  { key: "jantar",      label: "Jantar",          emoji: "🌙" },
  { key: "ceia",        label: "Ceia",            emoji: "🫖" },
];

// ─── Modal plano completo ─────────────────────────────────────────────────────

function PlanoModal({ p, onClose, onEditar }: {
  p: PacienteComPlano;
  onClose: () => void;
  onEditar: () => void;
}) {
  const plano = p.plano!;
  const refeicoes = REFEICOES.filter(r => plano[r.key]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full md:w-[480px] max-h-[90vh] rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#F0F0EE]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1C4A2E] flex items-center justify-center text-white text-[12px] font-bold">
              {getInitials(p.nome)}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#111]">{p.nome}</p>
              <p className="text-[11px] text-[#999]">
                Atualizado {dataRelativa(plano.dataCriacao)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEditar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0F7F2] text-[#1C4A2E] text-[12px] font-medium hover:bg-[#E0F0E8] transition-colors"
            >
              <ExternalLink size={12} />
              Editar
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F5F5F3] flex items-center justify-center text-[#999] hover:text-[#333] transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Refeições */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {refeicoes.map(r => (
            <div key={r.key}>
              <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-1.5">
                {r.emoji} {r.label}
              </p>
              <p className="text-[13.5px] text-[#222] leading-relaxed whitespace-pre-wrap">
                {plano[r.key] as string}
              </p>
            </div>
          ))}
          {plano.observacoes && (
            <div>
              <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-1.5">
                📝 Observações
              </p>
              <p className="text-[13px] text-[#666] leading-relaxed whitespace-pre-wrap">
                {plano.observacoes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Card do paciente ─────────────────────────────────────────────────────────

function PacienteCard({ p, onClick }: { p: PacienteComPlano; onClick: () => void }) {
  const temPlano = p.plano !== null;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 text-left hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0 ${
          temPlano ? "bg-[#1C4A2E]" : "bg-[#D1D5DB]"
        }`}>
          {getInitials(p.nome)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] font-semibold text-[#111] truncate">{p.nome}</p>
            <ChevronRight size={14} className="text-[#ccc] flex-shrink-0" />
          </div>
          <p className="text-[11px] text-[#999] truncate mt-0.5">{p.objetivo}</p>

          {temPlano ? (
            <div className="mt-2 space-y-1.5">
              {/* Café da manhã — primeiro item visível */}
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-[#999] flex-shrink-0 mt-0.5">☀️ Café</span>
                <p className="text-[12px] text-[#444] line-clamp-1 flex-1">{p.plano!.cafeManha}</p>
              </div>
              {/* Almoço */}
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-[#999] flex-shrink-0 mt-0.5">🍽️ Almoço</span>
                <p className="text-[12px] text-[#444] line-clamp-1 flex-1">{p.plano!.almoco}</p>
              </div>
              {/* Jantar */}
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-[#999] flex-shrink-0 mt-0.5">🌙 Jantar</span>
                <p className="text-[12px] text-[#444] line-clamp-1 flex-1">{p.plano!.jantar}</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[#bbb] pt-0.5">
                <Clock size={9} />
                Atualizado {dataRelativa(p.plano!.dataCriacao)}
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5">
              <AlertCircle size={11} className="text-[#F59E0B]" />
              <span className="text-[11px] text-[#F59E0B] font-medium">Sem plano alimentar</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function PlanosAlimentares() {
  const navigate = useNavigate();
  const [pacientes, setPacientes]   = useState<PacienteComPlano[]>([]);
  const [loading, setLoading]       = useState(true);
  const [busca, setBusca]           = useState("");
  const [filtro, setFiltro]         = useState<Filtro>("todos");
  const [selected, setSelected]     = useState<PacienteComPlano | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ pacientes: PacienteComPlano[] }>(
        `/planos-alimentares?busca=${encodeURIComponent(busca)}&filtro=${filtro}`
      );
      setPacientes(Array.isArray(res.data?.pacientes) ? res.data.pacientes : []);
    } catch {
      setPacientes([]);
    } finally {
      setLoading(false);
    }
  }, [busca, filtro]);

  useEffect(() => { load(); }, [load]);

  const comPlano = pacientes.filter(p => p.plano).length;
  const semPlano = pacientes.filter(p => !p.plano).length;

  const handleCard = (p: PacienteComPlano) => {
    if (p.plano) setSelected(p);
    else navigate(`/app/pacientes/${p.id}`);
  };

  return (
    <>
      {selected && (
        <PlanoModal
          p={selected}
          onClose={() => setSelected(null)}
          onEditar={() => { setSelected(null); navigate(`/app/pacientes/${selected.id}`); }}
        />
      )}

      {/* ── MOBILE ── */}
      <div className="md:hidden min-h-screen bg-[#F8F8F6] pb-24">
        <MobilePlanos
          pacientes={pacientes}
          loading={loading}
          busca={busca}
          setBusca={setBusca}
          filtro={filtro}
          setFiltro={setFiltro}
          comPlano={comPlano}
          semPlano={semPlano}
          onSelect={handleCard}
        />
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block bg-[#F8F8F6] min-h-screen p-8">
        <DesktopPlanos
          pacientes={pacientes}
          loading={loading}
          busca={busca}
          setBusca={setBusca}
          filtro={filtro}
          setFiltro={setFiltro}
          comPlano={comPlano}
          semPlano={semPlano}
          onSelect={handleCard}
        />
      </div>
    </>
  );
}

// ─── Filtro bar ───────────────────────────────────────────────────────────────

function FiltroBar({
  filtro, setFiltro, comPlano, semPlano, total,
}: {
  filtro: Filtro;
  setFiltro: (f: Filtro) => void;
  comPlano: number;
  semPlano: number;
  total: number;
}) {
  const items: { key: Filtro; label: string; count: number }[] = [
    { key: "todos",     label: "Todos",      count: total },
    { key: "com_plano", label: "Com plano",  count: comPlano },
    { key: "sem_plano", label: "Sem plano",  count: semPlano },
  ];
  return (
    <div className="flex gap-2">
      {items.map(({ key, label, count }) => (
        <button
          key={key}
          onClick={() => setFiltro(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
            filtro === key
              ? "bg-[#1C4A2E] text-white"
              : "bg-white text-[#666] border border-[#E8E8E8]"
          }`}
        >
          {label}
          <span className={`text-[10px] font-bold ${filtro === key ? "text-white/70" : "text-[#bbb]"}`}>
            {count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

// ─── Empty ────────────────────────────────────────────────────────────────────

function Empty({ filtro }: { filtro: Filtro }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <FileText size={36} className="text-[#E0E0DE] mb-3" />
      <p className="text-[14px] font-medium text-[#999]">
        {filtro === "sem_plano" ? "Todos os pacientes têm plano!" :
         filtro === "com_plano" ? "Nenhum paciente tem plano ainda." :
         "Nenhum paciente encontrado."}
      </p>
    </div>
  );
}

// ─── Mobile ───────────────────────────────────────────────────────────────────

function MobilePlanos({
  pacientes, loading, busca, setBusca, filtro, setFiltro,
  comPlano, semPlano, onSelect,
}: {
  pacientes: PacienteComPlano[];
  loading: boolean;
  busca: string;
  setBusca: (v: string) => void;
  filtro: Filtro;
  setFiltro: (f: Filtro) => void;
  comPlano: number;
  semPlano: number;
  onSelect: (p: PacienteComPlano) => void;
}) {
  return (
    <div>
      <div className="px-5 pt-10 pb-4">
        <h1 className="text-[26px] font-semibold text-[#111] tracking-tight">Planos</h1>
        <p className="text-[13px] text-[#999] mt-0.5">{comPlano} com plano · {semPlano} sem plano</p>
      </div>

      <div className="px-5 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar paciente…"
            className="w-full pl-8 pr-3 py-2.5 bg-white border border-[#E8E8E8] rounded-xl text-[13px] text-[#333] placeholder-[#bbb] focus:outline-none"
          />
        </div>
      </div>

      <div className="px-5 mb-5">
        <FiltroBar filtro={filtro} setFiltro={setFiltro} comPlano={comPlano} semPlano={semPlano} total={pacientes.length} />
      </div>

      <div className="px-5 space-y-3">
        {loading ? <Skeleton /> :
         pacientes.length === 0 ? <Empty filtro={filtro} /> :
         pacientes.map(p => (
           <PacienteCard key={p.id} p={p} onClick={() => onSelect(p)} />
         ))}
      </div>
    </div>
  );
}

// ─── Desktop ──────────────────────────────────────────────────────────────────

function DesktopPlanos({
  pacientes, loading, busca, setBusca, filtro, setFiltro,
  comPlano, semPlano, onSelect,
}: {
  pacientes: PacienteComPlano[];
  loading: boolean;
  busca: string;
  setBusca: (v: string) => void;
  filtro: Filtro;
  setFiltro: (f: Filtro) => void;
  comPlano: number;
  semPlano: number;
  onSelect: (p: PacienteComPlano) => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-[#111] tracking-tight">Planos alimentares</h1>
          <p className="text-[13px] text-[#999] mt-0.5">
            {comPlano} paciente{comPlano !== 1 ? "s" : ""} com plano · {semPlano} sem plano
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total de pacientes", value: pacientes.length, color: "#1C4A2E" },
          { label: "Com plano",          value: comPlano,         color: "#4CAF82" },
          { label: "Precisam de plano",  value: semPlano,         color: "#F59E0B" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
            <p className="text-[28px] font-light tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[12px] text-[#999] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <FiltroBar filtro={filtro} setFiltro={setFiltro} comPlano={comPlano} semPlano={semPlano} total={pacientes.length} />
        <div className="relative w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar paciente…"
            className="w-full pl-8 pr-3 py-2 bg-white border border-[#E8E8E8] rounded-xl text-[13px] placeholder-[#bbb] focus:outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : pacientes.length === 0 ? (
        <Empty filtro={filtro} />
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {pacientes.map(p => (
            <PacienteCard key={p.id} p={p} onClick={() => onSelect(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
