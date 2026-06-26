import { useEffect, useState, useRef, type ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Copy, TrendingDown, TrendingUp, Minus, MessageCircle, Camera, Upload, ClipboardList } from "lucide-react";
import PdfPlano from "../components/PdfPlano";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import api from "../lib/api";
import { Toast, useToast } from "../components/Toast";
import WhatsAppModal from "../components/WhatsAppModal";
import FotoSlider from "../components/FotoSlider";
import { comprimirImagem, calcularStreak } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { type TemplateWhatsApp } from "../lib/utils";

interface CheckInItem {
  id: string;
  semana: number;
  ano: number;
  humor: number;
  adesao: number;
  peso?: number;
  foto?: string;
  nota?: string;
  criadoEm: string;
}

interface MensagemItem {
  id: string;
  template: string;
  textoEnviado: string;
  criadoEm: string;
}

interface AnamneseItem {
  queixaPrincipal?: string;
  historicoDieta?: string;
  restricoes?: string;
  medicamentos?: string;
  condicoesSaude?: string;
  nivelAtividade?: string;
  horasSono?: number;
  nivelEstresse?: number;
  refeicoesDia?: number;
  comeCozinha?: boolean;
  comeForaCasa?: number;
  consumoAgua?: number;
  motivacao?: string;
  expectativas?: string;
}

interface Paciente {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  objetivo: string;
  dataInicio: string;
  ativo: boolean;
  pesoMeta: number | null;
  fotoInicial?: string;
  linkUnico: string;
  medicoes: Array<{ id: string; data: string; peso: number; gordura?: number; musculo?: number; cintura?: number; quadril?: number; observacoes?: string }>;
  consultas: Array<{ id: string; data: string; status: string; notas?: string }>;
  cobrancas: Array<{ id: string; valor: number; vencimento: string; status: string; metodo?: string }>;
  planosAlimentares: Array<{ id: string; dataCriacao: string; cafeManha: string; lancheManha?: string; almoco: string; lancheTarde?: string; jantar: string; ceia?: string; observacoes?: string }>;
  checkIns: CheckInItem[];
  mensagens: MensagemItem[];
  anamnese?: AnamneseItem | null;
}

const humoresMap: Record<number, string> = { 1: "😔", 2: "😕", 3: "😐", 4: "🙂", 5: "😊" };
const humoresLabel: Record<number, string> = { 1: "Difícil", 2: "Mais ou menos", 3: "Ok", 4: "Bem", 5: "Ótimo!" };
const templateLabel: Record<string, string> = {
  lembrete_consulta: "📅 Lembrete de consulta",
  envio_plano: "🥗 Plano alimentar enviado",
  lembrete_checkin: "✨ Lembrete de check-in",
  lembrete_cobranca: "💚 Lembrete de cobrança",
};

const tabs = ["Evolução", "Plano Alimentar", "Consultas", "Cobranças", "Check-ins", "Comunicação", "Anamnese"] as const;
type Tab = typeof tabs[number];

export default function PacienteDetalhe() {
  const { nutricionista } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Evolução");
  const [waTemplate, setWaTemplate] = useState<TemplateWhatsApp | null>(null);
  const { toast, show, hide } = useToast();

  useEffect(() => {
    api.get(`/pacientes/${id}`).then((res) => {
      setPaciente(res.data);
      setLoading(false);
    });
  }, [id]);

  function copiarLink() {
    const url = `${window.location.origin}/p/${paciente!.linkUnico}`;
    navigator.clipboard.writeText(url);
    show("Link copiado para a área de transferência!");
  }

  if (loading) return <div className="p-8 animate-pulse"><div className="h-8 bg-zena-mint/40 rounded w-48 mb-4" /><div className="h-4 bg-zena-mint/20 rounded w-32" /></div>;
  if (!paciente) return <div className="p-8 text-zena-text-light">Paciente não encontrada.</div>;

  const medicoes = [...paciente.medicoes].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  const pesoInicial = medicoes[0]?.peso;
  const pesoAtual = medicoes[medicoes.length - 1]?.peso;
  const diff = pesoAtual && pesoInicial ? pesoAtual - pesoInicial : null;

  const streak = calcularStreak(paciente.checkIns);

  return (
    <div className="p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      {waTemplate && nutricionista && (
        <WhatsAppModal
          context={{
            pacienteId: paciente.id,
            pacienteNome: paciente.nome,
            pacienteTelefone: paciente.telefone,
            pacienteLinkUnico: paciente.linkUnico,
            nutricionistaNome: nutricionista.nome,
          }}
          template={waTemplate}
          onClose={() => setWaTemplate(null)}
        />
      )}

      <button onClick={() => navigate("/pacientes")} className="flex items-center gap-2 text-zena-text-light hover:text-zena-text-mid text-sm mb-6 transition-colors">
        <ArrowLeft size={16} />
        Voltar para pacientes
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-zena-green-light flex items-center justify-center text-white font-bold text-xl">
                {paciente.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
              </div>
              {streak > 0 && (
                <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  🔥{streak}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-zena-text-dark text-2xl font-bold">{paciente.nome}</h1>
              <p className="text-zena-text-light text-sm">{paciente.objetivo}</p>
              <p className="text-zena-text-light text-xs mt-0.5">
                Desde {format(new Date(paciente.dataInicio), "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setWaTemplate("lembrete_checkin")}
              className="flex items-center gap-1.5 text-[#25D366] border border-[#25D366]/30 px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#25D366]/5 transition-all"
              title="WhatsApp"
            >
              <MessageCircle size={15} />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={copiarLink}
              className="flex items-center gap-2 text-zena-green-mid border border-zena-green-light/40 px-3 py-2 rounded-xl text-sm font-medium hover:bg-zena-mint/20 transition-all"
            >
              <Copy size={14} />
              <span className="hidden sm:inline">Link</span>
            </button>
          </div>
        </div>

        {/* Métricas rápidas */}
        {medicoes.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zena-cream">
            <div>
              <p className="text-zena-text-light text-xs">Peso inicial</p>
              <p className="text-zena-text-dark font-bold font-mono-data">{pesoInicial} kg</p>
            </div>
            <div>
              <p className="text-zena-text-light text-xs">Peso atual</p>
              <p className="text-zena-text-dark font-bold font-mono-data">{pesoAtual} kg</p>
            </div>
            {paciente.pesoMeta && (
              <div>
                <p className="text-zena-text-light text-xs">Meta</p>
                <p className="text-zena-text-dark font-bold font-mono-data">{paciente.pesoMeta} kg</p>
              </div>
            )}
            {diff !== null && (
              <div>
                <p className="text-zena-text-light text-xs">Variação</p>
                <div className="flex items-center gap-1">
                  {diff < 0 ? <TrendingDown size={14} className="text-zena-green-light" /> : diff > 0 ? <TrendingUp size={14} className="text-zena-brown" /> : <Minus size={14} className="text-zena-text-light" />}
                  <p className={`font-bold font-mono-data ${diff < 0 ? "text-zena-green-light" : diff > 0 ? "text-zena-brown" : "text-zena-text-light"}`}>
                    {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs — scroll horizontal em mobile */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 bg-white border border-zena-mint/30 rounded-xl p-1 mb-6 shadow-sm min-w-max">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t ? "bg-zena-green-mid text-white shadow-sm" : "text-zena-text-mid hover:text-zena-text-dark"
              }`}
            >
              {t}
              {t === "Check-ins" && streak > 0 && (
                <span className="ml-1.5 text-orange-500">🔥{streak}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "Evolução" && <AbaEvolucao paciente={paciente} setPaciente={setPaciente} medicoes={medicoes} show={show} />}
      {tab === "Plano Alimentar" && <AbaPlanoAlimentar paciente={paciente} setPaciente={setPaciente} show={show} nutricionistaNome={nutricionista?.nome || ""} />}
      {tab === "Consultas" && <AbaConsultas paciente={paciente} setPaciente={setPaciente} show={show} />}
      {tab === "Cobranças" && <AbaCobranças paciente={paciente} setPaciente={setPaciente} show={show} />}
      {tab === "Check-ins" && <AbaCheckIns paciente={paciente} setPaciente={setPaciente} show={show} />}
      {tab === "Comunicação" && <AbaComunicacao paciente={paciente} setPaciente={setPaciente} show={show} nutricionista={nutricionista} />}
      {tab === "Anamnese" && <AbaAnamnese paciente={paciente} show={show} />}
    </div>
  );
}

function AbaEvolucao({ paciente, setPaciente, medicoes, show }: { paciente: Paciente; setPaciente: any; medicoes: any[]; show: any }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ data: new Date().toISOString().split("T")[0], peso: "", gordura: "", musculo: "", cintura: "", quadril: "", observacoes: "" });
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(`/pacientes/${paciente.id}/medicoes`, form);
      setPaciente((p: Paciente) => ({ ...p, medicoes: [...p.medicoes, res.data] }));
      setShowForm(false);
      show("Medição registrada!");
    } catch {
      show("Erro ao salvar.", "error");
    } finally {
      setLoading(false);
    }
  }

  const chartData = medicoes.map((m) => ({
    data: format(new Date(m.data), "dd/MM"),
    peso: m.peso,
    gordura: m.gordura,
  }));

  return (
    <div className="space-y-6">
      {medicoes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-zena-mint/30">
          <p className="text-zena-text-light mb-4">Nenhuma medição registrada ainda.</p>
          <button onClick={() => setShowForm(true)} className="bg-zena-green-mid text-white px-5 py-2.5 rounded-xl text-sm font-medium">
            Registrar primeira medição
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zena-text-dark font-semibold">Evolução do peso</h3>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm text-zena-green-mid font-medium hover:text-zena-green-dark">
                <Plus size={16} />
                Nova medição
              </button>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#B7E4C7" />
                <XAxis dataKey="data" tick={{ fontSize: 11, fill: "#8FA897" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8FA897" }} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #B7E4C7", fontSize: 12 }} />
                <Line type="monotone" dataKey="peso" stroke="#2D6A4F" strokeWidth={2.5} dot={{ fill: "#52B788", r: 4 }} name="Peso (kg)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
            <h3 className="text-zena-text-dark font-semibold mb-4">Histórico de medições</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zena-text-light text-left">
                    <th className="pb-3 font-medium">Data</th>
                    <th className="pb-3 font-medium">Peso</th>
                    <th className="pb-3 font-medium">% Gordura</th>
                    <th className="pb-3 font-medium">% Músculo</th>
                    <th className="pb-3 font-medium">Obs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zena-cream">
                  {[...medicoes].reverse().map((m) => (
                    <tr key={m.id} className="text-zena-text-dark">
                      <td className="py-3 text-zena-text-light text-xs">{format(new Date(m.data), "dd/MM/yyyy")}</td>
                      <td className="py-3 font-mono-data font-semibold">{m.peso} kg</td>
                      <td className="py-3 text-zena-text-mid">{m.gordura ? `${m.gordura}%` : "—"}</td>
                      <td className="py-3 text-zena-text-mid">{m.musculo ? `${m.musculo}%` : "—"}</td>
                      <td className="py-3 text-zena-text-light text-xs max-w-xs truncate">{m.observacoes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-zena-text-dark text-xl font-bold mb-6">Nova medição</h2>
            <form onSubmit={salvar} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Data", "data", "date"],
                  ["Peso (kg) *", "peso", "number"],
                  ["% Gordura", "gordura", "number"],
                  ["% Músculo", "musculo", "number"],
                  ["Cintura (cm)", "cintura", "number"],
                  ["Quadril (cm)", "quadril", "number"],
                ].map(([label, key, type]) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-zena-text-mid mb-1 block">{label}</label>
                    <input
                      type={type}
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      step="0.1"
                      className="w-full px-3 py-2 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-zena-text-mid mb-1 block">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-zena-mint/50 text-zena-text-mid text-sm">Cancelar</button>
                <button type="submit" disabled={loading || !form.peso} className="flex-1 py-2.5 rounded-xl bg-zena-green-mid text-white text-sm font-medium disabled:opacity-50">{loading ? "Salvando..." : "Registrar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AbaPlanoAlimentar({ paciente, setPaciente, show, nutricionistaNome }: { paciente: Paciente; setPaciente: any; show: any; nutricionistaNome: string }) {
  const [editing, setEditing] = useState(false);
  const plano = paciente.planosAlimentares[0];
  const [form, setForm] = useState({
    cafeManha: plano?.cafeManha || "",
    lancheManha: plano?.lancheManha || "",
    almoco: plano?.almoco || "",
    lancheTarde: plano?.lancheTarde || "",
    jantar: plano?.jantar || "",
    ceia: plano?.ceia || "",
    observacoes: plano?.observacoes || "",
  });
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(`/pacientes/${paciente.id}/planos`, form);
      setPaciente((p: Paciente) => ({ ...p, planosAlimentares: [res.data, ...p.planosAlimentares] }));
      setEditing(false);
      show("Plano salvo!");
    } catch {
      show("Erro ao salvar.", "error");
    } finally {
      setLoading(false);
    }
  }

  const refeicoes = [
    { label: "Café da manhã", key: "cafeManha", emoji: "☀️" },
    { label: "Lanche da manhã", key: "lancheManha", emoji: "🍎" },
    { label: "Almoço", key: "almoco", emoji: "🥗" },
    { label: "Lanche da tarde", key: "lancheTarde", emoji: "🥤" },
    { label: "Jantar", key: "jantar", emoji: "🌙" },
    { label: "Ceia", key: "ceia", emoji: "🫖" },
  ] as const;

  if (!plano && !editing) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-zena-mint/30">
        <p className="text-zena-text-light mb-4">Nenhum plano alimentar cadastrado.</p>
        <button onClick={() => setEditing(true)} className="bg-zena-green-mid text-white px-5 py-2.5 rounded-xl text-sm font-medium">Criar plano alimentar</button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
        <h3 className="text-zena-text-dark font-semibold mb-6">Editar plano alimentar</h3>
        <form onSubmit={salvar} className="space-y-4">
          {refeicoes.map(({ label, key, emoji }) => (
            <div key={key}>
              <label className="text-sm font-medium text-zena-text-mid mb-1.5 flex items-center gap-1.5 block">
                <span>{emoji}</span>{label}
              </label>
              <textarea
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm text-zena-text-dark resize-none focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                placeholder={`Descreva ${label.toLowerCase()}...`}
              />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Observações gerais</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm text-zena-text-dark resize-none focus:outline-none focus:ring-2 focus:ring-zena-green-light"
              placeholder="Orientações gerais, restrições, hidratação..."
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl border border-zena-mint/50 text-zena-text-mid text-sm">Cancelar</button>
            <button type="submit" disabled={loading || !form.cafeManha || !form.almoco || !form.jantar} className="flex-1 py-2.5 rounded-xl bg-zena-green-mid text-white text-sm font-medium disabled:opacity-50">{loading ? "Salvando..." : "Salvar plano"}</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-zena-text-dark font-semibold">Plano alimentar atual</h3>
            <p className="text-zena-text-light text-xs">Atualizado em {format(new Date(plano.dataCriacao), "dd/MM/yyyy")}</p>
          </div>
          <div className="flex items-center gap-3">
            <PdfPlano pacienteNome={paciente.nome} nutricionistaNome={nutricionistaNome} plano={plano} />
            <button onClick={() => setEditing(true)} className="text-zena-green-mid text-sm font-medium hover:underline">Editar</button>
          </div>
        </div>
        <div className="space-y-4">
          {refeicoes.filter(({ key }) => plano[key]).map(({ label, key, emoji }) => (
            <div key={key} className="flex gap-4 p-4 bg-zena-cream rounded-xl">
              <span className="text-xl">{emoji}</span>
              <div>
                <p className="text-zena-text-mid text-xs font-medium mb-1">{label}</p>
                <p className="text-zena-text-dark text-sm">{plano[key]}</p>
              </div>
            </div>
          ))}
          {plano.observacoes && (
            <div className="p-4 bg-zena-mint/20 rounded-xl border border-zena-mint/40">
              <p className="text-zena-text-mid text-xs font-medium mb-1">Observações gerais</p>
              <p className="text-zena-text-dark text-sm">{plano.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AbaConsultas({ paciente, setPaciente, show }: { paciente: Paciente; setPaciente: any; show: any }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ data: "", status: "agendada", notas: "" });
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(`/pacientes/${paciente.id}/consultas`, form);
      setPaciente((p: Paciente) => ({ ...p, consultas: [res.data, ...p.consultas] }));
      setShowForm(false);
      show("Consulta agendada!");
    } catch {
      show("Erro ao agendar.", "error");
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    agendada: "bg-zena-mint/30 text-zena-green-mid",
    confirmada: "bg-zena-green-light/20 text-zena-green-dark",
    cancelada: "bg-zena-brown/10 text-zena-brown",
    remarcacao_solicitada: "bg-yellow-50 text-yellow-700",
    realizada: "bg-gray-100 text-gray-600",
    aguardando_confirmacao: "bg-blue-50 text-blue-600",
  };

  async function confirmar(consultaId: string) {
    const res = await api.patch(`/pacientes/${paciente.id}/consultas/${consultaId}`, { status: "confirmada" });
    setPaciente((p: Paciente) => ({ ...p, consultas: p.consultas.map((c) => c.id === consultaId ? res.data : c) }));
    show("Consulta confirmada!");
  }

  async function recusar(consultaId: string) {
    const res = await api.patch(`/pacientes/${paciente.id}/consultas/${consultaId}`, { status: "cancelada" });
    setPaciente((p: Paciente) => ({ ...p, consultas: p.consultas.map((c) => c.id === consultaId ? res.data : c) }));
    show("Consulta cancelada.");
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-zena-text-dark font-semibold">Consultas</h3>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm text-zena-green-mid font-medium hover:text-zena-green-dark">
            <Plus size={16} />Agendar
          </button>
        </div>
        {paciente.consultas.length === 0 ? (
          <p className="text-zena-text-light text-sm text-center py-8">Nenhuma consulta registrada.</p>
        ) : (
          <div className="space-y-2">
            {paciente.consultas.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-zena-cream">
                <div className="text-center min-w-[52px]">
                  <p className="text-zena-text-dark font-bold text-lg font-mono-data">{format(new Date(c.data), "dd")}</p>
                  <p className="text-zena-text-light text-xs uppercase">{format(new Date(c.data), "MMM", { locale: ptBR })}</p>
                </div>
                <div className="flex-1">
                  <p className="text-zena-text-dark text-sm">{format(new Date(c.data), "HH:mm")} h</p>
                  {c.notas && <p className="text-zena-text-light text-xs mt-0.5 truncate">{c.notas}</p>}
                </div>
                {c.status === "aguardando_confirmacao" ? (
                  <div className="flex gap-2">
                    <button onClick={() => confirmar(c.id)} className="text-xs bg-zena-green-mid text-white px-3 py-1.5 rounded-lg font-medium">Confirmar</button>
                    <button onClick={() => recusar(c.id)} className="text-xs border border-zena-brown/30 text-zena-brown px-3 py-1.5 rounded-lg">Recusar</button>
                  </div>
                ) : (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[c.status] || statusColors["agendada"]}`}>
                    {c.status === "aguardando_confirmacao" ? "⏳ Aguardando" : c.status.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-zena-text-dark mb-6">Agendar consulta</h2>
            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Data e hora *</label>
                <input type="datetime-local" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light" required />
              </div>
              <div>
                <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Notas</label>
                <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zena-green-light" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-zena-mint/50 text-zena-text-mid text-sm">Cancelar</button>
                <button type="submit" disabled={loading || !form.data} className="flex-1 py-2.5 rounded-xl bg-zena-green-mid text-white text-sm font-medium disabled:opacity-50">{loading ? "Salvando..." : "Agendar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AbaCobranças({ paciente, setPaciente, show }: { paciente: Paciente; setPaciente: any; show: any }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ valor: "", vencimento: "", metodo: "pix" });
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/cobrancas", { ...form, pacienteId: paciente.id });
      setPaciente((p: Paciente) => ({ ...p, cobrancas: [res.data, ...p.cobrancas] }));
      setShowForm(false);
      show("Cobrança criada!");
    } catch {
      show("Erro ao criar.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function marcarPago(id: string) {
    try {
      const res = await api.patch(`/cobrancas/${id}/pagar`);
      setPaciente((p: Paciente) => ({ ...p, cobrancas: p.cobrancas.map((c) => c.id === id ? res.data : c) }));
      show("Pagamento registrado!");
    } catch {
      show("Erro ao registrar.", "error");
    }
  }

  const statusStyle: Record<string, string> = {
    pago: "bg-zena-green-light/10 text-zena-green-dark",
    pendente: "bg-zena-sand text-zena-text-mid",
    vencido: "bg-zena-brown/10 text-zena-brown",
  };

  const getStatus = (c: Paciente["cobrancas"][0]) => {
    if (c.status === "pago") return "pago";
    if (new Date(c.vencimento) < new Date()) return "vencido";
    return "pendente";
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-zena-text-dark font-semibold">Cobranças</h3>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm text-zena-green-mid font-medium hover:text-zena-green-dark">
            <Plus size={16} />Nova cobrança
          </button>
        </div>
        {paciente.cobrancas.length === 0 ? (
          <p className="text-zena-text-light text-sm text-center py-8">Nenhuma cobrança registrada. Registre a primeira consulta para começar.</p>
        ) : (
          <div className="space-y-2">
            {paciente.cobrancas.map((c) => {
              const status = getStatus(c);
              return (
                <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-zena-cream">
                  <div className="flex-1">
                    <p className="text-zena-text-dark font-semibold font-mono-data">R$ {c.valor.toFixed(2).replace(".", ",")}</p>
                    <p className="text-zena-text-light text-xs">Vence em {format(new Date(c.vencimento), "dd/MM/yyyy")} · {c.metodo || "—"}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[status]}`}>{status}</span>
                  {status !== "pago" && (
                    <button onClick={() => marcarPago(c.id)} className="text-xs text-zena-green-mid font-medium hover:underline">Pago</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-zena-text-dark mb-6">Nova cobrança</h2>
            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Valor (R$) *</label>
                <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light" required />
              </div>
              <div>
                <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Vencimento *</label>
                <input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light" required />
              </div>
              <div>
                <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Forma de pagamento</label>
                <select value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light">
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão</option>
                  <option value="transferencia">Transferência</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-zena-mint/50 text-zena-text-mid text-sm">Cancelar</button>
                <button type="submit" disabled={loading || !form.valor || !form.vencimento} className="flex-1 py-2.5 rounded-xl bg-zena-green-mid text-white text-sm font-medium disabled:opacity-50">{loading ? "Salvando..." : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Aba Check-ins ----------
function AbaCheckIns({ paciente, setPaciente, show }: { paciente: Paciente; setPaciente: any; show: any }) {
  const checkIns = [...(paciente.checkIns || [])].sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.semana - a.semana);
  const streak = calcularStreak(checkIns);

  const fotoDepois = checkIns.find((c) => c.foto)?.foto;

  const chartData = [...checkIns].reverse().map((ci) => ({
    sem: `S${ci.semana}`,
    adesao: ci.adesao,
    humor: ci.humor * 20,
  }));

  if (checkIns.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-zena-mint/30">
        <p className="text-4xl mb-3">✨</p>
        <p className="text-zena-text-mid font-medium">Nenhum check-in ainda.</p>
        <p className="text-zena-text-light text-sm mt-1">A paciente pode fazer o check-in pelo link dela.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Streak + resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-zena-mint/30 shadow-sm text-center">
          <p className="text-3xl font-bold text-zena-text-dark font-mono-data">{checkIns.length}</p>
          <p className="text-zena-text-light text-xs mt-1">check-ins totais</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 text-center">
          <p className="text-3xl">🔥</p>
          <p className="text-zena-text-dark font-bold text-lg">{streak}</p>
          <p className="text-zena-text-light text-xs">{streak === 1 ? "semana" : "semanas"} seguidas</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-zena-mint/30 shadow-sm text-center">
          <p className="text-3xl font-bold text-zena-text-dark font-mono-data">
            {Math.round(checkIns.reduce((s, c) => s + c.adesao, 0) / checkIns.length)}%
          </p>
          <p className="text-zena-text-light text-xs mt-1">adesão média</p>
        </div>
      </div>

      {/* Gráfico de adesão */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
          <h3 className="text-zena-text-dark font-semibold mb-4">Evolução semanal</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#B7E4C7" />
              <XAxis dataKey="sem" tick={{ fontSize: 11, fill: "#8FA897" }} />
              <YAxis tick={{ fontSize: 11, fill: "#8FA897" }} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #B7E4C7", fontSize: 12 }} />
              <Bar dataKey="adesao" fill="#52B788" radius={[6, 6, 0, 0]} name="Adesão %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparativo de fotos */}
      {paciente.fotoInicial && fotoDepois && (
        <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
          <h3 className="text-zena-text-dark font-semibold mb-4">Comparativo visual</h3>
          <FotoSlider antes={paciente.fotoInicial} depois={fotoDepois} />
        </div>
      )}

      {/* Foto inicial */}
      <FotoInicialUpload paciente={paciente} setPaciente={setPaciente} show={show} />

      {/* Lista de check-ins */}
      <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
        <h3 className="text-zena-text-dark font-semibold mb-4">Histórico de check-ins</h3>
        <div className="space-y-3">
          {checkIns.map((ci) => (
            <div key={ci.id} className="border border-zena-cream rounded-xl p-4 hover:bg-zena-cream/50 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">{humoresMap[ci.humor] || "😐"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-zena-text-dark font-medium text-sm">Semana {ci.semana} de {ci.ano}</p>
                    <span className="text-zena-text-light text-xs flex-shrink-0">
                      {format(new Date(ci.criadoEm), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <div>
                      <p className="text-zena-text-light text-xs">Humor</p>
                      <p className="text-zena-text-dark text-sm font-medium">{humoresLabel[ci.humor]}</p>
                    </div>
                    <div>
                      <p className="text-zena-text-light text-xs">Adesão</p>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-zena-cream rounded-full overflow-hidden">
                          <div className="h-full bg-zena-green-light rounded-full" style={{ width: `${ci.adesao}%` }} />
                        </div>
                        <p className="text-zena-text-dark text-sm font-mono-data font-semibold">{ci.adesao}%</p>
                      </div>
                    </div>
                    {ci.peso && (
                      <div>
                        <p className="text-zena-text-light text-xs">Peso</p>
                        <p className="text-zena-text-dark text-sm font-mono-data font-semibold">{ci.peso} kg</p>
                      </div>
                    )}
                  </div>
                  {ci.nota && (
                    <div className="bg-zena-cream rounded-xl px-3 py-2">
                      <p className="text-zena-text-light text-xs font-medium mb-0.5">Mensagem da paciente</p>
                      <p className="text-zena-text-mid text-sm italic">"{ci.nota}"</p>
                    </div>
                  )}
                  {ci.foto && (
                    <img src={ci.foto} alt="Foto do check-in" className="mt-2 h-24 w-auto rounded-xl object-cover" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FotoInicialUpload({ paciente, setPaciente, show }: { paciente: Paciente; setPaciente: any; show: any }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const compressed = await comprimirImagem(file);
      await api.patch(`/pacientes/${paciente.id}/foto-inicial`, { fotoInicial: compressed });
      setPaciente((p: Paciente) => ({ ...p, fotoInicial: compressed }));
      show("Foto inicial salva!");
    } catch {
      show("Erro ao salvar foto.", "error");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remover() {
    setLoading(true);
    try {
      await api.patch(`/pacientes/${paciente.id}/foto-inicial`, { fotoInicial: null });
      setPaciente((p: Paciente) => ({ ...p, fotoInicial: undefined }));
      show("Foto removida.");
    } catch {
      show("Erro ao remover.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
      <h3 className="text-zena-text-dark font-semibold mb-1">Foto inicial (antes)</h3>
      <p className="text-zena-text-light text-xs mb-4">Usada no comparativo antes/depois da área da paciente.</p>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      {paciente.fotoInicial ? (
        <div className="flex items-start gap-4">
          <img src={paciente.fotoInicial} alt="Foto inicial" className="h-32 w-auto rounded-xl object-cover" />
          <div className="space-y-2">
            <button onClick={() => fileRef.current?.click()} disabled={loading} className="flex items-center gap-2 text-sm text-zena-green-mid font-medium hover:underline">
              <Upload size={14} />Trocar foto
            </button>
            <button onClick={remover} disabled={loading} className="flex items-center gap-2 text-sm text-zena-brown font-medium hover:underline">
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="w-full py-5 border-2 border-dashed border-zena-mint rounded-xl flex flex-col items-center gap-2 text-zena-text-light hover:border-zena-green-light hover:text-zena-green-mid transition-all"
        >
          <Camera size={24} />
          <span className="text-sm">{loading ? "Enviando..." : "Adicionar foto inicial (antes)"}</span>
        </button>
      )}
    </div>
  );
}

// ---------- Aba Comunicação ----------
function AbaComunicacao({ paciente, setPaciente: _sp, show: _sh, nutricionista }: { paciente: Paciente; setPaciente: any; show: any; nutricionista: any }) {
  const [waTemplate, setWaTemplate] = useState<TemplateWhatsApp | null>(null);

  const mensagens = paciente.mensagens || [];

  const templates: Array<{ template: TemplateWhatsApp; emoji: string; label: string; desc: string }> = [
    { template: "lembrete_consulta", emoji: "📅", label: "Lembrete de consulta", desc: "Para a próxima consulta agendada" },
    { template: "envio_plano", emoji: "🥗", label: "Enviar plano alimentar", desc: "Compartilha o link com o plano" },
    { template: "lembrete_checkin", emoji: "✨", label: "Lembrete de check-in", desc: "Convida para o check-in semanal" },
    { template: "lembrete_cobranca", emoji: "💚", label: "Lembrete de cobrança", desc: "Para pagamento pendente" },
  ];

  return (
    <div className="space-y-6">
      {waTemplate && nutricionista && (
        <WhatsAppModal
          context={{
            pacienteId: paciente.id,
            pacienteNome: paciente.nome,
            pacienteTelefone: paciente.telefone,
            pacienteLinkUnico: paciente.linkUnico,
            nutricionistaNome: nutricionista.nome,
          }}
          template={waTemplate}
          onClose={() => setWaTemplate(null)}
        />
      )}

      {!paciente.telefone && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
          <strong>Telefone não cadastrado.</strong> Adicione o WhatsApp da paciente no cadastro para usar o botão "Abrir WhatsApp".
        </div>
      )}

      {/* Botões de ação rápida */}
      <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
        <h3 className="text-zena-text-dark font-semibold mb-4">Enviar mensagem</h3>
        <div className="grid grid-cols-2 gap-3">
          {templates.map(({ template, emoji, label, desc }) => (
            <button
              key={template}
              onClick={() => setWaTemplate(template)}
              className="flex flex-col items-start gap-2 p-4 rounded-xl border-2 border-transparent hover:border-[#25D366]/30 hover:bg-[#25D366]/5 text-left transition-all"
            >
              <span className="text-2xl">{emoji}</span>
              <div>
                <p className="text-zena-text-dark text-sm font-medium">{label}</p>
                <p className="text-zena-text-light text-xs">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
        <h3 className="text-zena-text-dark font-semibold mb-4">Histórico de mensagens</h3>
        {mensagens.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="mx-auto text-zena-mint mb-2" size={32} />
            <p className="text-zena-text-light text-sm">Nenhuma mensagem enviada ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mensagens.map((m) => (
              <div key={m.id} className="flex gap-3 p-3 bg-zena-cream rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle size={14} className="text-[#25D366]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-zena-text-dark text-sm font-medium">{templateLabel[m.template] || m.template}</p>
                    <p className="text-zena-text-light text-xs flex-shrink-0">
                      {format(new Date(m.criadoEm), "dd/MM HH:mm")}
                    </p>
                  </div>
                  <p className="text-zena-text-light text-xs mt-0.5 truncate">{m.textoEnviado.split("\n")[0]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Aba Anamnese ----------
function AbaAnamnese({ paciente, show }: { paciente: Paciente; show: any }) {
  const anamnese = paciente.anamnese;
  const atividadeLabel: Record<string, string> = {
    sedentario: "Sedentário",
    leve: "Atividade leve (1-2x/semana)",
    moderado: "Moderado (3-4x/semana)",
    intenso: "Intenso (5+x/semana)",
  };

  if (!anamnese) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-zena-mint/30">
        <ClipboardList className="mx-auto text-zena-mint mb-3" size={40} />
        <p className="text-zena-text-mid font-medium">Anamnese não preenchida ainda.</p>
        <p className="text-zena-text-light text-sm mt-2">
          A paciente pode preencher pelo link do portal. Quando ela completar, as informações aparecerão aqui.
        </p>
      </div>
    );
  }

  const secoes = [
    {
      titulo: "Queixas e histórico",
      emoji: "🩺",
      items: [
        { label: "Queixa principal", val: anamnese.queixaPrincipal },
        { label: "Histórico de dietas", val: anamnese.historicoDieta },
        { label: "Restrições / alergias", val: anamnese.restricoes },
        { label: "Medicamentos em uso", val: anamnese.medicamentos },
        { label: "Condições de saúde", val: anamnese.condicoesSaude },
      ],
    },
    {
      titulo: "Estilo de vida",
      emoji: "🏃",
      items: [
        { label: "Nível de atividade", val: anamnese.nivelAtividade ? atividadeLabel[anamnese.nivelAtividade] || anamnese.nivelAtividade : null },
        { label: "Horas de sono", val: anamnese.horasSono ? `${anamnese.horasSono}h por noite` : null },
        { label: "Nível de estresse", val: anamnese.nivelEstresse ? `${anamnese.nivelEstresse}/5` : null },
      ],
    },
    {
      titulo: "Hábitos alimentares",
      emoji: "🥗",
      items: [
        { label: "Refeições por dia", val: anamnese.refeicoesDia ? `${anamnese.refeicoesDia} refeições` : null },
        { label: "Cozinha em casa?", val: anamnese.comeCozinha !== null && anamnese.comeCozinha !== undefined ? (anamnese.comeCozinha ? "Sim" : "Não") : null },
        { label: "Come fora de casa", val: anamnese.comeForaCasa !== null && anamnese.comeForaCasa !== undefined ? `${anamnese.comeForaCasa}x por semana` : null },
        { label: "Consumo de água", val: anamnese.consumoAgua ? `${anamnese.consumoAgua}L por dia` : null },
      ],
    },
    {
      titulo: "Motivação e expectativas",
      emoji: "💪",
      items: [
        { label: "Motivação", val: anamnese.motivacao },
        { label: "Expectativas", val: anamnese.expectativas },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {secoes.map((secao) => {
        const itensComValor = secao.items.filter((i) => i.val);
        if (!itensComValor.length) return null;
        return (
          <div key={secao.titulo} className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{secao.emoji}</span>
              <h3 className="text-zena-text-dark font-semibold">{secao.titulo}</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {itensComValor.map((item) => (
                <div key={item.label} className="bg-zena-cream rounded-xl p-3">
                  <p className="text-zena-text-light text-xs font-medium mb-1">{item.label}</p>
                  <p className="text-zena-text-dark text-sm">{item.val}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
