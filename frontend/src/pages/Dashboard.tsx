import { useEffect, useState } from "react";
import { Users, DollarSign, Calendar, AlertCircle, Clock, CheckCircle, XCircle, MessageCircle, Bell, X, Zap, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../contexts/AuthContext";
import { useAlertas } from "../contexts/AlertasContext";
import StatCard from "../components/StatCard";
import WhatsAppModal from "../components/WhatsAppModal";
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

  return (
    <div className="p-4 sm:p-8">
      {/* Trial banner */}
      {billing?.emTrial && (
        <div className={`mb-6 rounded-2xl p-4 flex items-center justify-between gap-4 ${billing.diasRestantesTrial <= 3 ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
          <div className="flex items-center gap-3">
            <Zap size={18} className={`flex-shrink-0 ${billing.diasRestantesTrial <= 3 ? "text-red-600" : "text-amber-600"}`} />
            <p className={`text-sm font-medium ${billing.diasRestantesTrial <= 3 ? "text-red-700" : "text-amber-700"}`}>
              {billing.diasRestantesTrial <= 3
                ? <>Seu trial expira em <strong>{billing.diasRestantesTrial} dia{billing.diasRestantesTrial !== 1 ? "s" : ""}</strong>! Assine agora para não perder o acesso.</>
                : <>⚡ <strong>{billing.diasRestantesTrial} dias grátis</strong> restantes — sem cartão, cancele quando quiser.</>
              }
            </p>
          </div>
          <Link
            to="/app/planos"
            className={`flex-shrink-0 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${billing.diasRestantesTrial <= 3 ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}
          >
            {billing.diasRestantesTrial <= 3 ? "Assinar agora" : "Ver planos →"}
          </Link>
        </div>
      )}

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

      {/* Header */}
      <div className="mb-8">
        <p className="text-zena-text-light text-sm capitalize">{hoje}</p>
        <h1 className="text-zena-text-dark text-3xl font-bold mt-1">
          Olá, {nutricionista?.nome.split(" ")[0]} 👋
        </h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Pacientes ativos"
          value={loading ? "—" : data!.pacientesAtivos}
          sub="em acompanhamento"
          icon={<Users size={18} />}
          accent="green"
          loading={loading}
        />
        <StatCard
          title="Faturamento do mês"
          value={loading ? "—" : `R$ ${data!.faturamentoMes.toFixed(2).replace(".", ",")}`}
          sub={
            !loading && data!.faturamentoMes === 0
              ? <button onClick={() => navigate("/app/cobrancas")} className="text-zena-green-mid hover:underline flex items-center gap-0.5">Crie sua primeira cobrança <ChevronRight size={11} /></button>
              : `${pctRecebido}% recebido`
          }
          icon={<DollarSign size={18} />}
          accent="mint"
          loading={loading}
        />
        <StatCard
          title="Consultas hoje"
          value={loading ? "—" : data!.consultasHoje.length}
          sub={
            loading ? undefined
            : data!.consultasHoje.length === 0
              ? <button onClick={() => navigate("/app/pacientes")} className="text-zena-green-mid hover:underline flex items-center gap-0.5">Nenhuma agendada. Agendar agora <ChevronRight size={11} /></button>
              : `Próxima: ${format(new Date(data!.consultasHoje[0].data), "HH:mm")}`
          }
          icon={<Calendar size={18} />}
          accent="green"
          loading={loading}
        />
        <StatCard
          title="A receber"
          value={loading ? "—" : `R$ ${data!.aReceber.toFixed(2).replace(".", ",")}`}
          sub={data?.cobrancasVencidas ? `${data.cobrancasVencidas} vencida(s)` : "Em dia"}
          icon={<AlertCircle size={18} />}
          accent={data?.cobrancasVencidas ? "brown" : "mint"}
          loading={loading}
        />
      </div>

      {/* Lembretes do dia */}
      {lembretes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-amber-600" />
            <h2 className="text-amber-800 font-semibold">Lembretes de hoje ({lembretes.length})</h2>
          </div>
          <div className="space-y-2">
            {lembretes.map((l) => {
              const cfg = lembreteCfg[l.tipo];
              if (!cfg) return null;
              return (
                <div key={l.id} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-xl flex-shrink-0">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-zena-text-dark text-sm font-medium">{cfg.label}</p>
                    <p className="text-zena-text-light text-xs truncate">{l.paciente.nome}</p>
                  </div>
                  <button
                    onClick={() => abrirWA(
                      { id: l.paciente.id, nome: l.paciente.nome, telefone: l.paciente.telefone, linkUnico: l.paciente.linkUnico },
                      cfg.template,
                      undefined,
                      l.id
                    )}
                    className="flex items-center gap-1.5 text-xs text-[#25D366] font-medium bg-[#25D366]/10 hover:bg-[#25D366]/20 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                  >
                    <MessageCircle size={13} />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => ignorarLembrete(l.id)}
                    className="text-zena-text-light hover:text-zena-text-mid flex-shrink-0"
                    title="Ignorar"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Agenda do dia / Primeiros passos */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-zena-mint/30">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-4 p-3">
                  <div className="w-10 h-10 rounded-full bg-zena-mint/40" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zena-mint/40 rounded w-32" />
                    <div className="h-3 bg-zena-mint/20 rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : (() => {
            const isNewUser = data!.pacientesAtivos < 3 && data!.totalCobrancas === 0;
            const passos = [
              { label: "Cadastre seu primeiro paciente", desc: "Adicione nome, objetivo e dados de contato", done: data!.pacientesAtivos >= 1, to: "/app/pacientes", btn: "Cadastrar →" },
              { label: "Configure sua cobrança", desc: "Conecte sua conta Asaas para receber pelo Pix", done: data!.asaasConectado, to: "/app/financeiro", btn: "Configurar →" },
              { label: "Agende uma consulta", desc: "Defina sua disponibilidade e agende o primeiro retorno", done: data!.totalConsultas >= 1, to: "/app/horarios", btn: "Agendar →" },
            ];
            const todosConcluidos = passos.every((p) => p.done);
            const showChecklist = isNewUser && !onboardingHidden && data!.consultasHoje.length === 0;

            if (showChecklist) {
              return (
                <div className={`transition-all duration-700 ${onboardingFading ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"}`}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-zena-green-light/20 flex items-center justify-center">
                      <Zap size={16} className="text-zena-green-mid" />
                    </div>
                    <div>
                      <h2 className="text-zena-text-dark font-semibold text-lg leading-tight">Comece agora</h2>
                      <p className="text-zena-text-light text-xs">3 passos rápidos para começar</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {passos.map((p, i) => (
                      <div key={p.label} className={`p-4 rounded-xl border transition-all ${p.done ? "border-zena-green-light/30 bg-zena-green-light/5" : "border-zena-mint/40 bg-zena-cream/40"}`}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${p.done ? "bg-zena-green-mid border-zena-green-mid" : "border-zena-mint"}`}>
                            {p.done ? <CheckCircle size={11} className="text-white" /> : <span className="text-[9px] text-zena-text-light font-bold">{i + 1}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${p.done ? "text-zena-text-light line-through" : "text-zena-text-dark"}`}>{p.label}</p>
                            {!p.done && <p className="text-zena-text-light text-xs mt-0.5">{p.desc}</p>}
                          </div>
                          {!p.done && (
                            <Link to={p.to} className="flex-shrink-0 bg-zena-green-dark hover:bg-zena-green-mid text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                              {p.btn}
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {todosConcluidos && (
                    <div className="mt-5 text-center">
                      <p className="text-zena-green-mid font-semibold text-sm">Parabéns! Tudo pronto para começar 🎉</p>
                    </div>
                  )}
                </div>
              );
            }

            if (data!.consultasHoje.length === 0) {
              return (
                <>
                  <h2 className="text-zena-text-dark font-semibold text-lg mb-4">Agenda de hoje</h2>
                  <div className="text-center py-12">
                    <Calendar className="mx-auto text-zena-mint mb-3" size={40} />
                    <p className="text-zena-text-light text-sm">Nenhuma consulta agendada para hoje.</p>
                    <p className="text-zena-text-light text-xs mt-1">Aproveite para atualizar os planos das suas pacientes!</p>
                  </div>
                </>
              );
            }

            return (
              <>
                <h2 className="text-zena-text-dark font-semibold text-lg mb-4">Agenda de hoje</h2>
                <div className="space-y-2">
                  {data!.consultasHoje.map((consulta) => {
                    const cfg = statusConfig[consulta.status] || statusConfig["agendada"];
                    const StatusIcon = cfg.icon;
                    const dataFormatada = format(new Date(consulta.data), "dd/MM 'às' HH:mm");
                    return (
                      <div key={consulta.id} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-zena-cream transition-colors">
                        <div className="w-10 h-10 rounded-full bg-zena-green-light/20 flex items-center justify-center text-zena-green-dark font-bold text-sm flex-shrink-0">
                          {getInitials(consulta.paciente.nome)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-zena-text-dark font-medium text-sm truncate">{consulta.paciente.nome}</p>
                          <p className="text-zena-text-light text-xs">{format(new Date(consulta.data), "HH:mm")}</p>
                        </div>
                        <span className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.color}`}>
                          <StatusIcon size={12} />
                          {cfg.label}
                        </span>
                        <button
                          onClick={() => abrirWA(
                            { id: consulta.paciente.id, nome: consulta.paciente.nome, telefone: consulta.paciente.telefone, linkUnico: consulta.paciente.linkUnico },
                            "lembrete_consulta",
                            dataFormatada
                          )}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs text-[#25D366] font-medium hover:bg-[#25D366]/10 px-2.5 py-1.5 rounded-lg"
                        >
                          <MessageCircle size={14} />
                          <span className="hidden lg:inline">Lembrete</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>

        {/* Alertas — dinâmicos */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-zena-mint/30 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-zena-text-dark font-semibold text-lg">Alertas</h2>
            {alertasVisiveis.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center">
                {alertasVisiveis.length}
              </span>
            )}
          </div>

          {loadingAlertas ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-zena-mint/20 rounded-xl" />)}
            </div>
          ) : alertasVisiveis.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="text-zena-green-light mb-2" size={34} />
              <p className="text-zena-text-mid font-medium text-sm">Tudo em ordem!</p>
              <p className="text-zena-text-light text-xs mt-1">Nenhum alerta pendente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertasVisiveis.map((alerta) => {
                const cfg = ALERTA_CFG[alerta.tipo] ?? ALERTA_CFG.sem_consulta;
                return (
                  <div key={alerta.id} className={`flex items-start gap-2.5 p-3 rounded-xl border ${cfg.ringCls}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                    <p className={`flex-1 text-xs leading-snug ${cfg.textCls}`}>{alerta.texto}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleAlertaAction(alerta)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${cfg.btnCls}`}
                      >
                        {alerta.acao}
                      </button>
                      <button
                        onClick={() => dispensarAlerta(alerta.id)}
                        className="text-zena-text-light hover:text-zena-text-mid p-0.5"
                        title="Dispensar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loadingAlertas && alertasVisiveis.length > 0 && (
            <p className="text-zena-text-light text-[10px] mt-4 text-center">
              Clicar em "Cobrar" / "Chamar" / "Lembrar" abre o WhatsApp direto.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
