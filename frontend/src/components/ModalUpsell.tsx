import { useState } from "react";
import { X, Zap, CalendarDays, FileText, ClipboardList, Loader2, ArrowRight } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  modulo: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const MODULO_INFO: Record<string, { nome: string; icon: React.FC<{ size?: number; className?: string }> }> = {
  prontuario:     { nome: "Prontuário Completo", icon: ClipboardList },
  agenda:         { nome: "Agenda e Consultas",   icon: CalendarDays },
  plano_alimentar:{ nome: "Planos Alimentares",   icon: FileText },
};

const BENEFICIOS = [
  "Prontuário completo do paciente",
  "Agenda e agendamento online",
  "Criação de planos alimentares",
];

export default function ModalUpsell({ modulo, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const { nutricionista, updateAvatar } = useAuth();
  const info = MODULO_INFO[modulo] ?? MODULO_INFO.prontuario;
  const Icon = info.icon;

  async function handleUpgrade() {
    setErro("");
    setLoading(true);
    try {
      await api.post("/billing/upgrade", { novo_plano_slug: "ecossistema" });
      // Atualiza o contexto local com os novos módulos
      if (nutricionista) {
        const updated = {
          ...nutricionista,
          planoSlug: "ecossistema",
          subscriptionStatus: "ativo",
          modulosAtivos: [
            "feed", "ranking", "gamificacao", "notificacoes",
            "prontuario", "agenda", "plano_alimentar",
          ],
        };
        localStorage.setItem("zena_user", JSON.stringify(updated));
        window.location.reload();
      }
      onSuccess?.();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? "";
      if (msg === "Price ID não configurado para este plano") {
        // Sem Stripe configurado — redirecionar para página de planos
        window.location.href = "/app/planos?upgrade=ecossistema";
      } else {
        setErro(e?.response?.data?.error || "Erro ao processar upgrade. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header verde */}
        <div className="relative px-6 pt-8 pb-6 text-center" style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)" }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3">
            <Icon size={28} className="text-white" />
          </div>
          <h2 className="text-[20px] font-bold text-white leading-tight">
            Desbloqueie {info.nome}
          </h2>
          <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.72)" }}>
            Disponível no Ecossistema Completo
          </p>
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-5">
          <ul className="space-y-2.5 mb-5">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-[13px] text-[#333]">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#7C3AED" }}>
                  <span className="text-white text-[9px] font-bold">✓</span>
                </div>
                {b}
              </li>
            ))}
          </ul>

          {/* Preço */}
          <div className="rounded-xl p-4 mb-4" style={{ background: "#F5F5F3" }}>
            <p className="text-[13px] text-[#666] mb-1">
              Por apenas
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-extrabold text-[#7C3AED]">R$82</span>
              <span className="text-[13px] text-[#666]">/mês a mais</span>
            </div>
            <p className="text-[11px] text-[#999] mt-1">ou R$124,17/mês no anual (2 meses grátis)</p>
          </div>

          {erro && (
            <p className="text-[12px] text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-3">{erro}</p>
          )}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-[15px] disabled:opacity-60 transition-opacity"
            style={{ background: "#7C3AED" }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={16} />}
            {loading ? "Processando..." : "Fazer upgrade agora"}
            {!loading && <ArrowRight size={15} />}
          </button>

          <button
            onClick={onClose}
            className="w-full text-center mt-3 text-[13px] text-[#999] hover:text-[#333] transition-colors py-1"
          >
            Continuar no Hub
          </button>
        </div>
      </div>
    </div>
  );
}
