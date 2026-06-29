import { useEffect, useState } from "react";
import { CreditCard, CheckCircle, Clock, AlertCircle } from "lucide-react";
import api from "../../lib/api";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";

interface Cobranca {
  id: string; valor: number; vencimento: string; status: string;
  metodo?: string; pagoEm?: string; descricao?: string; linkPagamento?: string;
}

interface PlanoCobranca {
  valor: number; periodicidade: string; diaVencimento: number; ativo: boolean;
}

interface Paciente {
  nome: string; objetivo: string; dataInicio: string;
}

interface PagamentosData {
  cobrancas: Cobranca[];
  planoCobranca: PlanoCobranca | null;
  paciente: Paciente | null;
}

const statusCfg: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pago:      { label: "Pago",      color: "#1B4332", bg: "#E0F2E9",   icon: CheckCircle },
  pendente:  { label: "Pendente",  color: "#B45309", bg: "#FEF3C7",   icon: Clock },
  vencido:   { label: "Vencido",   color: "#DC2626", bg: "#FEE2E2",   icon: AlertCircle },
  cancelado: { label: "Cancelado", color: "#999",    bg: "#F5F5F3",   icon: AlertCircle },
};

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PagamentosPaciente() {
  const { token } = usePacienteAuth();
  const [data, setData]     = useState<PagamentosData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PagamentosData>("/paciente-app/pagamentos", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-5 pt-10 pb-4">
      <div className="flex items-center gap-3 mb-1">
        <CreditCard size={20} style={{ color: "#1B4332" }} />
        <h1 className="text-[24px] font-bold text-[#111]">Pagamentos</h1>
      </div>
      <p className="text-[13px] text-[#999] mb-6">Seu plano e histórico de cobranças</p>

      {loading ? (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-5 animate-pulse h-28" />
          <div className="bg-white rounded-2xl p-4 animate-pulse h-16" />
        </div>
      ) : (
        <>
          {/* Plano de cobrança */}
          {data?.planoCobranca ? (
            <div className="rounded-2xl p-5 mb-5 text-white" style={{ background: "#1B4332" }}>
              <p className="text-[12px] text-white/60 font-medium mb-1">Seu plano</p>
              <p className="text-[32px] font-bold tabular-nums leading-none mb-1">
                {fmtMoney(data.planoCobranca.valor)}
              </p>
              <p className="text-[13px] text-white/70">
                {data.planoCobranca.periodicidade === "mensal" ? "por mês" :
                 data.planoCobranca.periodicidade === "trimestral" ? "por trimestre" : "por ano"}
                {" · "}vence todo dia {data.planoCobranca.diaVencimento}
              </p>
              {data.planoCobranca.ativo && (
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="w-2 h-2 rounded-full bg-[#52B788] animate-pulse" />
                  <span className="text-[12px] text-[#B7E4C7]">Plano ativo</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#F5F5F3] rounded-2xl p-4 mb-5 text-center">
              <p className="text-[13px] text-[#999]">Nenhum plano de cobrança configurado.</p>
            </div>
          )}

          {/* Lista de cobranças */}
          <p className="text-[13px] font-semibold text-[#333] mb-3">Histórico</p>
          {!data?.cobrancas.length ? (
            <div className="text-center py-8">
              <p className="text-[#bbb] text-[14px]">Nenhuma cobrança encontrada.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.cobrancas.map((c) => {
                const cfg = statusCfg[c.status] ?? statusCfg.pendente;
                const Icon = cfg.icon;
                return (
                  <div key={c.id} className="bg-white rounded-xl px-4 py-3 border border-[#F0F0EE] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                      <Icon size={15} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#111]">{fmtMoney(c.valor)}</p>
                      <p className="text-[11px] text-[#bbb]">
                        Venc. {new Date(c.vencimento).toLocaleDateString("pt-BR")}
                        {c.descricao && ` · ${c.descricao}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                      {c.linkPagamento && c.status === "pendente" && (
                        <a
                          href={c.linkPagamento} target="_blank" rel="noopener noreferrer"
                          className="text-[11px] font-medium underline" style={{ color: "#1B4332" }}
                        >
                          Pagar
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
