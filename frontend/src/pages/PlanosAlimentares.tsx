import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Plus, ChevronRight, Clock, AlertCircle } from "lucide-react";
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

const REFEICOES: { key: keyof Plano; label: string }[] = [
  { key: "cafeManha",   label: "Café" },
  { key: "almoco",      label: "Almoço" },
  { key: "jantar",      label: "Jantar" },
  { key: "lancheManha", label: "Lanche manhã" },
  { key: "lancheTarde", label: "Lanche tarde" },
  { key: "ceia",        label: "Ceia" },
];

// ─── Card do paciente ─────────────────────────────────────────────────────────

function PacienteCard({ p, onClick }: { p: PacienteComPlano; onClick: () => void }) {
  const temPlano = p.plano !== null;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 text-left hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
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
            <div className="mt-2">
              {/* Preview das refeições */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {REFEICOES.filter(r => p.plano![r.key as keyof Plano]).slice(0, 4).map(r => (
                  <span
                    key={r.key}
                    className="text-[10px] font-medium px-2 py-0.5 bg-[#F0F7F2] text-[#1C4A2E] rounded-full"
                  >
                    {r.label}
                  </span>
                ))}
                {REFEICOES.filter(r => p.plano![r.key as keyof Plano]).length > 4 && (
                  <span className="text-[10px] text-[#bbb]">
                    +{REFEICOES.filter(r => p.plano![r.key as keyof Plano]).length - 4}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[#bbb]">
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
  const [pacientes, setPacientes] = useState<PacienteComPlano[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busca, setBusca]         = useState("");
  const [filtro, setFiltro]       = useState<Filtro>("todos");

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ pacientes: PacienteComPlano[] }>(
        `/planos-alimentares?busca=${encodeURIComponent(busca)}&filtro=${filtro}`
      );
      setPacientes(res.data.pacientes);
    } finally {
      setLoading(false);
    }
  }, [busca, filtro]);

  useEffect(() => { fetch(); }, [fetch]);

  const comPlano    = pacientes.filter(p => p.plano).length;
  const semPlano    = pacientes.filter(p => !p.plano).length;

  const goToPaciente = (id: string) => navigate(`/app/pacientes/${id}`);

  return (
    <>
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
          onSelect={goToPaciente}
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
          onSelect={goToPaciente}
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
        <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
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
  onSelect: (id: string) => void;
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
           <PacienteCard key={p.id} p={p} onClick={() => onSelect(p.id)} />
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
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-[#111] tracking-tight">Planos alimentares</h1>
          <p className="text-[13px] text-[#999] mt-0.5">
            {comPlano} paciente{comPlano !== 1 ? "s" : ""} com plano · {semPlano} sem plano
          </p>
        </div>
      </div>

      {/* Stats bar */}
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
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : pacientes.length === 0 ? (
        <Empty filtro={filtro} />
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {pacientes.map(p => (
            <PacienteCard key={p.id} p={p} onClick={() => onSelect(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
