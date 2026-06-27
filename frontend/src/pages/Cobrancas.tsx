import { useEffect, useState } from "react";
import { DollarSign, CheckCircle, Clock, AlertCircle, Plus, X } from "lucide-react";
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

export default function Cobrancas() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, show, hide } = useToast();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const [showModal, setShowModal] = useState(false);
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
    api.get("/pacientes").then((r) => setPacientes(r.data));
  }, []);

  async function marcarPago(id: string) {
    try {
      const res = await api.patch(`/cobrancas/${id}/pagar`);
      setCobrancas((prev) => prev.map((c) => c.id === id ? { ...c, ...res.data } : c));
      show("Pagamento registrado!");
      carregar();
    } catch {
      show("Erro ao registrar.", "error");
    }
  }

  function abrirModal() {
    setForm({
      pacienteId: pacientes[0]?.id || "",
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
    pago: { label: "Pago", color: "text-zena-green-dark bg-zena-green-light/15", icon: CheckCircle },
    pendente: { label: "Pendente", color: "text-zena-text-mid bg-zena-sand", icon: Clock },
    vencido: { label: "Vencido", color: "text-zena-brown bg-zena-brown/10", icon: AlertCircle },
  };

  const pctRecebido = resumo ? Math.round((resumo.totalRecebido / (resumo.totalFaturado || 1)) * 100) : 0;

  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];

  return (
    <div className="p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-zena-text-dark text-3xl font-bold">Cobranças</h1>
          <p className="text-zena-text-light text-sm mt-1">Controle financeiro do consultório</p>
        </div>
        <button
          onClick={abrirModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-zena-green-mid text-white rounded-xl text-sm font-semibold hover:bg-zena-green-dark transition-colors"
        >
          <Plus size={16} />
          Nova cobrança
        </button>
      </div>

      {/* Resumo financeiro */}
      {resumo && (
        <div className="bg-white rounded-2xl p-6 border border-zena-mint/30 shadow-sm mb-8">
          <h2 className="text-zena-text-dark font-semibold mb-4">Resumo do mês atual</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-5">
            <div>
              <p className="text-zena-text-light text-xs mb-1">Total faturado</p>
              <p className="text-2xl font-bold font-mono-data text-zena-text-dark">R$ {resumo.totalFaturado.toFixed(2).replace(".", ",")}</p>
            </div>
            <div>
              <p className="text-zena-text-light text-xs mb-1">Recebido</p>
              <p className="text-2xl font-bold font-mono-data text-zena-green-mid">R$ {resumo.totalRecebido.toFixed(2).replace(".", ",")}</p>
            </div>
            <div>
              <p className="text-zena-text-light text-xs mb-1">Pendente</p>
              <p className="text-2xl font-bold font-mono-data text-zena-text-mid">R$ {resumo.totalPendente.toFixed(2).replace(".", ",")}</p>
            </div>
            <div>
              <p className="text-zena-text-light text-xs mb-1">Vencidas</p>
              <p className={`text-2xl font-bold font-mono-data ${resumo.vencidas > 0 ? "text-zena-brown" : "text-zena-text-light"}`}>{resumo.vencidas}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zena-text-light">
              <span>Taxa de recebimento</span>
              <span className="font-medium text-zena-green-mid">{pctRecebido}%</span>
            </div>
            <div className="h-2 bg-zena-cream rounded-full overflow-hidden">
              <div
                className="h-full bg-zena-green-light rounded-full transition-all"
                style={{ width: `${pctRecebido}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filtro de mês */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="px-4 py-2.5 bg-white border border-zena-mint/40 rounded-xl text-sm text-zena-text-dark focus:outline-none focus:ring-2 focus:ring-zena-green-light"
        >
          {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
          className="px-4 py-2.5 bg-white border border-zena-mint/40 rounded-xl text-sm text-zena-text-dark focus:outline-none focus:ring-2 focus:ring-zena-green-light"
        >
          {[2023, 2024, 2025, 2026].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Lista de cobranças */}
      <div className="bg-white rounded-2xl border border-zena-mint/30 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-zena-cream rounded-xl" />)}
          </div>
        ) : cobrancas.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="mx-auto text-zena-mint mb-3" size={40} />
            <p className="text-zena-text-light text-sm mb-4">Nenhuma cobrança neste período.</p>
            <button
              onClick={abrirModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zena-green-mid text-white rounded-xl text-sm font-semibold hover:bg-zena-green-dark transition-colors"
            >
              <Plus size={15} />
              Criar primeira cobrança
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zena-cream">
                <th className="text-left text-zena-text-light text-xs font-medium px-6 py-4">Paciente</th>
                <th className="text-left text-zena-text-light text-xs font-medium px-6 py-4">Valor</th>
                <th className="text-left text-zena-text-light text-xs font-medium px-6 py-4">Vencimento</th>
                <th className="text-left text-zena-text-light text-xs font-medium px-6 py-4">Método</th>
                <th className="text-left text-zena-text-light text-xs font-medium px-6 py-4">Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zena-cream">
              {cobrancas.map((c) => {
                const status = getStatus(c);
                const cfg = statusConfig[status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={c.id} className="hover:bg-zena-cream/50 transition-colors">
                    <td className="px-6 py-4 text-zena-text-dark text-sm font-medium">{c.paciente.nome}</td>
                    <td className="px-6 py-4 text-zena-text-dark font-bold font-mono-data text-sm">
                      R$ {c.valor.toFixed(2).replace(".", ",")}
                    </td>
                    <td className="px-6 py-4 text-zena-text-mid text-sm">
                      {format(new Date(c.vencimento), "dd 'de' MMM", { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-zena-text-light text-sm capitalize">{c.metodo || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>
                        <StatusIcon size={11} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {status !== "pago" && (
                        <button
                          onClick={() => marcarPago(c.id)}
                          className="text-xs text-zena-green-mid font-medium hover:underline"
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
        )}
      </div>

      {/* Modal nova cobrança */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zena-cream">
              <h2 className="text-zena-text-dark font-semibold text-lg">Nova cobrança</h2>
              <button onClick={() => setShowModal(false)} className="text-zena-text-light hover:text-zena-text-dark transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-zena-text-dark text-sm font-medium mb-1.5">Paciente</label>
                <select
                  value={form.pacienteId}
                  onChange={(e) => setForm((f) => ({ ...f, pacienteId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zena-mint/40 rounded-xl text-sm text-zena-text-dark focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                >
                  <option value="">Selecione...</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zena-text-dark text-sm font-medium mb-1.5">Valor (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zena-mint/40 rounded-xl text-sm text-zena-text-dark focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                />
              </div>

              <div>
                <label className="block text-zena-text-dark text-sm font-medium mb-1.5">Vencimento</label>
                <input
                  type="date"
                  value={form.vencimento}
                  onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zena-mint/40 rounded-xl text-sm text-zena-text-dark focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                />
              </div>

              <div>
                <label className="block text-zena-text-dark text-sm font-medium mb-1.5">Método de pagamento</label>
                <select
                  value={form.metodo}
                  onChange={(e) => setForm((f) => ({ ...f, metodo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zena-mint/40 rounded-xl text-sm text-zena-text-dark focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                >
                  {METODOS.map((m) => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zena-text-dark text-sm font-medium mb-1.5">
                  Descrição <span className="text-zena-text-light font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Consulta mensal, retorno..."
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zena-mint/40 rounded-xl text-sm text-zena-text-dark focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-5 border-t border-zena-cream">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-zena-mint/40 text-zena-text-mid rounded-xl text-sm font-medium hover:bg-zena-cream transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={criarCobranca}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-zena-green-mid text-white rounded-xl text-sm font-semibold hover:bg-zena-green-dark transition-colors disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Criar cobrança"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
