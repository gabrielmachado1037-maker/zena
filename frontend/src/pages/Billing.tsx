import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, CreditCard, AlertCircle, ExternalLink, Star, ArrowRight } from "lucide-react";
import api from "../lib/api";

interface BillingStatus {
  plano: string;
  planoAtivo: boolean;
  emTrial: boolean;
  diasRestantesTrial: number;
  trialEnd: string | null;
}

export default function Billing() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sucesso")) {
      setSucesso(true);
      window.history.replaceState({}, "", "/app/billing");
    }
    api.get<BillingStatus>("/billing/status").then((r) => setStatus(r.data)).finally(() => setLoading(false));
  }, []);

  async function gerenciarAssinatura() {
    setRedirecting("portal");
    try {
      const { data } = await api.post<{ url: string }>("/billing/portal");
      window.location.href = data.url;
    } catch {
      alert("Erro ao acessar portal. Tente novamente.");
      setRedirecting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-nx-evo border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const assinaturaAtiva = status?.plano === "mensal" || status?.plano === "anual";

  if (sucesso) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center max-w-md px-6">
          <div className="w-24 h-24 bg-nx-evo/15 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <CheckCircle size={48} className="text-nx-evo" />
            <span className="absolute -top-1 -right-1 text-2xl">🌿</span>
          </div>
          <h1 className="text-3xl font-bold text-nx-on-surface mb-3">Bem-vinda à Nexvel!</h1>
          <p className="text-nx-on-surface-variant text-lg mb-2">Sua assinatura foi ativada com sucesso.</p>
          <p className="text-nx-outline text-sm mb-8">Agora você tem acesso completo à plataforma. Vamos começar?</p>
          <div className="bg-nx-surface border border-nx-border rounded-nx-lg p-5 mb-8 text-left space-y-3">
            {[
              "Adicione suas primeiras pacientes",
              "Crie planos alimentares em PDF",
              "Acompanhe o progresso e check-ins",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Star size={14} className="text-nx-evo flex-shrink-0" />
                <span className="text-sm text-nx-on-surface-variant">{item}</span>
              </div>
            ))}
          </div>
          <Link
            to="/app/dashboard"
            className="inline-block bg-nx-evo text-nx-on-evo font-semibold px-8 py-3 rounded-nx-md hover:bg-nx-evo-2 transition-colors"
          >
            Ir para o dashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nx-on-surface">Assinatura</h1>
        <p className="text-nx-on-surface-variant mt-1">Gerencie seu plano e pagamentos.</p>
      </div>

      {/* Status atual */}
      <div className="bg-nx-surface rounded-nx-lg border border-nx-border p-6">
        <h2 className="font-semibold text-nx-on-surface mb-4 flex items-center gap-2">
          <CreditCard size={18} className="text-nx-evo" /> Status da conta
        </h2>
        {status?.emTrial && (
          <div className="bg-nx-gold/10 border border-nx-gold/30 rounded-nx-md p-4 flex items-start gap-3 mb-4">
            <AlertCircle size={18} className="text-nx-gold flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-nx-gold">Período de teste</p>
              <p className="text-nx-gold/80 text-sm">
                {status.diasRestantesTrial} dia{status.diasRestantesTrial !== 1 ? "s" : ""} restante{status.diasRestantesTrial !== 1 ? "s" : ""}.
                Assine antes do término para não perder o acesso.
              </p>
            </div>
          </div>
        )}
        {!status?.planoAtivo && !status?.emTrial && (
          <div className="bg-nx-danger/10 border border-nx-danger/30 rounded-nx-md p-4 flex items-start gap-3 mb-4">
            <AlertCircle size={18} className="text-nx-danger flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-nx-danger">Acesso suspenso</p>
              <p className="text-nx-danger/80 text-sm">Seu período de teste encerrou. Assine um plano para reativar o acesso.</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${status?.planoAtivo ? "bg-nx-evo" : "bg-nx-danger"}`} />
          <div>
            <p className="font-medium text-nx-on-surface capitalize">
              {status?.emTrial ? "Trial gratuito" : status?.plano === "mensal" ? "Plano Mensal" : status?.plano === "anual" ? "Plano Anual" : "Sem plano ativo"}
            </p>
            {assinaturaAtiva && (
              <p className="text-sm text-nx-outline">Assinatura ativa</p>
            )}
          </div>
        </div>

        {assinaturaAtiva && (
          <button
            onClick={gerenciarAssinatura}
            disabled={redirecting === "portal"}
            className="mt-4 flex items-center gap-2 text-sm text-nx-evo font-medium hover:text-nx-evo-2 transition-colors disabled:opacity-50"
          >
            <ExternalLink size={14} />
            {redirecting === "portal" ? "Redirecionando..." : "Gerenciar assinatura / cancelar"}
          </button>
        )}
      </div>

      {/* CTA — a escolha e o checkout do plano ficam na tela de Planos */}
      {!assinaturaAtiva && (
        <Link
          to="/app/planos"
          className="flex items-center justify-between gap-3 bg-nx-surface rounded-nx-lg border border-nx-evo/40 p-5 hover:border-nx-evo transition-colors"
        >
          <div>
            <p className="font-semibold text-nx-on-surface">Assine o Nexvel Pro</p>
            <p className="text-sm text-nx-on-surface-variant mt-0.5">
              R$149/mês · 14 dias grátis · até 50 pacientes ativos
            </p>
          </div>
          <span className="flex items-center gap-1 text-nx-evo font-semibold text-sm shrink-0">
            Ver planos <ArrowRight size={16} />
          </span>
        </Link>
      )}

      {/* Segurança */}
      <div className="bg-nx-surface border border-nx-border rounded-nx-lg p-4 flex items-center gap-3 text-sm text-nx-on-surface-variant">
        <CheckCircle size={16} className="text-nx-evo flex-shrink-0" />
        Pagamentos processados com segurança via Stripe. Seus dados de cartão nunca passam pelos nossos servidores.
      </div>
    </div>
  );
}

