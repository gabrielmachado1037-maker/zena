import { useEffect, useState } from "react";
import { CheckCircle, Clock, AlertCircle, ExternalLink } from "lucide-react";
import api from "../../lib/api";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";

interface Cobranca {
  id: string; valor: number; vencimento: string; status: string;
  metodo?: string; pagoEm?: string; descricao?: string; linkPagamento?: string;
}

interface PlanoCobranca {
  valor: number; periodicidade: string; diaVencimento: number; ativo: boolean;
}

interface PagamentosData {
  cobrancas: Cobranca[];
  planoCobranca: PlanoCobranca | null;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pago:      { label: "Pago",      color: "#7C3AED", bg: "#D1FAE5", icon: CheckCircle },
  pendente:  { label: "Pendente",  color: "#B45309", bg: "#FEF3C7", icon: Clock },
  vencido:   { label: "Vencido",   color: "#DC2626", bg: "#FEE2E2", icon: AlertCircle },
  cancelado: { label: "Cancelado", color: "#9CA3AF", bg: "#F3F4F6", icon: AlertCircle },
};

const MESES_ABR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("pt-BR");
}

function diasParaProximoVenc(dia: number) {
  const hoje = new Date();
  let d = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
  if (d <= hoje) d = new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia);
  return Math.ceil((d.getTime() - hoje.getTime()) / 86400000);
}

function planoStatus(cobrancas: Cobranca[], diaVenc: number) {
  const dias = diasParaProximoVenc(diaVenc);
  const temPendente = cobrancas.some(c => c.status === "pendente");
  const temVencido  = cobrancas.some(c => c.status === "vencido");
  if (temVencido)           return { label: "Vencido",  color: "#DC2626", bg: "#FEE2E2" };
  if (temPendente && dias <= 5) return { label: "Vencendo", color: "#B45309", bg: "#FEF3C7" };
  return                         { label: "Em dia",   color: "#7C3AED", bg: "#D1FAE5" };
}

function Grafico({ cobrancas }: { cobrancas: Cobranca[] }) {
  const agora = new Date();
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1);
    return { mes: d.getMonth(), ano: d.getFullYear(), label: MESES_ABR[d.getMonth()] };
  });

  const porMes = meses.map(m => {
    const cobsMes = cobrancas.filter(c => {
      const d = new Date(c.vencimento);
      return d.getMonth() === m.mes && d.getFullYear() === m.ano;
    });
    const status = cobsMes.length === 0 ? "vazio"
      : cobsMes.some(c => c.status === "pago")    ? "pago"
      : cobsMes.some(c => c.status === "vencido") ? "vencido"
      : "pendente";
    return { ...m, status };
  });

  const barColor = (s: string) =>
    s === "pago" ? "#7C3AED" : s === "vencido" ? "#DC2626" : s === "pendente" ? "#D97706" : "#E5E7EB";

  return (
    <div className="bg-white rounded-2xl p-5"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <p className="text-[13px] font-bold text-[#111] mb-4">Histórico — últimos 6 meses</p>
      <div className="flex items-end gap-2" style={{ height: 64 }}>
        {porMes.map(m => (
          <div key={`${m.mes}-${m.ano}`} className="flex-1 flex flex-col items-center justify-end gap-1">
            <div className="w-full rounded-t-lg"
              style={{ height: m.status === "vazio" ? 6 : 48, background: barColor(m.status) }} />
            <span className="text-[9px] font-medium text-[#999]">{m.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3">
        {[["#7C3AED","Pago"],["#D97706","Pendente"],["#DC2626","Vencido"]].map(([c,l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            <span className="text-[10px] text-[#999]">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PagamentosPaciente() {
  const { token } = usePacienteAuth();
  const [data, setData]     = useState<PagamentosData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PagamentosData>("/paciente-app/pagamentos", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const plano     = data?.planoCobranca ?? null;
  const cobrancas = data?.cobrancas ?? [];

  return (
    <div className="pt-4 pb-4">
      {loading ? (
        <div className="space-y-4 px-4">
          <div className="rounded-2xl animate-pulse h-44" style={{ background: "#7C3AED" }} />
          <div className="bg-white rounded-2xl animate-pulse h-24" />
          <div className="bg-white rounded-2xl animate-pulse h-48" />
        </div>
      ) : (
        <div className="space-y-4 px-4">

          {/* Card plano */}
          {plano ? (() => {
            const dias = diasParaProximoVenc(plano.diaVencimento);
            const st   = planoStatus(cobrancas, plano.diaVencimento);
            return (
              <div className="rounded-2xl p-6 text-white" style={{ background: "#7C3AED" }}>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-[11px] text-white/60 font-semibold uppercase tracking-wide mb-1">Meu plano</p>
                    <p className="text-[38px] font-bold tabular-nums leading-none">{fmtMoney(plano.valor)}</p>
                    <p className="text-[13px] text-white/70 mt-1">
                      {plano.periodicidade === "mensal" ? "por mês"
                        : plano.periodicidade === "trimestral" ? "por trimestre" : "por ano"}
                    </p>
                  </div>
                  <span className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                    style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
                <div className="border-t border-white/20 pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-white/60">Vencimento</p>
                    <p className="text-[14px] font-bold">Todo dia {plano.diaVencimento}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-white/60">Próximo vence em</p>
                    <p className="text-[28px] font-bold">{dias}<span className="text-[16px]">d</span></p>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="bg-[#F5F5F3] rounded-2xl p-5 text-center">
              <p className="text-[13px] text-[#999]">Nenhum plano de cobrança configurado.</p>
            </div>
          )}

          {/* Gráfico histórico */}
          {cobrancas.length > 0 && <Grafico cobrancas={cobrancas} />}

          {/* Lista faturas */}
          {cobrancas.length > 0 && (
            <div>
              <p className="text-[12px] font-bold text-[#888] uppercase tracking-wide mb-3">Faturas</p>
              <div className="space-y-2">
                {cobrancas.map(c => {
                  const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.pendente;
                  const Icon = cfg.icon;
                  return (
                    <div key={c.id} className="bg-white rounded-2xl p-4 flex items-center gap-3"
                      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: cfg.bg }}>
                        <Icon size={18} style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-[#111]">{fmtMoney(c.valor)}</p>
                        <p className="text-[11px] text-[#bbb] truncate">
                          Venc. {fmtDate(c.vencimento)}
                          {c.descricao && ` · ${c.descricao}`}
                          {c.pagoEm && ` · Pago ${fmtDate(c.pagoEm)}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>
                          {cfg.label}
                        </span>
                        {c.linkPagamento && (c.status === "pendente" || c.status === "vencido") && (
                          <a href={c.linkPagamento} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-[10px] font-bold"
                            style={{ background: "#7C3AED" }}>
                            Pagar <ExternalLink size={9} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {cobrancas.length === 0 && (
            <div className="text-center py-10">
              <p className="text-[#bbb] text-[14px]">Nenhuma cobrança registrada.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
