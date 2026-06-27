import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, CreditCard, AlertCircle, ExternalLink, Zap, Star } from "lucide-react";
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

  async function assinar(periodo: "mensal" | "anual") {
    setRedirecting(periodo);
    try {
      const { data } = await api.post<{ url: string | null }>("/billing/checkout", { periodo });
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Pagamentos ainda não configurados. Verifique as variáveis STRIPE_SECRET_KEY.");
        setRedirecting(null);
      }
    } catch {
      alert("Erro ao iniciar pagamento. Tente novamente.");
      setRedirecting(null);
    }
  }

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
        <div className="w-8 h-8 border-2 border-zena-green-light border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const assinaturaAtiva = status?.plano === "mensal" || status?.plano === "anual";

  if (sucesso) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center max-w-md px-6">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <CheckCircle size={48} className="text-emerald-500" />
            <span className="absolute -top-1 -right-1 text-2xl">🌿</span>
          </div>
          <h1 className="text-3xl font-bold text-zena-green-dark mb-3">Bem-vinda à Clinne!</h1>
          <p className="text-zena-text-mid text-lg mb-2">Sua assinatura foi ativada com sucesso.</p>
          <p className="text-zena-text-light text-sm mb-8">Agora você tem acesso completo à plataforma. Vamos começar?</p>
          <div className="bg-zena-cream rounded-2xl p-5 mb-8 text-left space-y-3">
            {[
              "Adicione suas primeiras pacientes",
              "Crie planos alimentares em PDF",
              "Acompanhe o progresso e check-ins",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Star size={14} className="text-zena-green-light flex-shrink-0" />
                <span className="text-sm text-zena-text-mid">{item}</span>
              </div>
            ))}
          </div>
          <Link
            to="/app/dashboard"
            className="inline-block bg-zena-green-dark text-white font-semibold px-8 py-3 rounded-xl hover:bg-zena-green-mid transition-colors"
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
        <h1 className="text-2xl font-bold text-zena-green-dark">Assinatura</h1>
        <p className="text-zena-text-mid mt-1">Gerencie seu plano e pagamentos.</p>
      </div>

      {/* Status atual */}
      <div className="bg-white rounded-2xl border border-zena-mint/30 p-6">
        <h2 className="font-semibold text-zena-text-dark mb-4 flex items-center gap-2">
          <CreditCard size={18} className="text-zena-green-mid" /> Status da conta
        </h2>
        {status?.emTrial && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-4">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-700">Período de teste</p>
              <p className="text-amber-600 text-sm">
                {status.diasRestantesTrial} dia{status.diasRestantesTrial !== 1 ? "s" : ""} restante{status.diasRestantesTrial !== 1 ? "s" : ""}.
                Assine antes do término para não perder o acesso.
              </p>
            </div>
          </div>
        )}
        {!status?.planoAtivo && !status?.emTrial && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-4">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700">Acesso suspenso</p>
              <p className="text-red-600 text-sm">Seu período de teste encerrou. Assine um plano para reativar o acesso.</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${status?.planoAtivo ? "bg-emerald-400" : "bg-red-400"}`} />
          <div>
            <p className="font-medium text-zena-text-dark capitalize">
              {status?.emTrial ? "Trial gratuito" : status?.plano === "mensal" ? "Plano Mensal" : status?.plano === "anual" ? "Plano Anual" : "Sem plano ativo"}
            </p>
            {assinaturaAtiva && (
              <p className="text-sm text-zena-text-light">Assinatura ativa</p>
            )}
          </div>
        </div>

        {assinaturaAtiva && (
          <button
            onClick={gerenciarAssinatura}
            disabled={redirecting === "portal"}
            className="mt-4 flex items-center gap-2 text-sm text-zena-green-mid font-medium hover:text-zena-green-dark transition-colors disabled:opacity-50"
          >
            <ExternalLink size={14} />
            {redirecting === "portal" ? "Redirecionando..." : "Gerenciar assinatura / cancelar"}
          </button>
        )}
      </div>

      {/* Planos */}
      {!assinaturaAtiva && (
        <div>
          <h2 className="font-semibold text-zena-text-dark mb-4 flex items-center gap-2">
            <Zap size={18} className="text-zena-green-mid" /> Escolha um plano
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Mensal */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
              <p className="text-sm text-zena-text-mid font-medium mb-1">Mensal</p>
              <p className="text-3xl font-bold text-zena-green-dark mb-1">
                R$ 69<span className="text-base font-normal text-zena-text-mid">/mês</span>
              </p>
              <p className="text-xs text-zena-text-light mb-4">Cobrado mensalmente</p>
              <ul className="space-y-2 mb-6 text-sm text-zena-text-mid">
                {["Pacientes ilimitadas", "Todas as funcionalidades", "Suporte por e-mail"].map((i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-zena-green-light" /> {i}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => assinar("mensal")}
                disabled={!!redirecting}
                className="w-full border-2 border-zena-green-dark text-zena-green-dark font-semibold py-2.5 rounded-xl hover:bg-zena-cream transition-colors disabled:opacity-50 text-sm"
              >
                {redirecting === "mensal" ? "Redirecionando..." : "Assinar mensal"}
              </button>
            </div>

            {/* Anual */}
            <div className="bg-white rounded-2xl border-2 border-zena-green-dark p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zena-green-dark text-white text-xs font-bold px-3 py-0.5 rounded-full">
                RECOMENDADO
              </div>
              <p className="text-sm text-zena-text-mid font-medium mb-1">Anual</p>
              <p className="text-3xl font-bold text-zena-green-dark mb-1">
                R$ 59<span className="text-base font-normal text-zena-text-mid">/mês</span>
              </p>
              <p className="text-xs text-zena-text-light mb-4">R$ 708 cobrado anualmente · Economize R$ 120</p>
              <ul className="space-y-2 mb-6 text-sm text-zena-text-mid">
                {["Tudo do plano mensal", "Suporte prioritário", "Acesso antecipado a novidades"].map((i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-zena-green-light" /> {i}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => assinar("anual")}
                disabled={!!redirecting}
                className="w-full bg-zena-green-dark text-white font-semibold py-2.5 rounded-xl hover:bg-zena-green-mid transition-colors disabled:opacity-50 text-sm"
              >
                {redirecting === "anual" ? "Redirecionando..." : "Assinar anual"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Segurança */}
      <div className="bg-zena-cream rounded-2xl p-4 flex items-center gap-3 text-sm text-zena-text-mid">
        <CheckCircle size={16} className="text-zena-green-light flex-shrink-0" />
        Pagamentos processados com segurança via Stripe. Seus dados de cartão nunca passam pelos nossos servidores.
      </div>
    </div>
  );
}

