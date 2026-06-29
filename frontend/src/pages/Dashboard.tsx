import { useEffect, useState } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Users, DollarSign, Calendar, AlertCircle, Clock, CheckCircle, XCircle, MessageCircle, Bell, X, Zap, ChevronRight, FileText, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../contexts/AuthContext";
import { useAlertas } from "../contexts/AlertasContext";
import StatCard from "../components/StatCard";
import WhatsAppModal from "../components/WhatsAppModal";
import { QuoteInline } from "../components/DailyQuoteCard";
import api from "../lib/api";
import { type TemplateWhatsApp } from "../lib/utils";

interface ConsultaHoje {
  id: string;
  data: string;
  status: string;
  paciente: { id: string; nome: string; telefone?: string; linkUnico: string };
}

interface DashboardData {
  pacientesAtivos: number;
  faturamentoMes: number;
  recebidoMes: number;
  aReceber: number;
  consultasHoje: ConsultaHoje[];
  cobrancasVencidas: number;
  pacientesSemConsulta: Array<{ id: string; nome: string; linkUnico: string; telefone?: string }>;
  totalConsultas: number;
  asaasConectado: boolean;
  totalCobrancas: number;
  totalPlanos: number;
  evolucaoPeso: { pct: number; sparkline: number[]; totalComMedicoes: number };
  novosPacientesMes: number;
  adesaoPlanos: number;
  evolucaoSemanal: Array<{ semana: string; label: string; pesoMedio: number }>;
  proximosAtendimentos: Array<{ id: string; data: string; pacienteNome: string; status: string }>;
  planosMaisUsados: Array<{ nome: string; count: number }>;
}

interface Lembrete {
  id: string;
  tipo: string;
  referencia?: string;
  paciente: { id: string; nome: string; telefone?: string; linkUnico: string };
}

interface WAState {
  paciente: { id: string; nome: string; telefone?: string; linkUnico: string };
  template: TemplateWhatsApp;
  consultaData?: string;
  lembreteId?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  confirmada: { label: "Confirmada", color: "text-zena-green-light bg-zena-green-light/10", icon: CheckCircle },
  agendada: { label: "Agendada", color: "text-zena-green-mid bg-zena-mint/30", icon: Clock },
  cancelada: { label: "Cancelada", color: "text-zena-brown bg-zena-brown/10", icon: XCircle },
  remarcacao_solicitada: { label: "Remarcar", color: "text-yellow-600 bg-yellow-50", icon: AlertCircle },
  aguardando_confirmacao: { label: "Aguardando", color: "text-blue-600 bg-blue-50", icon: Clock },
};

const lembreteCfg: Record<string, { emoji: string; label: string; template: TemplateWhatsApp }> = {
  consulta_24h: { emoji: "📅", label: "Consulta amanhã", template: "lembrete_consulta" },
  checkin_semanal: { emoji: "✨", label: "Lembrete de check-in", template: "lembrete_checkin" },
  cobranca_vencida: { emoji: "💚", label: "Cobrança vencida hoje", template: "lembrete_cobranca" },
};

interface Alerta {
  id: string;
  tipo: string;
  prioridade: number;
  texto: string;
  acao: string;
  link: string;
  template?: string;
  paciente?: { id: string; nome: string; telefone?: string; linkUnico: string };
}

const ALERTA_CFG: Record<string, { dot: string; ringCls: string; textCls: string; btnCls: string }> = {
  cobranca_vencida:  { dot: "bg-red-500",     ringCls: "bg-red-50 border-red-200",         textCls: "text-red-800",     btnCls: "bg-red-100 hover:bg-red-200 text-red-700" },
  sem_consulta:      { dot: "bg-amber-500",   ringCls: "bg-amber-50 border-amber-200",     textCls: "text-amber-800",   btnCls: "bg-amber-100 hover:bg-amber-200 text-amber-700" },
  consulta_proxima:  { dot: "bg-amber-400",   ringCls: "bg-amber-50 border-amber-200",     textCls: "text-amber-800",   btnCls: "bg-amber-100 hover:bg-amber-200 text-amber-700" },
  cobranca_vencendo: { dot: "bg-emerald-500", ringCls: "bg-emerald-50 border-emerald-200", textCls: "text-emerald-800", btnCls: "bg-emerald-100 hover:bg-emerald-200 text-emerald-700" },
  aniversario:       { dot: "bg-emerald-400", ringCls: "bg-emerald-50 border-emerald-200", textCls: "text-emerald-800", btnCls: "bg-emerald-100 hover:bg-emerald-200 text-emerald-700" },
};

const WA_TIPOS = new Set(["cobranca_vencida", "cobranca_vencendo", "sem_consulta", "consulta_proxima"]);

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

interface BillingStatus {
  emTrial: boolean;
  diasRestantesTrial: number;
  planoAtivo: boolean;
  plano: string;
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width={100} height={40}>
      <LineChart data={pts} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Line type="monotone" dataKey="v" stroke="#1C4A2E" strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function fmtMoney(v: number) {
  if (v >= 10000) return `R$ ${(v / 1000).toFixed(0)}k`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return `R$ ${v.toFixed(0)}`;
}

export default function Dashboard() {
  const { nutricionista } = useAuth();
  const { setCount: setAlertCount } = useAlertas();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [waState, setWaState] = useState<WAState | null>(null);
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [onboardingFading, setOnboardingFading] = useState(false);
  const [onboardingHidden, setOnboardingHidden] = useState(false);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loadingAlertas, setLoadingAlertas] = useState(true);
  const [dispensados, setDispensados] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get("/dashboard").then((res) => {
      setData(res.data);
      setLoading(false);
    });
    api.get("/lembretes?status=pendente").then((res) => setLembretes(res.data));
    api.get<BillingStatus>("/billing/status").then((res) => setBilling(res.data)).catch(() => null);
    api.get<Alerta[]>("/dashboard/alertas").then((res) => {
      setAlertas(res.data);
      setAlertCount(res.data.length);
    }).catch(() => null).finally(() => setLoadingAlertas(false));
  }, []);

  const pctRecebido = data ? Math.round((data.recebidoMes / (data.faturamentoMes || 1)) * 100) : 0;
  const hoje = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const firstName = nutricionista?.nome.split(" ")[0] ?? "";
  const initials = getInitials(nutricionista?.nome ?? "?");

  function abrirWA(paciente: WAState["paciente"], template: TemplateWhatsApp, consultaData?: string, lembreteId?: string) {
    setWaState({ paciente, template, consultaData, lembreteId });
  }

  async function onWAClose() {
    if (waState?.lembreteId) {
      await api.patch(`/lembretes/${waState.lembreteId}`, { status: "enviado" });
      setLembretes((prev) => prev.filter((l) => l.id !== waState.lembreteId));
    }
    setWaState(null);
  }

  async function ignorarLembrete(id: string) {
    await api.patch(`/lembretes/${id}`, { status: "ignorado" });
    setLembretes((prev) => prev.filter((l) => l.id !== id));
  }

  useEffect(() => {
    if (!data || onboardingHidden || onboardingFading) return;
    const isNewUser = data.pacientesAtivos < 3 && data.totalCobrancas === 0;
    if (!isNewUser) return;
    if (data.pacientesAtivos >= 1 && data.asaasConectado && data.totalConsultas >= 1) {
      setOnboardingFading(true);
      const t = setTimeout(() => setOnboardingHidden(true), 700);
      return () => clearTimeout(t);
    }
  }, [data, onboardingHidden, onboardingFading]);

  function dispensarAlerta(id: string) {
    const novos = new Set(dispensados).add(id);
    setDispensados(novos);
    const visiveis = alertas.filter((a) => !novos.has(a.id));
    setAlertCount(visiveis.length);
  }

  function handleAlertaAction(alerta: Alerta) {
    if (WA_TIPOS.has(alerta.tipo) && alerta.paciente && alerta.template) {
      abrirWA(
        { id: alerta.paciente.id, nome: alerta.paciente.nome, telefone: alerta.paciente.telefone, linkUnico: alerta.paciente.linkUnico },
        alerta.template as TemplateWhatsApp,
      );
    } else {
      navigate(`/app${alerta.link}`);
    }
    dispensarAlerta(alerta.id);
  }

  const alertasVisiveis = alertas.filter((a) => !dispensados.has(a.id)).slice(0, 5);

  // Onboarding passos (shared between mobile and desktop)
  const onboardingPassos = data ? [
    { label: "Cadastre seu primeiro paciente", desc: "Adicione nome, objetivo e dados de contato", done: data.pacientesAtivos >= 1, to: "/app/pacientes", btn: "Cadastrar →" },
    { label: "Configure sua cobrança", desc: "Conecte sua conta Asaas para receber pelo Pix", done: data.asaasConectado, to: "/app/financeiro", btn: "Configurar →" },
    { label: "Agende uma consulta", desc: "Defina sua disponibilidade e agende o primeiro retorno", done: data.totalConsultas >= 1, to: "/app/horarios", btn: "Agendar →" },
  ] : [];
  const onboardingTodosConcluidos = onboardingPassos.every((p) => p.done);
  const isNewUser = data ? data.pacientesAtivos < 3 && data.totalCobrancas === 0 : false;
  const showOnboarding = isNewUser && !onboardingHidden;

  return (
    <div>
      {/* WhatsApp modal — global, above both layouts */}
      {waState && nutricionista && (
        <WhatsAppModal
          context={{
            pacienteId: waState.paciente.id,
            pacienteNome: waState.paciente.nome,
            pacienteTelefone: waState.paciente.telefone,
            pacienteLinkUnico: waState.paciente.linkUnico,
            nutricionistaNome: nutricionista.nome,
            consultaData: waState.consultaData,
          }}
          template={waState.template}
          onClose={onWAClose}
        />
      )}

      {/* ━━━ MOBILE LAYOUT ━━━ */}
      <div className="md:hidden bg-white min-h-screen px-5 pt-10 pb-28">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="min-w-0 flex-1 mr-4">
            <h1 className="text-[28px] font-bold text-[#111] leading-tight tracking-tight">
              Olá, {firstName}! 👋
            </h1>
            {data?.consultasHoje[0] ? (
              <p className="text-[13px] font-medium mt-0.5" style={{ color: "#1B4332" }}>
                Próxima consulta: {data.consultasHoje[0].paciente.nome.split(" ")[0]} às{" "}
                {new Date(data.consultasHoje[0].data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            ) : (
              <p className="text-[13px] text-[#999] mt-0.5">Tenha um dia incrível!</p>
            )}
            <QuoteInline />
          </div>
          {nutricionista?.logoConsultorio ? (
            <img
              src={nutricionista.logoConsultorio}
              alt={firstName}
              className="w-12 h-12 rounded-full object-cover bg-[#F5F5F3] flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-zena-green-dark flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">{initials}</span>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-[#F5F5F3] rounded-2xl px-5 py-5 animate-pulse">
                <div className="h-3 w-36 bg-[#E0E0DC] rounded mb-4" />
                <div className="h-12 w-14 bg-[#E0E0DC] rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Card 1 — Atendimentos hoje */}
            <div className="bg-[#F5F5F3] rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#E0F2E9" }}>
                <Calendar size={20} style={{ color: "#1B4332" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#999] font-medium">Atendimentos hoje</p>
                <div className="flex items-end justify-between mt-0.5">
                  <span className="text-[46px] font-bold text-[#111] leading-none tabular-nums">
                    {String(data!.consultasHoje.length).padStart(2, "0")}
                  </span>
                  <Link to="/app/horarios" className="text-[12px] font-semibold pb-1" style={{ color: "#1B4332" }}>
                    ver agenda →
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 2 — Pacientes ativos */}
            <div className="bg-[#F5F5F3] rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#E0F2E9" }}>
                <Users size={20} style={{ color: "#1B4332" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#999] font-medium">Pacientes ativos</p>
                <div className="flex items-end justify-between mt-0.5">
                  <span className="text-[46px] font-bold text-[#111] leading-none tabular-nums">
                    {data!.pacientesAtivos}
                  </span>
                  <Link to="/app/pacientes" className="text-[12px] font-semibold pb-1" style={{ color: "#1B4332" }}>
                    ver todos →
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 3 — Faturamento */}
            <div className="bg-[#F5F5F3] rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#E0F2E9" }}>
                <DollarSign size={20} style={{ color: "#1B4332" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] text-[#999] font-medium">Faturamento do mês</p>
                  {pctRecebido > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#E0F2E9", color: "#1B4332" }}>
                      {pctRecebido}% recebido
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between mt-0.5">
                  <span className={`font-bold text-[#111] leading-none tabular-nums ${data!.faturamentoMes >= 10000 ? "text-[34px]" : "text-[44px]"}`}>
                    {fmtMoney(data!.faturamentoMes)}
                  </span>
                  <Link to="/app/financeiro" className="text-[12px] font-semibold pb-1" style={{ color: "#1B4332" }}>
                    ver financeiro →
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 4 — Planos alimentares */}
            <div className="bg-[#F5F5F3] rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#E0F2E9" }}>
                <FileText size={20} style={{ color: "#1B4332" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#999] font-medium">Planos alimentares</p>
                <div className="flex items-end justify-between mt-0.5">
                  <span className="text-[46px] font-bold text-[#111] leading-none tabular-nums">
                    {data!.totalPlanos}
                  </span>
                  <Link to="/app/pacientes" className="text-[12px] font-semibold pb-1" style={{ color: "#1B4332" }}>
                    ver pacientes →
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 5 — Evolução dos pacientes */}
            <div className="bg-[#F5F5F3] rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#E0F2E9" }}>
                <TrendingUp size={20} style={{ color: "#1B4332" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#999] font-medium">Evolução dos pacientes</p>
                <div className="flex items-end justify-between mt-0.5">
                  <div>
                    <span className="text-[46px] font-bold text-[#111] leading-none">
                      {data!.evolucaoPeso.totalComMedicoes > 0 ? `${data!.evolucaoPeso.pct}%` : "—"}
                    </span>
                    {data!.evolucaoPeso.totalComMedicoes > 0 && (
                      <p className="text-[11px] text-[#bbb] mt-0.5">perderam peso</p>
                    )}
                  </div>
                  <Sparkline data={data!.evolucaoPeso.sparkline} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onboarding checklist — só para usuários novos */}
        {!loading && showOnboarding && (
          <div className={`mt-4 bg-[#F5F5F3] rounded-2xl p-5 transition-all duration-700 ${onboardingFading ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"}`}>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={15} className="text-zena-green-mid" />
              <p className="text-[13px] font-semibold text-[#333]">Comece agora — 3 passos rápidos</p>
            </div>
            <div className="space-y-3">
              {onboardingPassos.map((p, i) => (
                <div key={p.label} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${p.done ? "bg-zena-green-mid border-zena-green-mid" : "border-[#ccc]"}`}>
                    {p.done ? <CheckCircle size={11} className="text-white" /> : <span className="text-[9px] text-[#999] font-bold">{i + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium ${p.done ? "text-[#bbb] line-through" : "text-[#333]"}`}>{p.label}</p>
                    {!p.done && <p className="text-[11px] text-[#999] mt-0.5">{p.desc}</p>}
                  </div>
                  {!p.done && (
                    <Link to={p.to} className="flex-shrink-0 text-[11px] text-zena-green-dark font-medium whitespace-nowrap">
                      {p.btn}
                    </Link>
                  )}
                </div>
              ))}
            </div>
            {onboardingTodosConcluidos && (
              <p className="text-[12px] text-zena-green-mid font-medium mt-4 text-center">Parabéns! Tudo pronto 🎉</p>
            )}
          </div>
        )}

        {/* Lembretes */}
        {lembretes.length > 0 && (
          <div className="mt-4">
            <p className="text-[13px] text-[#999] font-normal mb-3 px-1">Lembretes de hoje</p>
            <div className="space-y-2">
              {lembretes.map((l) => {
                const cfg = lembreteCfg[l.tipo];
                if (!cfg) return null;
                return (
                  <div key={l.id} className="bg-[#F5F5F3] rounded-2xl px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#333] font-medium">{cfg.label}</p>
                        <p className="text-[12px] text-[#999] mt-0.5 truncate">{l.paciente.nome}</p>
                      </div>
                      <button
                        onClick={() => abrirWA(
                          { id: l.paciente.id, nome: l.paciente.nome, telefone: l.paciente.telefone, linkUnico: l.paciente.linkUnico },
                          cfg.template, undefined, l.id
                        )}
                        className="text-[12px] text-[#25D366] font-medium flex-shrink-0"
                      >
                        WhatsApp →
                      </button>
                      <button onClick={() => ignorarLembrete(l.id)} className="flex-shrink-0">
                        <X size={14} className="text-[#ccc]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Alertas */}
        {!loadingAlertas && alertasVisiveis.length > 0 && (
          <div className="mt-4">
            <p className="text-[13px] text-[#999] font-normal mb-3 px-1">Alertas</p>
            <div className="space-y-2">
              {alertasVisiveis.map((alerta) => (
                <div key={alerta.id} className="bg-[#F5F5F3] rounded-2xl px-5 py-4">
                  <p className="text-[13px] text-[#333] leading-snug">{alerta.texto}</p>
                  <div className="flex items-center gap-4 mt-2.5">
                    <button onClick={() => handleAlertaAction(alerta)} className="text-[12px] text-zena-green-dark font-medium">
                      {alerta.acao} →
                    </button>
                    <button onClick={() => dispensarAlerta(alerta.id)} className="text-[11px] text-[#bbb]">
                      dispensar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ━━━ DESKTOP LAYOUT ━━━ */}
      <div className="hidden md:block bg-zena-cream min-h-screen p-8">

        {/* Welcome header */}
        <div className="flex items-center justify-between mb-8">
          <div className="min-w-0 flex-1 mr-6">
            <h1 className="text-[28px] font-semibold text-[#1C4A2E] leading-tight">Olá, {firstName}!</h1>
            <p className="text-[14px] font-normal text-[#999] mt-1">Tenha um dia incrível! 👋</p>
            <QuoteInline />
          </div>
          {nutricionista?.logoConsultorio ? (
            <img
              src={nutricionista.logoConsultorio}
              alt={firstName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#1C4A2E] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[13px] font-semibold">{initials}</span>
            </div>
          )}
        </div>

        {/* ── KPI Row ── */}
        {loading ? (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-3 w-28 bg-[#F0F0EE] rounded mb-4" />
                <div className="h-8 w-16 bg-[#F0F0EE] rounded mb-2" />
                <div className="h-3 w-20 bg-[#F0F0EE] rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {/* Pacientes ativos */}
            <div className="bg-white rounded-xl p-6 border border-[#E8F0EC] shadow-[0_1px_4px_rgba(27,67,50,0.06)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#E0F2E9" }}>
                  <Users size={14} style={{ color: "#1B4332" }} />
                </div>
                <p className="text-[12px] text-[#999] font-medium">Pacientes ativos</p>
              </div>
              <p className="text-[36px] font-bold text-[#111] leading-none tabular-nums mb-2">{data!.pacientesAtivos}</p>
              {data!.novosPacientesMes > 0 && (
                <p className="text-[12px] font-semibold" style={{ color: "#1B4332" }}>+{data!.novosPacientesMes} este mês</p>
              )}
            </div>

            {/* Atendimentos hoje */}
            <div className="bg-white rounded-xl p-6 border border-[#E8F0EC] shadow-[0_1px_4px_rgba(27,67,50,0.06)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#E0F2E9" }}>
                  <Calendar size={14} style={{ color: "#1B4332" }} />
                </div>
                <p className="text-[12px] text-[#999] font-medium">Atendimentos hoje</p>
              </div>
              <p className="text-[36px] font-bold text-[#111] leading-none tabular-nums mb-2">
                {String(data!.consultasHoje.length).padStart(2, "0")}
              </p>
              <Link to="/app/horarios" className="text-[12px] font-semibold" style={{ color: "#1B4332" }}>ver agenda →</Link>
            </div>

            {/* Novos pacientes */}
            <div className="bg-white rounded-xl p-6 border border-[#E8F0EC] shadow-[0_1px_4px_rgba(27,67,50,0.06)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#E0F2E9" }}>
                  <TrendingUp size={14} style={{ color: "#1B4332" }} />
                </div>
                <p className="text-[12px] text-[#999] font-medium">Novos pacientes</p>
              </div>
              <p className="text-[36px] font-bold text-[#111] leading-none tabular-nums mb-2">{data!.novosPacientesMes}</p>
              <p className="text-[12px] text-[#bbb]">este mês</p>
            </div>

            {/* Faturamento */}
            <div className="rounded-xl p-6 border shadow-[0_1px_4px_rgba(27,67,50,0.08)]" style={{ background: "#1B4332", borderColor: "#1B4332" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <DollarSign size={14} className="text-white" />
                </div>
                <p className="text-[12px] text-white/60 font-medium">Faturamento</p>
              </div>
              <p className="text-[26px] font-bold text-white leading-none tabular-nums mb-2">
                {`R$ ${data!.faturamentoMes.toFixed(2).replace(".", ",")}`}
              </p>
              {pctRecebido > 0 && (
                <p className="text-[12px] font-semibold text-zena-mint">{pctRecebido}% recebido este mês</p>
              )}
            </div>
          </div>
        )}

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-3 gap-4 mb-4">

          {/* Evolução — Area chart (2/3) */}
          <div className="col-span-2 bg-white rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-[13px] font-medium text-[#333] mb-5">Evolução dos pacientes</p>
            {loading || !data ? (
              <div className="h-[180px] bg-[#F8F8F6] rounded-lg animate-pulse" />
            ) : data.evolucaoSemanal.length < 2 ? (
              <div className="h-[180px] flex items-center justify-center">
                <p className="text-[13px] text-[#bbb]">Sem dados de medições ainda</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data.evolucaoSemanal} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="evolGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1C4A2E" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#1C4A2E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#bbb" }} tickLine={false} axisLine={false} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#bbb" }} tickLine={false} axisLine={false} width={40} />
                    <Area type="monotone" dataKey="pesoMedio" stroke="#1C4A2E" strokeWidth={1.5} fill="url(#evolGrad)" dot={{ fill: "#1C4A2E", r: 2.5, strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <Link to="/app/pacientes" className="text-[12px] text-zena-green-dark mt-3 inline-block">
                  ver relatórios completos →
                </Link>
              </>
            )}
          </div>

          {/* Adesão aos planos — Donut (1/3) */}
          <div className="bg-white rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center">
            <p className="text-[13px] font-medium text-[#333] mb-4 self-start">Adesão aos planos</p>
            {loading || !data ? (
              <div className="w-36 h-36 rounded-full bg-[#F8F8F6] animate-pulse" />
            ) : (
              <>
                <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Com adesão", value: data.adesaoPlanos },
                          { name: "Sem adesão", value: 100 - data.adesaoPlanos },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={68}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        strokeWidth={0}
                        isAnimationActive={false}
                      >
                        <Cell fill="#1C4A2E" />
                        <Cell fill="#F0F0EE" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-[28px] font-light text-[#111] leading-none tabular-nums">{data.adesaoPlanos}%</p>
                  </div>
                </div>
                <p className="text-[12px] text-[#bbb] mt-3 text-center">dos pacientes com adesão</p>
              </>
            )}
          </div>
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Próximos atendimentos */}
          <div className="bg-white rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-[13px] font-medium text-[#333] mb-4">Próximos atendimentos</p>
            {loading || !data ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-[#F8F8F6] rounded animate-pulse" />)}
              </div>
            ) : data.proximosAtendimentos.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[13px] text-[#bbb]">Nenhum atendimento agendado</p>
                <Link to="/app/horarios" className="text-[12px] text-zena-green-dark mt-2 inline-block">agendar →</Link>
              </div>
            ) : (
              <>
                <div className="divide-y divide-[#F5F5F3]">
                  {data.proximosAtendimentos.map((c) => {
                    const d = new Date(c.data);
                    const hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                    const dia = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
                    const statusLabel = statusConfig[c.status]?.label ?? c.status;
                    return (
                      <div key={c.id} className="flex items-center gap-3 py-3">
                        <div className="text-right flex-shrink-0 w-14">
                          <p className="text-[13px] font-medium text-[#111]">{hora}</p>
                          <p className="text-[11px] text-[#bbb] capitalize">{dia}</p>
                        </div>
                        <p className="flex-1 text-[13px] text-[#333] truncate">{c.pacienteNome}</p>
                        <p className="text-[12px] text-[#bbb] flex-shrink-0">{statusLabel}</p>
                      </div>
                    );
                  })}
                </div>
                <Link to="/app/horarios" className="text-[12px] text-zena-green-dark mt-3 inline-block">
                  ver todos →
                </Link>
              </>
            )}
          </div>

          {/* Planos mais usados */}
          <div className="bg-white rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-[13px] font-medium text-[#333] mb-4">Planos alimentares</p>
            {loading || !data ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-[#F8F8F6] rounded animate-pulse" />)}
              </div>
            ) : data.planosMaisUsados.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[13px] text-[#bbb]">Nenhum plano criado ainda</p>
                <Link to="/app/pacientes" className="text-[12px] text-zena-green-dark mt-2 inline-block">criar plano →</Link>
              </div>
            ) : (
              <div className="divide-y divide-[#F5F5F3]">
                {data.planosMaisUsados.map((p) => (
                  <div key={p.nome} className="flex items-center justify-between py-3">
                    <p className="text-[13px] text-[#333] truncate flex-1 mr-4">{p.nome.split(" ").slice(0, 2).join(" ")}</p>
                    <p className="text-[13px] text-[#bbb] flex-shrink-0 tabular-nums">
                      {p.count} {p.count === 1 ? "plano" : "planos"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
