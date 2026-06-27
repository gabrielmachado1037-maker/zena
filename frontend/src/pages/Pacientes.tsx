import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users, MessageCircle, CalendarPlus } from "lucide-react";
import api from "../lib/api";

interface Paciente {
  id: string;
  nome: string;
  objetivo: string;
  dataInicio: string;
  telefone?: string | null;
  ativo: boolean;
  medicoes: Array<{ peso: number }>;
  ultimaConsulta: { data: string } | null;
  proximaConsulta: { data: string } | null;
  cobrancaStatus: "em_dia" | "pendente" | "vencido";
}

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const COLORS = ["bg-zena-green-light", "bg-zena-green-mid", "bg-zena-brown", "bg-teal-500", "bg-emerald-600"];
function getColor(nome: string) {
  return COLORS[nome.charCodeAt(0) % COLORS.length];
}

function isNovo(dataInicio: string) {
  return (Date.now() - new Date(dataInicio).getTime()) < 7 * 24 * 60 * 60 * 1000;
}

function diasDesde(data: string) {
  return Math.floor((Date.now() - new Date(data).getTime()) / (1000 * 60 * 60 * 24));
}

function diasAte(data: string) {
  return Math.ceil((new Date(data).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function tempoAtras(data: string): string {
  const d = diasDesde(data);
  if (d <= 0) return "hoje";
  if (d === 1) return "há 1 dia";
  if (d < 7) return `há ${d} dias`;
  if (d < 14) return "há 1 semana";
  if (d < 30) return `há ${Math.floor(d / 7)} semanas`;
  if (d < 60) return "há 1 mês";
  return `há ${Math.floor(d / 30)} meses`;
}

function tempoFuturo(data: string): string {
  const d = diasAte(data);
  if (d < 0) return "atrasado";
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  return `em ${d} dias`;
}

function waLink(telefone: string, nome: string) {
  const num = telefone.replace(/\D/g, "");
  const full = num.startsWith("55") ? num : `55${num}`;
  return `https://wa.me/${full}?text=Oi%20${encodeURIComponent(nome.split(" ")[0])}!%20Tudo%20bem%3F`;
}

type FiltroStatus = "todos" | "ativo" | "inativo";
type FiltroExtra = "sem_consulta" | "pendente" | null;

export default function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [filtroExtra, setFiltroExtra] = useState<FiltroExtra>(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/pacientes").then((res) => {
      setPacientes(res.data);
      setLoading(false);
    });
  }, []);

  const filtrados = pacientes.filter((p) => {
    if (!p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtro === "ativo" && !p.ativo) return false;
    if (filtro === "inativo" && p.ativo) return false;
    if (filtroExtra === "sem_consulta") {
      const semConsulta = !p.ultimaConsulta || diasDesde(p.ultimaConsulta.data) > 30;
      if (!semConsulta) return false;
    }
    if (filtroExtra === "pendente" && p.cobrancaStatus === "em_dia") return false;
    return true;
  });

  const cobrancaCfg = {
    em_dia: { label: "Em dia", cls: "bg-zena-green-light/20 text-zena-green-dark" },
    pendente: { label: "Pendente", cls: "bg-yellow-100 text-yellow-700" },
    vencido: { label: "Vencido", cls: "bg-red-100 text-red-600" },
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-zena-text-dark text-3xl font-bold">Pacientes</h1>
          <p className="text-zena-text-light text-sm mt-1">{pacientes.filter((p) => p.ativo).length} ativas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-zena-green-mid hover:bg-zena-green-dark text-white px-5 py-3 rounded-xl font-medium text-sm transition-all shadow-sm"
        >
          <Plus size={18} />
          Nova paciente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zena-text-light" />
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-zena-mint/40 rounded-xl text-sm text-zena-text-dark placeholder-zena-text-light focus:outline-none focus:ring-2 focus:ring-zena-green-light"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["todos", "ativo", "inativo"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                filtro === f ? "bg-zena-green-mid text-white" : "bg-white text-zena-text-mid border border-zena-mint/40 hover:border-zena-green-light"
              }`}
            >
              {f}
            </button>
          ))}
          <div className="w-px bg-zena-mint/40 self-stretch hidden sm:block" />
          {([
            { key: "sem_consulta", label: "Sem consulta +30d" },
            { key: "pendente", label: "Pagamento pendente" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltroExtra(filtroExtra === key ? null : key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filtroExtra === key
                  ? "bg-zena-brown/10 text-zena-brown border border-zena-brown/30"
                  : "bg-white text-zena-text-mid border border-zena-mint/40 hover:border-zena-brown/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl p-5 h-20" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-20">
          <Users className="mx-auto text-zena-mint mb-4" size={48} />
          <p className="text-zena-text-mid font-medium">
            {busca || filtroExtra ? "Nenhuma paciente encontrada com esse filtro." : "Cadastre sua primeira paciente e comece a acompanhar a evolução dela aqui."}
          </p>
          {!busca && !filtroExtra && (
            <button onClick={() => setShowModal(true)} className="mt-4 text-zena-green-mid text-sm font-medium hover:underline">
              Cadastrar agora →
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {filtrados.map((p) => {
            const novo = isNovo(p.dataInicio);
            const diasSemConsulta = p.ultimaConsulta ? diasDesde(p.ultimaConsulta.data) : null;
            const consultaAtrasada = diasSemConsulta !== null && diasSemConsulta > 30;
            const proximaAtrasada = p.proximaConsulta && diasAte(p.proximaConsulta.data) < 0;
            const cobranca = cobrancaCfg[p.cobrancaStatus];

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/app/pacientes/${p.id}`)}
                className="group bg-white rounded-2xl px-5 py-4 border border-zena-mint/30 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-4"
              >
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-full ${getColor(p.nome)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                  {getInitials(p.nome)}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-zena-text-dark font-semibold text-sm">{p.nome}</p>
                    {novo && <span className="text-[10px] font-bold bg-zena-green-light/20 text-zena-green-dark px-2 py-0.5 rounded-full">NOVO</span>}
                    {!p.ativo && <span className="text-[10px] bg-zena-sand text-zena-text-light px-2 py-0.5 rounded-full">Inativa</span>}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cobranca.cls}`}>{cobranca.label}</span>
                  </div>
                  <p className="text-zena-text-light text-xs truncate mt-0.5">{p.objetivo}</p>
                </div>

                {/* Consultas */}
                <div className="hidden md:flex flex-col items-end gap-1 text-xs min-w-[140px]">
                  {p.ultimaConsulta ? (
                    <span className={consultaAtrasada ? "text-orange-500 font-medium" : "text-zena-text-light"}>
                      ↩ {tempoAtras(p.ultimaConsulta.data)}
                    </span>
                  ) : (
                    <span className="text-zena-text-light/60">Sem consultas</span>
                  )}
                  {p.proximaConsulta ? (
                    <span className={proximaAtrasada ? "text-red-500 font-medium" : "text-zena-green-mid font-medium"}>
                      ↻ {tempoFuturo(p.proximaConsulta.data)}
                    </span>
                  ) : null}
                </div>

                {/* Peso */}
                {p.medicoes[0] && (
                  <span className="hidden lg:block text-xs text-zena-text-mid font-mono-data flex-shrink-0">
                    {p.medicoes[0].peso} kg
                  </span>
                )}

                {/* Ações hover */}
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {p.telefone && (
                    <a
                      href={waLink(p.telefone, p.nome)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <MessageCircle size={15} />
                    </a>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/app/pacientes/${p.id}`); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-zena-green-light/20 text-zena-green-dark hover:bg-zena-green-light/40 transition-colors"
                    title="Agendar consulta"
                  >
                    <CalendarPlus size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <NovaPacienteModal
          onClose={() => setShowModal(false)}
          onSave={(p) => {
            setPacientes([{ ...p, ultimaConsulta: null, proximaConsulta: null, cobrancaStatus: "em_dia" }, ...pacientes]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function NovaPacienteModal({ onClose, onSave }: { onClose: () => void; onSave: (p: any) => void }) {
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", objetivo: "", dataInicio: new Date().toISOString().split("T")[0], pesoMeta: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/pacientes", form);
      onSave(res.data);
    } catch {
      setError("Erro ao cadastrar paciente.");
      setLoading(false);
    }
  }

  const field = (label: string, key: keyof typeof form, type = "text", placeholder = "") => (
    <div>
      <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-zena-mint/50 bg-zena-cream text-zena-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-zena-text-dark text-xl font-bold mb-6">Nova paciente</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {field("Nome completo *", "nome", "text", "Maria Clara Santos")}
          {field("Objetivo *", "objetivo", "text", "Emagrecimento e saúde")}
          {field("E-mail", "email", "email", "maria@email.com")}
          {field("Telefone (WhatsApp)", "telefone", "tel", "(11) 99999-0001")}
          {field("Data de início *", "dataInicio", "date")}
          {field("Peso meta (kg)", "pesoMeta", "number", "62")}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zena-mint/50 text-zena-text-mid text-sm hover:bg-zena-cream">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.nome || !form.objetivo} className="flex-1 py-2.5 rounded-xl bg-zena-green-mid text-white text-sm font-medium disabled:opacity-50">
              {loading ? "Salvando..." : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
