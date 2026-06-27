import { useEffect, useState, useRef, useCallback, type ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Copy, TrendingDown, TrendingUp, Minus, MessageCircle, Camera, Upload, ClipboardList, Pencil, Check, X, Images, Share2, Trash2 } from "lucide-react";
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
  dataNascimento?: string | null;
  sexo?: string | null;
  altura?: number | null;
  fotoInicial?: string;
  linkUnico: string;
  medicoes: Array<{ id: string; data: string; peso: number; gordura?: number; musculo?: number; cintura?: number; quadril?: number; braco?: number; coxa?: number; observacoes?: string }>;
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

const tabs = ["Evolução", "Galeria", "Plano Alimentar", "Consultas", "Cobranças", "Check-ins", "Comunicação", "Anamnese"] as const;
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
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/pacientes/${id}`).then((res) => {
      setPaciente(res.data);
      setLoading(false);
    });
  }, [id]);

  const startEdit = useCallback(() => {
    if (!paciente) return;
    setEditError("");
    setEditForm({
      nome: paciente.nome,
      email: paciente.email || "",
      telefone: paciente.telefone || "",
      objetivo: paciente.objetivo,
      pesoMeta: paciente.pesoMeta ?? "",
      dataNascimento: paciente.dataNascimento ? paciente.dataNascimento.split("T")[0] : "",
      sexo: paciente.sexo || "",
      altura: paciente.altura ?? "",
      condicoesSaude: paciente.anamnese?.condicoesSaude || "",
      restricoes: paciente.anamnese?.restricoes || "",
      medicamentos: paciente.anamnese?.medicamentos || "",
    });
    setEditMode(true);
  }, [paciente]);

  const cancelEdit = useCallback(() => { setEditMode(false); setEditError(""); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") cancelEdit(); }
    if (editMode) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, cancelEdit]);

  async function saveEdit() {
    if (!editForm.nome?.trim()) { setEditError("Nome é obrigatório."); return; }
    setEditError("");
    setSaving(true);
    try {
      const { condicoesSaude, restricoes, medicamentos, ...pacienteFields } = editForm;
      const [res] = await Promise.all([
        api.put(`/pacientes/${id}`, pacienteFields),
        api.put(`/anamnese/paciente/${id}`, { condicoesSaude, restricoes, medicamentos }),
      ]);
      setPaciente((p: Paciente | null) => p ? {
        ...p, ...res.data,
        anamnese: { ...(p.anamnese || {}), condicoesSaude, restricoes, medicamentos },
      } : p);
      setEditMode(false);
      show("Ficha atualizada!");
    } catch {
      show("Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  }

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

      <button onClick={() => navigate("/app/pacientes")} className="flex items-center gap-2 text-zena-text-light hover:text-zena-text-mid text-sm mb-6 transition-colors">
        <ArrowLeft size={16} />
        Voltar para pacientes
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm mb-6">
        {editMode ? (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-zena-text-dark font-semibold">Editar ficha</h2>
              <div className="flex items-center gap-2">
                <button onClick={cancelEdit} className="flex items-center gap-1.5 text-sm text-zena-text-mid border border-zena-mint/50 px-3 py-1.5 rounded-xl hover:bg-zena-cream">
                  <X size={14} /> Cancelar
                </button>
                <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5 text-sm text-white bg-zena-green-dark px-3 py-1.5 rounded-xl hover:bg-zena-green-mid disabled:opacity-50">
                  <Check size={14} /> {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>

            {editError && <p className="text-red-500 text-sm mb-4">{editError}</p>}

            {/* Dados pessoais */}
            <p className="text-xs font-semibold text-zena-text-light uppercase tracking-wide mb-3">Dados pessoais</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs font-medium text-zena-text-mid mb-1 block">Nome *</label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light bg-zena-cream ${editError && !editForm.nome?.trim() ? "border-red-400" : "border-zena-mint/50"}`}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zena-text-mid mb-1 block">Objetivo</label>
                <input
                  type="text"
                  value={editForm.objetivo}
                  onChange={(e) => setEditForm({ ...editForm, objetivo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zena-text-mid mb-1 block">E-mail</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zena-text-mid mb-1 block">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  value={editForm.telefone}
                  onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zena-text-mid mb-1 block">Data de nascimento</label>
                <input
                  type="date"
                  value={editForm.dataNascimento}
                  onChange={(e) => setEditForm({ ...editForm, dataNascimento: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zena-text-mid mb-1 block">Sexo</label>
                <select
                  value={editForm.sexo}
                  onChange={(e) => setEditForm({ ...editForm, sexo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                >
                  <option value="">Não informado</option>
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            {/* Corpo */}
            <p className="text-xs font-semibold text-zena-text-light uppercase tracking-wide mb-3">Corpo</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {[
                { label: "Altura (cm)", key: "altura" },
                { label: "Meta de peso (kg)", key: "pesoMeta" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-zena-text-mid mb-1 block">{label}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm[key]}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                  />
                </div>
              ))}
            </div>

            {/* Saúde */}
            <p className="text-xs font-semibold text-zena-text-light uppercase tracking-wide mb-3">Saúde</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Patologias / Condições de saúde", key: "condicoesSaude" },
                { label: "Alergias / Restrições alimentares", key: "restricoes" },
                { label: "Medicamentos em uso", key: "medicamentos" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-zena-text-mid mb-1 block">{label}</label>
                  <textarea
                    rows={3}
                    value={editForm[key]}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light resize-none"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
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
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <p className="text-zena-text-light text-xs">
                      Desde {format(new Date(paciente.dataInicio), "MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    {paciente.dataNascimento && (
                      <p className="text-zena-text-light text-xs">· {format(new Date(paciente.dataNascimento), "dd/MM/yyyy")}</p>
                    )}
                    {paciente.sexo && (
                      <p className="text-zena-text-light text-xs capitalize">· {paciente.sexo}</p>
                    )}
                    {paciente.altura && (
                      <p className="text-zena-text-light text-xs">· {paciente.altura} cm</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 text-zena-text-mid border border-zena-mint/50 px-3 py-2 rounded-xl text-sm font-medium hover:bg-zena-cream transition-all"
                >
                  <Pencil size={14} />
                  <span className="hidden sm:inline">Editar</span>
                </button>
                <button
                  onClick={() => setWaTemplate("lembrete_checkin")}
                  className="flex items-center gap-1.5 text-[#25D366] border border-[#25D366]/30 px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#25D366]/5 transition-all"
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
            {medicoes.length > 0 && (() => {
              const ultima = medicoes[medicoes.length - 1];
              return (
                <div className="mt-6 pt-6 border-t border-zena-cream space-y-4">
                  {/* Peso */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                        <p className="text-zena-text-light text-xs">Variação total</p>
                        <div className="flex items-center gap-1">
                          {diff < 0 ? <TrendingDown size={14} className="text-zena-green-light" /> : diff > 0 ? <TrendingUp size={14} className="text-zena-brown" /> : <Minus size={14} className="text-zena-text-light" />}
                          <p className={`font-bold font-mono-data ${diff < 0 ? "text-zena-green-light" : diff > 0 ? "text-zena-brown" : "text-zena-text-light"}`}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Composição corporal da última medição */}
                  {(ultima.gordura || ultima.cintura || ultima.quadril || ultima.braco || ultima.coxa) && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-3 border-t border-zena-cream/60">
                      {ultima.gordura != null && (
                        <div>
                          <p className="text-zena-text-light text-xs">% Gordura</p>
                          <p className="text-zena-text-dark font-semibold font-mono-data">{ultima.gordura}%</p>
                        </div>
                      )}
                      {ultima.cintura != null && (
                        <div>
                          <p className="text-zena-text-light text-xs">Cintura</p>
                          <p className="text-zena-text-dark font-semibold font-mono-data">{ultima.cintura} cm</p>
                        </div>
                      )}
                      {ultima.quadril != null && (
                        <div>
                          <p className="text-zena-text-light text-xs">Quadril</p>
                          <p className="text-zena-text-dark font-semibold font-mono-data">{ultima.quadril} cm</p>
                        </div>
                      )}
                      {ultima.braco != null && (
                        <div>
                          <p className="text-zena-text-light text-xs">Braço</p>
                          <p className="text-zena-text-dark font-semibold font-mono-data">{ultima.braco} cm</p>
                        </div>
                      )}
                      {ultima.coxa != null && (
                        <div>
                          <p className="text-zena-text-light text-xs">Coxa</p>
                          <p className="text-zena-text-dark font-semibold font-mono-data">{ultima.coxa} cm</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
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
      {tab === "Galeria" && <AbaGaleria paciente={paciente} show={show} />}
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
  const [form, setForm] = useState({ data: new Date().toISOString().split("T")[0], peso: "", gordura: "", musculo: "", cintura: "", quadril: "", braco: "", coxa: "", observacoes: "" });
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

  const chartData = medicoes.map((m) => {
    const alturaM = paciente.altura ? paciente.altura / 100 : null;
    const imc = alturaM && m.peso ? parseFloat((m.peso / (alturaM * alturaM)).toFixed(1)) : null;
    return {
      data: format(new Date(m.data), "dd/MM"),
      peso: m.peso,
      gordura: m.gordura ?? null,
      cintura: m.cintura ?? null,
      quadril: m.quadril ?? null,
      braco: m.braco ?? null,
      coxa: m.coxa ?? null,
      imc,
    };
  });

  const temGordura = medicoes.some((m) => m.gordura);
  const temMedidas = medicoes.some((m) => m.cintura || m.quadril || m.braco || m.coxa);

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
          {/* Gráfico de peso */}
          <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zena-text-dark font-semibold">Evolução do peso</h3>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm text-zena-green-mid font-medium hover:text-zena-green-dark">
                <Plus size={16} /> Nova medição
              </button>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#B7E4C7" />
                <XAxis dataKey="data" tick={{ fontSize: 11, fill: "#8FA897" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8FA897" }} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #B7E4C7", fontSize: 12 }} />
                <Line type="monotone" dataKey="peso" stroke="#2D6A4F" strokeWidth={2.5} dot={{ fill: "#52B788", r: 4 }} name="Peso (kg)" />
                {paciente.pesoMeta && (
                  <Line type="monotone" dataKey={() => paciente.pesoMeta} stroke="#B7E4C7" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Meta (kg)" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de gordura % */}
          {temGordura && (
            <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
              <h3 className="text-zena-text-dark font-semibold mb-4">% Gordura corporal</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#B7E4C7" />
                  <XAxis dataKey="data" tick={{ fontSize: 11, fill: "#8FA897" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8FA897" }} domain={["dataMin - 1", "dataMax + 1"]} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #B7E4C7", fontSize: 12 }} formatter={(v) => [`${v}%`]} />
                  <Line type="monotone" dataKey="gordura" stroke="#52B788" strokeWidth={2.5} dot={{ fill: "#2D6A4F", r: 4 }} name="Gordura %" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico de medidas */}
          {temMedidas && (
            <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
              <h3 className="text-zena-text-dark font-semibold mb-4">Medidas corporais (cm)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#B7E4C7" />
                  <XAxis dataKey="data" tick={{ fontSize: 11, fill: "#8FA897" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8FA897" }} unit=" cm" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #B7E4C7", fontSize: 12 }} formatter={(v) => [`${v} cm`]} />
                  <Line type="monotone" dataKey="cintura" stroke="#2D6A4F" strokeWidth={2} dot={{ r: 3 }} name="Cintura" connectNulls />
                  <Line type="monotone" dataKey="quadril" stroke="#52B788" strokeWidth={2} dot={{ r: 3 }} name="Quadril" connectNulls />
                  <Line type="monotone" dataKey="braco" stroke="#74C69D" strokeWidth={2} dot={{ r: 3 }} name="Braço" connectNulls />
                  <Line type="monotone" dataKey="coxa" stroke="#B7E4C7" strokeWidth={2} dot={{ r: 3 }} name="Coxa" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabela */}
          <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
            <h3 className="text-zena-text-dark font-semibold mb-4">Histórico de medições</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zena-text-light text-left">
                    <th className="pb-3 font-medium">Data</th>
                    <th className="pb-3 font-medium">Peso</th>
                    <th className="pb-3 font-medium">IMC</th>
                    <th className="pb-3 font-medium">% Gord.</th>
                    <th className="pb-3 font-medium">Cintura</th>
                    <th className="pb-3 font-medium">Quadril</th>
                    <th className="pb-3 font-medium">Braço</th>
                    <th className="pb-3 font-medium">Coxa</th>
                    <th className="pb-3 font-medium">Obs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zena-cream">
                  {[...medicoes].reverse().map((m, i) => {
                    const alturaM = paciente.altura ? paciente.altura / 100 : null;
                    const imc = alturaM ? (m.peso / (alturaM * alturaM)).toFixed(1) : null;
                    return (
                      <tr key={m.id} className="text-zena-text-dark">
                        <td className="py-3 text-zena-text-light text-xs">{format(new Date(m.data), "dd/MM/yyyy")}</td>
                        <td className="py-3 font-mono-data font-semibold">{m.peso} kg</td>
                        <td className="py-3 text-zena-text-mid font-mono-data">{imc ?? "—"}</td>
                        <td className="py-3 text-zena-text-mid">{m.gordura ? `${m.gordura}%` : "—"}</td>
                        <td className="py-3 text-zena-text-mid">{m.cintura ? `${m.cintura}cm` : "—"}</td>
                        <td className="py-3 text-zena-text-mid">{m.quadril ? `${m.quadril}cm` : "—"}</td>
                        <td className="py-3 text-zena-text-mid">{m.braco ? `${m.braco}cm` : "—"}</td>
                        <td className="py-3 text-zena-text-mid">{m.coxa ? `${m.coxa}cm` : "—"}</td>
                        <td className="py-3 text-zena-text-light text-xs max-w-xs truncate">{m.observacoes || "—"}</td>
                      </tr>
                    );
                  })}
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
                  ["Braço (cm)", "braco", "number"],
                  ["Coxa (cm)", "coxa", "number"],
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

// ---------- Aba Galeria ----------
interface FotoMeta { id: string; data: string; tipo: string; }
interface FotoComImagem extends FotoMeta { imagem: string; }

function AbaGaleria({ paciente, show }: { paciente: Paciente; show: any }) {
  const [fotos, setFotos] = useState<FotoMeta[]>([]);
  const [loadingFotos, setLoadingFotos] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ data: new Date().toISOString().split("T")[0], tipo: "frente" });
  const fileRef = useRef<HTMLInputElement>(null);

  // Comparativo
  const [modo, setModo] = useState<"galeria" | "comparar">("galeria");
  const [dataAntes, setDataAntes] = useState("");
  const [dataDepois, setDataDepois] = useState("");
  const [fotoAntes, setFotoAntes] = useState<FotoComImagem | null>(null);
  const [fotoDepois2, setFotoDepois2] = useState<FotoComImagem | null>(null);
  const [tipoComparativo, setTipoComparativo] = useState("frente");
  const [loadingCompar, setLoadingCompar] = useState(false);

  useEffect(() => {
    api.get(`/fotos/${paciente.id}/meta`).then(r => setFotos(r.data)).finally(() => setLoadingFotos(false));
  }, [paciente.id]);

  // Datas únicas disponíveis
  const datasUnicas = [...new Set(fotos.map(f => f.data.split("T")[0]))].sort();

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const imagem = await comprimirImagem(file, 800, 0.75);
      const res = await api.post(`/fotos/${paciente.id}`, { ...uploadForm, imagem });
      setFotos(prev => [...prev, res.data]);
      show("Foto salva!");
    } catch {
      show("Erro ao salvar foto.", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function deletar(fotoId: string) {
    await api.delete(`/fotos/${fotoId}`);
    setFotos(prev => prev.filter(f => f.id !== fotoId));
    show("Foto removida.");
  }

  async function carregarComparativo() {
    if (!dataAntes || !dataDepois) return;
    setLoadingCompar(true);
    try {
      const fotosAntes = fotos.filter(f => f.data.startsWith(dataAntes) && f.tipo === tipoComparativo);
      const fotosDepois = fotos.filter(f => f.data.startsWith(dataDepois) && f.tipo === tipoComparativo);
      if (!fotosAntes[0] || !fotosDepois[0]) { show("Foto não encontrada para essa data e ângulo.", "error"); return; }
      const [ra, rd] = await Promise.all([
        api.get(`/fotos/${fotosAntes[0].id}/imagem`),
        api.get(`/fotos/${fotosDepois[0].id}/imagem`),
      ]);
      setFotoAntes({ ...fotosAntes[0], imagem: ra.data.imagem });
      setFotoDepois2({ ...fotosDepois[0], imagem: rd.data.imagem });
    } catch {
      show("Erro ao carregar fotos.", "error");
    } finally {
      setLoadingCompar(false);
    }
  }

  function compartilhar() {
    if (!fotoAntes || !fotoDepois2) return;
    const canvas = document.createElement("canvas");
    canvas.width = 800; canvas.height = 500;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f5f5f0";
    ctx.fillRect(0, 0, 800, 500);

    // Header
    ctx.fillStyle = "#2D6A4F";
    ctx.fillRect(0, 0, 800, 60);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(`${paciente.nome} — Evolução Clinne`, 24, 38);

    function drawImg(src: string, x: number, w: number, label: string, cb: () => void) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, x, 70, w, 400);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(x, 420, w, 50);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(label, x + 16, 450);
        cb();
      };
      img.src = src;
    }

    drawImg(fotoAntes.imagem, 10, 385, `ANTES — ${dataAntes}`, () => {
      drawImg(fotoDepois2.imagem, 405, 385, `DEPOIS — ${dataDepois}`, () => {
        const link = document.createElement("a");
        link.download = `evolucao-${paciente.nome.replace(/\s+/g, "-")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      });
    });
  }

  // Agrupar fotos por data para o grid
  const fotosPorData: Record<string, FotoMeta[]> = {};
  for (const f of fotos) {
    const d = f.data.split("T")[0];
    if (!fotosPorData[d]) fotosPorData[d] = [];
    fotosPorData[d].push(f);
  }

  const TIPOS = ["frente", "perfil", "costas"];
  const tipoLabel: Record<string, string> = { frente: "Frente", perfil: "Perfil", costas: "Costas" };

  return (
    <div className="space-y-6">
      {/* Upload + controles */}
      <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-zena-text-dark font-semibold flex items-center gap-2"><Images size={18} /> Galeria de fotos</h3>
          <div className="flex gap-2">
            <button onClick={() => setModo("galeria")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${modo === "galeria" ? "bg-zena-green-mid text-white" : "text-zena-text-mid hover:bg-zena-cream"}`}>
              Galeria
            </button>
            <button onClick={() => setModo("comparar")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${modo === "comparar" ? "bg-zena-green-mid text-white" : "text-zena-text-mid hover:bg-zena-cream"}`}>
              Comparar
            </button>
          </div>
        </div>

        {/* Upload */}
        <div className="flex flex-wrap gap-3 items-end p-4 bg-zena-cream rounded-xl mb-4">
          <div>
            <label className="text-xs font-medium text-zena-text-mid mb-1 block">Data</label>
            <input type="date" value={uploadForm.data} onChange={e => setUploadForm(f => ({ ...f, data: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-zena-mint/50 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light" />
          </div>
          <div>
            <label className="text-xs font-medium text-zena-text-mid mb-1 block">Ângulo</label>
            <select value={uploadForm.tipo} onChange={e => setUploadForm(f => ({ ...f, tipo: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-zena-mint/50 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light">
              {TIPOS.map(t => <option key={t} value={t}>{tipoLabel[t]}</option>)}
            </select>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 bg-zena-green-dark text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-zena-green-mid disabled:opacity-50">
            <Camera size={15} /> {uploading ? "Enviando..." : "Adicionar foto"}
          </button>
        </div>

        {/* Grid galeria */}
        {modo === "galeria" && (
          loadingFotos ? (
            <p className="text-center text-zena-text-light text-sm py-8">Carregando...</p>
          ) : fotos.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="mx-auto text-zena-mint mb-3" size={40} />
              <p className="text-zena-text-mid font-medium">Nenhuma foto ainda.</p>
              <p className="text-zena-text-light text-sm mt-1">Adicione fotos por data para acompanhar a evolução visual.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(fotosPorData).sort(([a], [b]) => b.localeCompare(a)).map(([data, fts]) => (
                <div key={data}>
                  <p className="text-zena-text-mid text-sm font-semibold mb-3">
                    {format(new Date(data + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {TIPOS.map(tipo => {
                      const foto = fts.find(f => f.tipo === tipo);
                      return (
                        <div key={tipo} className="aspect-[3/4] rounded-xl bg-zena-cream border border-zena-mint/30 overflow-hidden relative group">
                          {foto ? (
                            <FotoThumb fotoId={foto.id} label={tipoLabel[tipo]} onDelete={() => deletar(foto.id)} />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-zena-text-light text-xs gap-1">
                              <Camera size={20} className="opacity-40" />
                              <span>{tipoLabel[tipo]}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Modo comparar */}
        {modo === "comparar" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-zena-text-mid mb-1 block">Data ANTES</label>
                <select value={dataAntes} onChange={e => setDataAntes(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-zena-mint/50 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light">
                  <option value="">Selecione...</option>
                  {datasUnicas.map(d => <option key={d} value={d}>{format(new Date(d + "T12:00:00"), "dd/MM/yyyy")}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zena-text-mid mb-1 block">Data DEPOIS</label>
                <select value={dataDepois} onChange={e => setDataDepois(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-zena-mint/50 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light">
                  <option value="">Selecione...</option>
                  {datasUnicas.map(d => <option key={d} value={d}>{format(new Date(d + "T12:00:00"), "dd/MM/yyyy")}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zena-text-mid mb-1 block">Ângulo</label>
                <select value={tipoComparativo} onChange={e => setTipoComparativo(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-zena-mint/50 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light">
                  {TIPOS.map(t => <option key={t} value={t}>{tipoLabel[t]}</option>)}
                </select>
              </div>
              <button onClick={carregarComparativo} disabled={!dataAntes || !dataDepois || loadingCompar}
                className="bg-zena-green-dark text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-zena-green-mid disabled:opacity-50">
                {loadingCompar ? "Carregando..." : "Comparar"}
              </button>
            </div>

            {fotoAntes && fotoDepois2 && (
              <div>
                <div className="max-w-sm mx-auto">
                  <FotoSlider antes={fotoAntes.imagem} depois={fotoDepois2.imagem} />
                </div>
                <div className="flex justify-center mt-4">
                  <button onClick={compartilhar}
                    className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90">
                    <Share2 size={16} /> Baixar imagem para compartilhar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FotoThumb({ fotoId, label, onDelete }: { fotoId: string; label: string; onDelete: () => void }) {
  const [imagem, setImagem] = useState<string | null>(null);
  useEffect(() => {
    api.get(`/fotos/${fotoId}/imagem`).then(r => setImagem(r.data.imagem));
  }, [fotoId]);

  return (
    <div className="w-full h-full relative group">
      {imagem ? (
        <>
          <img src={imagem} alt={label} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 text-center">{label}</div>
          <button onClick={onDelete}
            className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 size={12} />
          </button>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-zena-green-light border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// ---------- Aba Anamnese ----------
function AbaAnamnese({ paciente, show }: { paciente: Paciente; show: any }) {
  const [anamnese, setAnamnese] = useState(paciente.anamnese || null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<AnamneseItem>({});
  const [saving, setSaving] = useState(false);

  const atividadeLabel: Record<string, string> = {
    sedentario: "Sedentário",
    leve: "Atividade leve (1-2x/semana)",
    moderado: "Moderado (3-4x/semana)",
    intenso: "Intenso (5+x/semana)",
  };

  function startEdit() {
    setForm(anamnese || {});
    setEditMode(true);
  }

  async function salvar() {
    setSaving(true);
    try {
      const res = await api.put(`/anamnese/paciente/${paciente.id}`, form);
      setAnamnese(res.data);
      setEditMode(false);
      show("Anamnese atualizada!");
    } catch {
      show("Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!anamnese && !editMode) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-zena-mint/30">
        <ClipboardList className="mx-auto text-zena-mint mb-3" size={40} />
        <p className="text-zena-text-mid font-medium">Anamnese não preenchida ainda.</p>
        <p className="text-zena-text-light text-sm mt-2 mb-4">
          A paciente pode preencher pelo link do portal, ou você pode preencher aqui.
        </p>
        <button onClick={startEdit} className="bg-zena-green-mid text-white px-5 py-2.5 rounded-xl text-sm font-medium">
          Preencher anamnese
        </button>
      </div>
    );
  }

  if (editMode) {
    const camposClinico = [
      { label: "Queixa principal", key: "queixaPrincipal" },
      { label: "Histórico de dietas", key: "historicoDieta" },
      { label: "Restrições / alergias", key: "restricoes" },
      { label: "Medicamentos em uso", key: "medicamentos" },
      { label: "Condições de saúde / patologias", key: "condicoesSaude" },
      { label: "Motivação", key: "motivacao" },
      { label: "Expectativas", key: "expectativas" },
    ];
    return (
      <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-zena-text-dark font-semibold">Editar anamnese</h3>
          <div className="flex gap-2">
            <button onClick={() => setEditMode(false)} className="flex items-center gap-1.5 text-sm text-zena-text-mid border border-zena-mint/50 px-3 py-1.5 rounded-xl hover:bg-zena-cream">
              <X size={14} /> Cancelar
            </button>
            <button onClick={salvar} disabled={saving} className="flex items-center gap-1.5 text-sm text-white bg-zena-green-dark px-3 py-1.5 rounded-xl hover:bg-zena-green-mid disabled:opacity-50">
              <Check size={14} /> {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {camposClinico.map(({ label, key }) => (
            <div key={key}>
              <label className="text-xs font-medium text-zena-text-mid mb-1 block">{label}</label>
              <textarea
                value={(form as any)[key] || ""}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light resize-none"
              />
            </div>
          ))}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zena-text-mid mb-1 block">Nível de atividade</label>
              <select
                value={(form as any).nivelAtividade || ""}
                onChange={(e) => setForm({ ...form, nivelAtividade: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light"
              >
                <option value="">Não informado</option>
                <option value="sedentario">Sedentário</option>
                <option value="leve">Leve (1-2x/semana)</option>
                <option value="moderado">Moderado (3-4x/semana)</option>
                <option value="intenso">Intenso (5+x/semana)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zena-text-mid mb-1 block">Consumo de água (L/dia)</label>
              <input
                type="number" step="0.1"
                value={(form as any).consumoAgua || ""}
                onChange={(e) => setForm({ ...form, consumoAgua: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 rounded-xl border border-zena-mint/50 bg-zena-cream text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const secoes = [
    {
      titulo: "Queixas e histórico",
      emoji: "🩺",
      items: [
        { label: "Queixa principal", val: anamnese!.queixaPrincipal },
        { label: "Histórico de dietas", val: anamnese!.historicoDieta },
        { label: "Restrições / alergias", val: anamnese!.restricoes },
        { label: "Medicamentos em uso", val: anamnese!.medicamentos },
        { label: "Condições de saúde", val: anamnese!.condicoesSaude },
      ],
    },
    {
      titulo: "Estilo de vida",
      emoji: "🏃",
      items: [
        { label: "Nível de atividade", val: anamnese!.nivelAtividade ? atividadeLabel[anamnese!.nivelAtividade] || anamnese!.nivelAtividade : null },
        { label: "Horas de sono", val: anamnese!.horasSono ? `${anamnese!.horasSono}h por noite` : null },
        { label: "Nível de estresse", val: anamnese!.nivelEstresse ? `${anamnese!.nivelEstresse}/5` : null },
      ],
    },
    {
      titulo: "Hábitos alimentares",
      emoji: "🥗",
      items: [
        { label: "Refeições por dia", val: anamnese!.refeicoesDia ? `${anamnese!.refeicoesDia} refeições` : null },
        { label: "Cozinha em casa?", val: anamnese!.comeCozinha !== null && anamnese!.comeCozinha !== undefined ? (anamnese!.comeCozinha ? "Sim" : "Não") : null },
        { label: "Come fora de casa", val: anamnese!.comeForaCasa !== null && anamnese!.comeForaCasa !== undefined ? `${anamnese!.comeForaCasa}x por semana` : null },
        { label: "Consumo de água", val: anamnese!.consumoAgua ? `${anamnese!.consumoAgua}L por dia` : null },
      ],
    },
    {
      titulo: "Motivação e expectativas",
      emoji: "💪",
      items: [
        { label: "Motivação", val: anamnese!.motivacao },
        { label: "Expectativas", val: anamnese!.expectativas },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={startEdit} className="flex items-center gap-1.5 text-sm text-zena-green-mid font-medium hover:text-zena-green-dark">
          <Pencil size={14} /> Editar anamnese
        </button>
      </div>
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
