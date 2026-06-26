import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import api from "../lib/api";

interface Paciente {
  id: string;
  nome: string;
  objetivo: string;
  dataInicio: string;
  ativo: boolean;
  medicoes: Array<{ peso: number }>;
  consultas: Array<{ data: string }>;
}

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const COLORS = ["bg-zena-green-light", "bg-zena-green-mid", "bg-zena-brown", "bg-teal-500", "bg-emerald-600"];

function getColor(nome: string) {
  const i = nome.charCodeAt(0) % COLORS.length;
  return COLORS[i];
}

function mesesAcompanhamento(dataInicio: string) {
  const start = new Date(dataInicio);
  const now = new Date();
  const meses = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (meses < 1) return "Novo";
  return `${meses} ${meses === 1 ? "mês" : "meses"}`;
}

export default function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "ativo" | "inativo">("todos");
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/pacientes").then((res) => {
      setPacientes(res.data);
      setLoading(false);
    });
  }, []);

  const filtrados = pacientes.filter((p) => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
    const matchFiltro = filtro === "todos" || (filtro === "ativo" ? p.ativo : !p.ativo);
    return matchBusca && matchFiltro;
  });

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
        <div className="flex gap-2">
          {(["todos", "ativo", "inativo"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                filtro === f
                  ? "bg-zena-green-mid text-white"
                  : "bg-white text-zena-text-mid border border-zena-mint/40 hover:border-zena-green-light"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl p-6 h-24" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-20">
          <Users className="mx-auto text-zena-mint mb-4" size={48} />
          <p className="text-zena-text-mid font-medium">
            {busca ? "Nenhuma paciente encontrada." : "Cadastre sua primeira paciente e comece a acompanhar a evolução dela aqui."}
          </p>
          {!busca && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-zena-green-mid text-sm font-medium hover:underline"
            >
              Cadastrar agora →
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrados.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/pacientes/${p.id}`)}
              className="bg-white rounded-2xl p-5 border border-zena-mint/30 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-full ${getColor(p.nome)} flex items-center justify-center text-white font-bold`}>
                {getInitials(p.nome)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-zena-text-dark font-semibold">{p.nome}</p>
                  {!p.ativo && (
                    <span className="text-xs bg-zena-sand text-zena-text-light px-2 py-0.5 rounded-full">Inativa</span>
                  )}
                </div>
                <p className="text-zena-text-light text-sm truncate">{p.objetivo}</p>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1">
                <span className="text-xs text-zena-text-light bg-zena-cream px-3 py-1 rounded-full">
                  {mesesAcompanhamento(p.dataInicio)}
                </span>
                {p.medicoes[0] && (
                  <span className="text-xs text-zena-green-mid font-mono-data">{p.medicoes[0].peso} kg</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <NovaPacienteModal onClose={() => setShowModal(false)} onSave={(p) => { setPacientes([p, ...pacientes]); setShowModal(false); }} />}
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
