import { useEffect, useState } from "react";
import { Users, DollarSign, Calendar, AlertCircle, Clock, CheckCircle, XCircle, MessageCircle, Bell, X, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../contexts/AuthContext";
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [waState, setWaState] = useState<WAState | null>(null);
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  useEffect(() => {
    api.get("/dashboard").then((res) => {
      setData(res.data);
      setLoading(false);
    });
    api.get("/lembretes?status=pendente").then((res) => setLembretes(res.data));
    api.get<BillingStatus>("/billing/status").then((res) => setBilling(res.data)).catch(() => null);
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

  return (
    <div className="p-8">
      {/* Trial banner */}
      {billing?.emTrial && (
        <div className={`mb-6 rounded-2xl p-4 flex items-center justify-between gap-4 ${billing.diasRestantesTrial <= 3 ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
          <div className="flex items-center gap-3">
            <Zap size={18} className={`flex-shrink-0 ${billing.diasRestantesTrial <= 3 ? "text-red-600" : "text-amber-600"}`} />
            <p className={`text-sm font-medium ${billing.diasRestantesTrial <= 3 ? "text-red-700" : "text-amber-700"}`}>
              {billing.diasRestantesTrial <= 3
                ? <>Seu trial expira em <strong>{billing.diasRestantesTrial} dia{billing.diasRestantesTrial !== 1 ? "s" : ""}</strong>! Assine agora para não perder o acesso.</>
                : <>Você está no período gratuito — <strong>{billing.diasRestantesTrial} dias</strong> restantes. Aproveite para explorar tudo!</>
              }
            </p>
          </div>
          <Link
            to="/app/billing"
            className={`flex-shrink-0 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${billing.diasRestantesTrial <= 3 ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}
          >
            {billing.diasRestantesTrial <= 3 ? "Assinar agora" : "Ver planos"}
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
          sub={`${pctRecebido}% recebido`}
          icon={<DollarSign size={18} />}
          accent="mint"
          loading={loading}
        />
        <StatCard
          title="Consultas hoje"
          value={loading ? "—" : data!.consultasHoje.length}
          sub={data?.consultasHoje[0] ? `Próxima: ${format(new Date(data.consultasHoje[0].data), "HH:mm")}` : "Nenhuma hoje"}
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
        {/* Agenda do dia */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-zena-mint/30">
          <h2 className="text-zena-text-dark font-semibold text-lg mb-4">Agenda de hoje</h2>
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
          ) : data?.consultasHoje.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto text-zena-mint mb-3" size={40} />
              <p className="text-zena-text-light text-sm">Nenhuma consulta agendada para hoje.</p>
              <p className="text-zena-text-light text-xs mt-1">Aproveite para atualizar os planos das suas pacientes!</p>
            </div>
          ) : (
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
          )}
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-zena-mint/30">
          <h2 className="text-zena-text-dark font-semibold text-lg mb-4">Alertas</h2>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map((i) => <div key={i} className="h-16 bg-zena-mint/20 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {data!.cobrancasVencidas > 0 && (
                <div className="bg-zena-brown/10 border border-zena-brown/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={14} className="text-zena-brown" />
                    <span className="text-zena-brown font-medium text-sm">Cobranças vencidas</span>
                  </div>
                  <p className="text-zena-text-mid text-xs">{data!.cobrancasVencidas} cobrança(s) vencida(s) este mês.</p>
                </div>
              )}
              {data!.pacientesSemConsulta.length > 0 && (
                <div className="bg-zena-sand border border-zena-brown/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-zena-text-mid" />
                    <span className="text-zena-text-mid font-medium text-sm">Sem consulta recente</span>
                  </div>
                  <div className="space-y-1.5">
                    {data!.pacientesSemConsulta.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2">
                        <p className="text-zena-text-light text-xs truncate">{p.nome.split(" ")[0]}</p>
                        <button
                          onClick={() => abrirWA({ id: p.id, nome: p.nome, telefone: p.telefone, linkUnico: p.linkUnico }, "lembrete_checkin")}
                          className="flex-shrink-0 flex items-center gap-1 text-[10px] text-[#25D366] font-medium hover:underline"
                        >
                          <MessageCircle size={11} />
                          Chamar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data!.cobrancasVencidas === 0 && data!.pacientesSemConsulta.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto text-zena-green-light mb-2" size={32} />
                  <p className="text-zena-text-light text-sm">Tudo em ordem!</p>
                </div>
              )}
            </div>
          )}

          {!loading && (
            <div className="mt-4 pt-4 border-t border-zena-cream">
              <p className="text-zena-text-light text-xs font-medium mb-2">Ações rápidas WhatsApp</p>
              <div className="space-y-1.5">
                {data?.pacientesSemConsulta[0] && (
                  <button
                    onClick={() => abrirWA({ id: data.pacientesSemConsulta[0].id, nome: data.pacientesSemConsulta[0].nome, telefone: data.pacientesSemConsulta[0].telefone, linkUnico: data.pacientesSemConsulta[0].linkUnico }, "lembrete_checkin")}
                    className="w-full flex items-center gap-2 text-xs text-[#25D366] font-medium hover:bg-[#25D366]/5 px-3 py-2 rounded-lg transition-colors"
                  >
                    <MessageCircle size={13} />
                    Lembrete de check-in
                  </button>
                )}
                {data?.consultasHoje[0] && (
                  <button
                    onClick={() => abrirWA({ id: data.consultasHoje[0].paciente.id, nome: data.consultasHoje[0].paciente.nome, telefone: data.consultasHoje[0].paciente.telefone, linkUnico: data.consultasHoje[0].paciente.linkUnico }, "lembrete_consulta", format(new Date(data.consultasHoje[0].data), "dd/MM 'às' HH:mm"))}
                    className="w-full flex items-center gap-2 text-xs text-[#25D366] font-medium hover:bg-[#25D366]/5 px-3 py-2 rounded-lg transition-colors"
                  >
                    <MessageCircle size={13} />
                    Lembrete de consulta
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
