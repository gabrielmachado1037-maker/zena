import { useEffect, useState } from "react";
import {
  DollarSign, CheckCircle, Clock, AlertCircle, Plus, X,
  Key, User, QrCode, CheckCircle2, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../lib/api";
import { Toast, useToast } from "../components/Toast";

interface Cobranca {
  id: string;
  valor: number;
  vencimento: string;
  status: string;
  metodo?: string;
  descricao?: string;
  paciente: { nome: string };
}

interface Resumo {
  totalFaturado: number;
  totalRecebido: number;
  totalPendente: number;
  vencidas: number;
}

interface Paciente {
  id: string;
  nome: string;
}

const METODOS = ["pix", "transferência", "cartão de crédito", "cartão de débito", "dinheiro", "outro"];

const meses = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function fmt(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export default function Cobrancas() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [asaasConectado, setAsaasConectado] = useState<boolean | null>(null);
  const { toast, show, hide } = useToast();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const [showModal, setShowModal] = useState(false);
  const [showAsaasModal, setShowAsaasModal] = useState(false);
  const [showSeletor, setShowSeletor] = useState(false);
  const [pacienteEscolhido, setPacienteEscolhido] = useState<Paciente | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    pacienteId: "",
    valor: "",
    vencimento: format(now, "yyyy-MM-dd"),
    metodo: "pix",
    descricao: "",
  });

  async function carregar() {
    setLoading(true);
    const [c, r] = await Promise.all([
      api.get(`/cobrancas?mes=${mes}&ano=${ano}`),
      api.get("/cobrancas/resumo"),
    ]);
    setCobrancas(c.data);
    setResumo(r.data);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [mes, ano]);

  useEffect(() => {
    api.get("/pacientes?limit=1000").then((r) => setPacientes(r.data.data));
    api.get("/financeiro/asaas-status")
      .then((r) => setAsaasConectado(r.data.configurado))
      .catch(() => setAsaasConectado(false));
  }, []);

  async function marcarPago(id: string) {
    try {
      await api.patch(`/cobrancas/${id}/pagar`);
      show("Pagamento registrado!");
      carregar();
    } catch {
      show("Erro ao registrar.", "error");
    }
  }

  function abrirModal(pacienteId?: string) {
    setForm({
      pacienteId: pacienteId || pacientes[0]?.id || "",
      valor: "",
      vencimento: format(now, "yyyy-MM-dd"),
      metodo: "pix",
      descricao: "",
    });
    setShowModal(true);
  }

  async function criarCobranca() {
    if (!form.pacienteId) return show("Selecione um paciente.", "error");
    if (!form.valor || isNaN(parseFloat(form.valor)) || parseFloat(form.valor) <= 0)
      return show("Informe um valor válido.", "error");
    if (!form.vencimento) return show("Informe a data de vencimento.", "error");

    setSaving(true);
    try {
      await api.post("/cobrancas", {
        pacienteId: form.pacienteId,
        valor: parseFloat(form.valor),
        vencimento: form.vencimento,
        metodo: form.metodo,
        descricao: form.descricao || undefined,
      });
      setShowModal(false);
      show("Cobrança criada!");
      carregar();
    } catch {
      show("Erro ao criar cobrança.", "error");
    } finally {
      setSaving(false);
    }
  }

  const getStatus = (c: Cobranca) => {
    if (c.status === "pago") return "pago";
    if (new Date(c.vencimento) < new Date()) return "vencido";
    return "pendente";
  };

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pago: { label: "Pago", color: "text-nexvel-green-dark bg-nexvel-green-light/15", icon: CheckCircle },
    pendente: { label: "Pendente", color: "text-nexvel-text-mid bg-nexvel-sand", icon: Clock },
    vencido: { label: "Vencido", color: "text-nexvel-brown bg-nexvel-brown/10", icon: AlertCircle },
  };

  const pctRecebido = resumo ? Math.round((resumo.totalRecebido / (resumo.totalFaturado || 1)) * 100) : 0;
  const resumoZerado = resumo && resumo.totalFaturado === 0;

  const step1Done = asaasConectado === true;
  const step2Done = !!pacienteEscolhido;
  const step3Enabled = step1Done && step2Done;

  return (
    <div className="p-4 sm:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      {/* Cabeçalho */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-nexvel-text-dark text-3xl font-bold">Cobranças</h1>
          <p className="text-nexvel-text-light text-sm mt-1">Controle financeiro do consultório</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="flex items-center gap-2 px-5 py-3 bg-nexvel-green-mid text-white rounded-xl text-sm font-semibold hover:bg-nexvel-green-dark transition-colors shadow-sm"
        >
          <Plus size={16} />
          Nova cobrança
        </button>
      </div>

      {/* Resumo financeiro */}
      {resumo && (
        <div className="bg-white rounded-2xl p-6 border border-nexvel-mint/30 shadow-sm mb-8">
          <h2 className="text-nexvel-text-dark font-semibold mb-4">Resumo do mês atual</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-5">
            <div>
              <p className="text-nexvel-text-light text-xs mb-1">Total faturado</p>
              <p className="text-2xl font-bold font-mono-data text-nexvel-text-dark">{fmt(resumo.totalFaturado)}</p>
            </div>
            <div>
              <p className="text-nexvel-text-light text-xs mb-1">Recebido</p>
              <p className="text-2xl font-bold font-mono-data text-nexvel-green-mid">{fmt(resumo.totalRecebido)}</p>
            </div>
            <div>
              <p className="text-nexvel-text-light text-xs mb-1">Pendente</p>
              <p className="text-2xl font-bold font-mono-data text-nexvel-text-mid">{fmt(resumo.totalPendente)}</p>
            </div>
            <div>
              <p className="text-nexvel-text-light text-xs mb-1">Vencidas</p>
              <p className={`text-2xl font-bold font-mono-data ${resumo.vencidas > 0 ? "text-nexvel-brown" : "text-nexvel-text-light"}`}>{resumo.vencidas}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-nexvel-text-light">
              <span>Taxa de recebimento</span>
              <span className="font-medium text-nexvel-green-mid">{pctRecebido}%</span>
            </div>
            <div className="h-2 bg-nexvel-cream rounded-full overflow-hidden">
              <div className="h-full bg-nexvel-green-light rounded-full transition-all" style={{ width: `${pctRecebido}%` }} />
            </div>
          </div>
          {resumoZerado && (
            <div className="mt-4 pt-4 border-t border-nexvel-cream flex items-center justify-between">
              <p className="text-nexvel-text-light text-sm">Nenhuma cobrança gerada este mês.</p>
              <button
                onClick={() => abrirModal()}
                className="flex items-center gap-1 text-nexvel-green-mid text-sm font-medium hover:underline"
              >
                Gerar cobrança <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filtro de mês */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="px-4 py-2.5 bg-white border border-nexvel-mint/40 rounded-xl text-sm text-nexvel-text-dark focus:outline-none focus:ring-2 focus:ring-nexvel-green-light"
        >
          {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
          className="px-4 py-2.5 bg-white border border-nexvel-mint/40 rounded-xl text-sm text-nexvel-text-dark focus:outline-none focus:ring-2 focus:ring-nexvel-green-light"
        >
          {[2023, 2024, 2025, 2026].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Lista / Empty state */}
      <div className="bg-white rounded-2xl border border-nexvel-mint/30 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-nexvel-cream rounded-xl" />)}
          </div>
        ) : cobrancas.length === 0 ? (
          <EmptyState
            step1Done={step1Done}
            step2Done={step2Done}
            step3Enabled={step3Enabled}
            pacienteEscolhido={pacienteEscolhido}
            onConectarAsaas={() => setShowAsaasModal(true)}
            onSelecionarPaciente={() => setShowSeletor(true)}
            onGerarCobranca={() => abrirModal(pacienteEscolhido?.id)}
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-nexvel-cream">
                <th className="text-left text-nexvel-text-light text-xs font-medium px-4 sm:px-6 py-4">Paciente</th>
                <th className="text-left text-nexvel-text-light text-xs font-medium px-4 sm:px-6 py-4">Valor</th>
                <th className="text-left text-nexvel-text-light text-xs font-medium px-4 sm:px-6 py-4">Vencimento</th>
                <th className="hidden sm:table-cell text-left text-nexvel-text-light text-xs font-medium px-4 sm:px-6 py-4">Método</th>
                <th className="text-left text-nexvel-text-light text-xs font-medium px-4 sm:px-6 py-4">Status</th>
                <th className="px-4 sm:px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-nexvel-cream">
              {cobrancas.map((c) => {
                const status = getStatus(c);
                const cfg = statusConfig[status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={c.id} className="hover:bg-nexvel-cream/50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 text-nexvel-text-dark text-sm font-medium">{c.paciente.nome}</td>
                    <td className="px-4 sm:px-6 py-4 text-nexvel-text-dark font-bold font-mono-data text-sm">
                      R$ {c.valor.toFixed(2).replace(".", ",")}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-nexvel-text-mid text-sm">
                      {format(new Date(c.vencimento), "dd 'de' MMM", { locale: ptBR })}
                    </td>
                    <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-nexvel-text-light text-sm capitalize">{c.metodo || "—"}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>
                        <StatusIcon size={11} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      {status !== "pago" && (
                        <button
                          onClick={() => marcarPago(c.id)}
                          className="text-xs text-nexvel-green-mid font-medium hover:underline whitespace-nowrap"
                        >
                          Marcar como pago
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modal nova cobrança */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-nexvel-cream">
              <h2 className="text-nexvel-text-dark font-semibold text-lg">Nova cobrança</h2>
              <button onClick={() => setShowModal(false)} className="text-nexvel-text-light hover:text-nexvel-text-dark">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-nexvel-text-dark text-sm font-medium mb-1.5">Paciente</label>
                <select
                  value={form.pacienteId}
                  onChange={(e) => setForm((f) => ({ ...f, pacienteId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-nexvel-mint/40 rounded-xl text-sm text-nexvel-text-dark focus:outline-none focus:ring-2 focus:ring-nexvel-green-light"
                >
                  <option value="">Selecione...</option>
                  {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-nexvel-text-dark text-sm font-medium mb-1.5">Valor (R$)</label>
                <input
                  type="number" min="0" step="0.01" placeholder="0,00"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-nexvel-mint/40 rounded-xl text-sm text-nexvel-text-dark focus:outline-none focus:ring-2 focus:ring-nexvel-green-light"
                />
              </div>
              <div>
                <label className="block text-nexvel-text-dark text-sm font-medium mb-1.5">Vencimento</label>
                <input
                  type="date" value={form.vencimento}
                  onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-nexvel-mint/40 rounded-xl text-sm text-nexvel-text-dark focus:outline-none focus:ring-2 focus:ring-nexvel-green-light"
                />
              </div>
              <div>
                <label className="block text-nexvel-text-dark text-sm font-medium mb-1.5">Método de pagamento</label>
                <select
                  value={form.metodo}
                  onChange={(e) => setForm((f) => ({ ...f, metodo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-nexvel-mint/40 rounded-xl text-sm text-nexvel-text-dark focus:outline-none focus:ring-2 focus:ring-nexvel-green-light"
                >
                  {METODOS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-nexvel-text-dark text-sm font-medium mb-1.5">
                  Descrição <span className="text-nexvel-text-light font-normal">(opcional)</span>
                </label>
                <input
                  type="text" placeholder="Ex: Consulta mensal, retorno..."
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-nexvel-mint/40 rounded-xl text-sm text-nexvel-text-dark focus:outline-none focus:ring-2 focus:ring-nexvel-green-light"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-5 border-t border-nexvel-cream">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-nexvel-mint/40 text-nexvel-text-mid rounded-xl text-sm font-medium hover:bg-nexvel-cream">
                Cancelar
              </button>
              <button onClick={criarCobranca} disabled={saving} className="flex-1 px-4 py-2.5 bg-nexvel-green-mid text-white rounded-xl text-sm font-semibold hover:bg-nexvel-green-dark disabled:opacity-60">
                {saving ? "Salvando..." : "Criar cobrança"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAsaasModal && (
        <AsaasModal
          onClose={() => setShowAsaasModal(false)}
          onConnected={() => { setAsaasConectado(true); show("Conta Asaas conectada!"); }}
          onError={(msg) => show(msg, "error")}
        />
      )}

      {showSeletor && (
        <SeletorPaciente
          pacientes={pacientes}
          onClose={() => setShowSeletor(false)}
          onSelect={(p) => { setPacienteEscolhido(p); setShowSeletor(false); }}
        />
      )}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({
  step1Done, step2Done, step3Enabled, pacienteEscolhido,
  onConectarAsaas, onSelecionarPaciente, onGerarCobranca,
}: {
  step1Done: boolean;
  step2Done: boolean;
  step3Enabled: boolean;
  pacienteEscolhido: { nome: string } | null;
  onConectarAsaas: () => void;
  onSelecionarPaciente: () => void;
  onGerarCobranca: () => void;
}) {
  return (
    <div className="px-6 py-14 flex flex-col items-center">
      <div className="w-12 h-12 rounded-2xl bg-nexvel-green-light/20 flex items-center justify-center mb-5">
        <DollarSign size={24} className="text-nexvel-green-mid" />
      </div>
      <h2 className="text-nexvel-text-dark text-xl font-bold mb-1.5">Configure suas cobranças</h2>
      <p className="text-nexvel-text-light text-sm mb-10">Receba pelo Pix direto dos seus pacientes</p>

      <div className="w-full max-w-sm space-y-3">
        <Passo
          number={1}
          icon={Key}
          title="Conectar conta Asaas"
          done={step1Done}
          action={step1Done ? undefined : { label: "Conectar Asaas", onClick: onConectarAsaas }}
        />
        <Passo
          number={2}
          icon={User}
          title="Vincular plano a um paciente"
          subtitle={step2Done ? pacienteEscolhido?.nome : undefined}
          done={step2Done}
          action={
            !step2Done
              ? { label: "Selecionar paciente", onClick: onSelecionarPaciente }
              : { label: "Trocar", onClick: onSelecionarPaciente, secondary: true }
          }
        />
        <Passo
          number={3}
          icon={QrCode}
          title="Gerar primeira cobrança"
          done={false}
          disabled={!step3Enabled}
          action={step3Enabled ? { label: "Gerar cobrança Pix", onClick: onGerarCobranca } : undefined}
          hint={!step3Enabled ? "Disponível após os passos 1 e 2" : undefined}
        />
      </div>
    </div>
  );
}

function Passo({
  number, icon: Icon, title, subtitle, done, disabled, action, hint,
}: {
  number: number;
  icon: any;
  title: string;
  subtitle?: string;
  done: boolean;
  disabled?: boolean;
  action?: { label: string; onClick: () => void; secondary?: boolean };
  hint?: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-4 transition-all ${
      done ? "border-nexvel-green-light/40 bg-nexvel-green-light/5" :
      disabled ? "border-nexvel-mint/20 bg-nexvel-cream/40 opacity-60" :
      "border-nexvel-mint/40 bg-white"
    }`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        done ? "bg-nexvel-green-mid" : disabled ? "bg-nexvel-mint/30" : "bg-nexvel-green-light/20"
      }`}>
        {done
          ? <CheckCircle2 size={18} className="text-white" />
          : <Icon size={18} className={disabled ? "text-nexvel-text-light" : "text-nexvel-green-mid"} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold text-nexvel-text-light tracking-wide">PASSO {number}</span>
          {done && <span className="text-[10px] font-bold text-nexvel-green-mid">CONCLUÍDO</span>}
        </div>
        <p className={`text-sm font-medium leading-tight ${disabled ? "text-nexvel-text-light" : "text-nexvel-text-dark"}`}>{title}</p>
        {subtitle && <p className="text-xs text-nexvel-green-mid font-medium mt-0.5">{subtitle}</p>}
        {hint && <p className="text-xs text-nexvel-text-light mt-0.5">{hint}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors whitespace-nowrap ${
            action.secondary
              ? "text-nexvel-text-mid hover:text-nexvel-text-dark underline"
              : "bg-nexvel-green-mid text-white hover:bg-nexvel-green-dark"
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ─── Modal Asaas ─────────────────────────────────────────────────────────────

function AsaasModal({ onClose, onConnected, onError }: {
  onClose: () => void;
  onConnected: () => void;
  onError: (msg: string) => void;
}) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);

  async function salvar() {
    if (!key.trim()) return;
    setLoading(true);
    try {
      await api.put("/financeiro/asaas-key", { asaasApiKey: key.trim() });
      onConnected();
      onClose();
    } catch {
      onError("Erro ao salvar chave Asaas. Verifique se está correta.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-nexvel-cream">
          <h2 className="text-nexvel-text-dark font-semibold text-lg">Conectar conta Asaas</h2>
          <button onClick={onClose} className="text-nexvel-text-light hover:text-nexvel-text-dark"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-nexvel-cream rounded-xl p-4 text-sm text-nexvel-text-mid space-y-2">
            <p className="font-medium text-nexvel-text-dark">Como obter sua chave Asaas:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Acesse <span className="font-medium">asaas.com</span> e faça login</li>
              <li>Vá em <span className="font-medium">Configurações → Integrações</span></li>
              <li>Copie sua <span className="font-medium">API Key</span> de produção</li>
            </ol>
          </div>
          <div>
            <label className="block text-nexvel-text-dark text-sm font-medium mb-1.5">Chave de API Asaas</label>
            <input
              type="password"
              placeholder="$aact_..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-3 py-2.5 border border-nexvel-mint/40 rounded-xl text-sm text-nexvel-text-dark focus:outline-none focus:ring-2 focus:ring-nexvel-green-light font-mono"
            />
            <p className="text-xs text-nexvel-text-light mt-1.5">Sua chave é armazenada de forma segura e criptografada.</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-5 border-t border-nexvel-cream">
          <button onClick={onClose} className="flex-1 py-2.5 border border-nexvel-mint/40 text-nexvel-text-mid rounded-xl text-sm hover:bg-nexvel-cream">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={loading || !key.trim()}
            className="flex-1 py-2.5 bg-nexvel-green-mid text-white rounded-xl text-sm font-semibold hover:bg-nexvel-green-dark disabled:opacity-60"
          >
            {loading ? "Conectando..." : "Conectar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Seletor de paciente ──────────────────────────────────────────────────────

function SeletorPaciente({ pacientes, onClose, onSelect }: {
  pacientes: Paciente[];
  onClose: () => void;
  onSelect: (p: Paciente) => void;
}) {
  const [busca, setBusca] = useState("");
  const filtrados = pacientes.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-nexvel-cream">
          <h2 className="text-nexvel-text-dark font-semibold text-lg">Selecionar paciente</h2>
          <button onClick={onClose} className="text-nexvel-text-light hover:text-nexvel-text-dark"><X size={20} /></button>
        </div>
        <div className="px-4 pt-4">
          <input
            type="text"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
            className="w-full px-3 py-2.5 border border-nexvel-mint/40 rounded-xl text-sm text-nexvel-text-dark focus:outline-none focus:ring-2 focus:ring-nexvel-green-light"
          />
        </div>
        <div className="p-4 space-y-1 max-h-72 overflow-y-auto">
          {filtrados.length === 0 ? (
            <p className="text-center text-nexvel-text-light text-sm py-4">Nenhuma paciente encontrada.</p>
          ) : filtrados.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-nexvel-cream transition-colors text-sm text-nexvel-text-dark font-medium"
            >
              {p.nome}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
