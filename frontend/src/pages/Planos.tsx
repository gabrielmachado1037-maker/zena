import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Leaf, Check, Copy, CheckCircle, Loader2, AlertCircle, ExternalLink,
  Rss, Trophy, Bell, Zap, ClipboardList, BarChart2, CalendarDays, FileText,
} from "lucide-react";
import api from "../lib/api";
import { usePermissao } from "../hooks/usePermissao";

interface BillingStatus {
  plano: string;
  planoAtivo: boolean;
  emTrial: boolean;
  diasRestantesTrial: number;
  temAssinatura: boolean;
  metodoPagamento: "pix" | "cartao" | null;
  planoVencimento: string | null;
  planoSlug: string | null;
  subscriptionStatus: string;
  subscriptionType: string | null;
}

interface PixData {
  pixCopiaECola: string;
  pixQrCode: string;
  valor: number;
  periodo: "mensal" | "anual";
  planoSlug: string;
}

const PLANOS = [
  {
    slug: "hub",
    nome: "Hub de Engajamento",
    descricao: "Foco em engajamento e resultados dos pacientes",
    precoMensal: 67,
    precoAnualMensal: 55.83,
    precoAnualTotal: 670,
    destaque: false,
    modulos: [
      { icon: Rss,   label: "Feed social entre pacientes" },
      { icon: Trophy,label: "Ranking de engajamento" },
      { icon: Zap,   label: "Gamificação e desafios" },
      { icon: Bell,  label: "Notificações push" },
    ],
  },
  {
    slug: "ecossistema",
    nome: "Ecossistema Completo",
    descricao: "Tudo que você precisa para gerir sua clínica",
    precoMensal: 149,
    precoAnualMensal: 124.17,
    precoAnualTotal: 1490,
    destaque: true,
    modulos: [
      { icon: Rss,          label: "Feed + Ranking + Gamificação" },
      { icon: ClipboardList,label: "Prontuário completo" },
      { icon: BarChart2,    label: "Controle financeiro e Pix" },
      { icon: CalendarDays, label: "Agenda e consultas" },
      { icon: FileText,     label: "Planos alimentares" },
      { icon: Bell,         label: "Notificações push" },
    ],
  },
] as const;

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Planos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { planoSlug: planoAtualSlug, emTrial } = usePermissao();

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [ciclo, setCiclo] = useState<"mensal" | "anual">("mensal");
  const [loadingPlano, setLoadingPlano] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");

  const moduloDestaque = searchParams.get("modulo");

  useEffect(() => {
    api.get<BillingStatus>("/billing/status")
      .then(r => setStatus(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const r = await api.get("/billing/pix-status");
      if (r.data.planoAtivo || r.data.subscriptionStatus === "ativo") {
        setPolling(false);
        setPixData(null);
        navigate("/app/billing?sucesso=1");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [polling, navigate]);

  async function assinarPix(planoSlug: string) {
    setError("");
    setLoadingPlano(`pix-${planoSlug}`);
    try {
      const r = await api.post<PixData>("/billing/checkout-pix", { plano_slug: planoSlug, tipo: ciclo });
      setPixData(r.data);
      setPolling(true);
    } catch (e: any) {
      setError(e.response?.data?.error || "Erro ao gerar Pix. Tente novamente.");
    } finally {
      setLoadingPlano(null);
    }
  }

  async function assinarCartao(planoSlug: string) {
    setError("");
    setLoadingPlano(`cartao-${planoSlug}`);
    try {
      const r = await api.post<{ url: string }>("/billing/checkout", { plano_slug: planoSlug, tipo: ciclo });
      if (r.data.url) window.location.href = r.data.url;
      else {
        setError("Checkout por cartão não configurado. Use Pix.");
        setLoadingPlano(null);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || "Erro ao abrir checkout.");
      setLoadingPlano(null);
    }
  }

  async function gerenciarAssinatura() {
    try {
      const r = await api.post<{ url: string }>("/billing/portal");
      window.open(r.data.url, "_blank");
    } catch {
      setError("Erro ao abrir portal de assinatura.");
    }
  }

  function copiarPix() {
    if (!pixData?.pixCopiaECola) return;
    navigator.clipboard.writeText(pixData.pixCopiaECola);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zena-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zena-green-light animate-spin" />
      </div>
    );
  }

  const planoAtivo = status?.planoSlug ?? planoAtualSlug;
  const jaAssinou = (status?.planoAtivo && !status?.emTrial) || (status?.subscriptionStatus === "ativo");

  return (
    <div className="min-h-screen bg-zena-cream py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Leaf className="text-zena-green-light" size={24} />
            <span className="text-xl font-bold text-zena-green-dark">clinne</span>
          </div>
          <h1 className="text-[28px] font-bold text-zena-green-dark mb-2">Planos e Preços</h1>

          {status?.emTrial && (
            <p className="text-amber-600 font-medium text-sm">
              Você está no período de teste — {status.diasRestantesTrial} dia(s) restantes.
            </p>
          )}
          {jaAssinou && (
            <p className="text-zena-green-light font-medium text-sm">
              ✓ Plano {planoAtivo === "hub" ? "Hub de Engajamento" : "Ecossistema Completo"} ativo
              {status?.planoVencimento && ` · renova em ${new Date(status.planoVencimento).toLocaleDateString("pt-BR")}`}
            </p>
          )}

          {moduloDestaque && (
            <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700">
              <AlertCircle size={15} />
              Você precisa de um plano com este módulo para acessá-lo.
            </div>
          )}
        </div>

        {/* Toggle mensal/anual */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-white rounded-xl border border-zena-mint/30 p-1 flex gap-1">
            <button
              onClick={() => setCiclo("mensal")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                ciclo === "mensal"
                  ? "bg-zena-green-dark text-white shadow-sm"
                  : "text-zena-text-mid hover:text-zena-green-dark"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setCiclo("anual")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                ciclo === "anual"
                  ? "bg-zena-green-dark text-white shadow-sm"
                  : "text-zena-text-mid hover:text-zena-green-dark"
              }`}
            >
              Anual
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                ciclo === "anual" ? "bg-white/20 text-white" : "bg-zena-green-light/15 text-zena-green-dark"
              }`}>
                2 meses grátis
              </span>
            </button>
          </div>
        </div>

        {/* Cards de plano */}
        {!pixData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {PLANOS.map((plano) => {
              const isAtual = planoAtivo === plano.slug;
              const preco = ciclo === "anual" ? plano.precoAnualMensal : plano.precoMensal;
              const isDestaque = plano.destaque;

              return (
                <div
                  key={plano.slug}
                  className={`rounded-2xl overflow-hidden relative transition-transform ${
                    isDestaque ? "shadow-xl scale-[1.02]" : "shadow-sm"
                  } ${moduloDestaque && isDestaque ? "ring-2 ring-zena-green-light" : ""}`}
                  style={isDestaque
                    ? { background: "#1B4332" }
                    : { background: "#fff", border: "1px solid rgba(134,178,159,0.2)" }}
                >
                  {isDestaque && (
                    <div className="absolute top-4 right-4 bg-zena-green-light text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                      Mais completo
                    </div>
                  )}
                  {isAtual && (
                    <div className={`absolute top-4 left-4 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      isDestaque ? "bg-white/20 text-white" : "bg-zena-green-light/20 text-zena-green-dark"
                    }`}>
                      Plano atual
                    </div>
                  )}

                  <div className="p-7">
                    <h2 className={`text-[17px] font-bold mb-1 ${isDestaque ? "text-white" : "text-zena-green-dark"} ${isAtual || isDestaque ? "mt-6" : ""}`}>
                      {plano.nome}
                    </h2>
                    <p className={`text-[12px] mb-5 ${isDestaque ? "text-white/60" : "text-zena-text-light"}`}>
                      {plano.descricao}
                    </p>

                    {/* Preço */}
                    <div className="mb-1">
                      <span className={`text-[38px] font-extrabold leading-none ${isDestaque ? "text-zena-mint" : "text-zena-green-light"}`}>
                        R${ciclo === "anual"
                          ? fmt(preco).replace(",00", "")
                          : plano.precoMensal}
                      </span>
                      <span className={`text-[13px] ml-1 ${isDestaque ? "text-white/60" : "text-zena-text-light"}`}>/mês</span>
                    </div>
                    {ciclo === "anual" && (
                      <p className={`text-[11px] mb-5 ${isDestaque ? "text-zena-mint/80" : "text-zena-green-mid"}`}>
                        cobrado R${plano.precoAnualTotal}/ano — 2 meses grátis
                      </p>
                    )}
                    {ciclo === "mensal" && <div className="mb-5" />}

                    {/* Módulos */}
                    <ul className="space-y-2 mb-6">
                      {plano.modulos.map(({ icon: Icon, label }) => (
                        <li key={label} className={`flex items-center gap-2 text-[13px] ${isDestaque ? "text-white/85" : "text-zena-text"}`}>
                          <Icon size={13} className={isDestaque ? "text-zena-mint flex-shrink-0" : "text-zena-green-light flex-shrink-0"} />
                          {label}
                        </li>
                      ))}
                    </ul>

                    {/* Botões */}
                    {isAtual ? (
                      <div>
                        <div className={`text-center py-3 rounded-xl text-sm font-semibold ${
                          isDestaque ? "bg-white/15 text-white" : "bg-zena-green-light/15 text-zena-green-dark"
                        }`}>
                          Plano atual ✓
                        </div>
                        {status?.metodoPagamento === "cartao" && (
                          <button
                            onClick={gerenciarAssinatura}
                            className={`mt-2 w-full text-center text-[12px] flex items-center justify-center gap-1 ${
                              isDestaque ? "text-white/50 hover:text-white" : "text-zena-text-light hover:text-zena-green-dark"
                            } transition-colors`}
                          >
                            Gerenciar assinatura <ExternalLink size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <button
                          onClick={() => assinarPix(plano.slug)}
                          disabled={!!loadingPlano}
                          className={`w-full py-3 rounded-xl font-bold text-[14px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                            isDestaque
                              ? "bg-zena-mint text-zena-green-dark hover:opacity-90"
                              : "bg-zena-green-light text-white hover:bg-zena-green-mid"
                          }`}
                        >
                          {loadingPlano === `pix-${plano.slug}` && <Loader2 size={15} className="animate-spin" />}
                          Pagar com Pix — R${ciclo === "anual" ? plano.precoAnualTotal : plano.precoMensal}
                          {ciclo === "anual" ? "/ano" : "/mês"}
                        </button>
                        <button
                          onClick={() => assinarCartao(plano.slug)}
                          disabled={!!loadingPlano}
                          className={`w-full py-2.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                            isDestaque
                              ? "border border-white/25 text-white/80 hover:bg-white/10"
                              : "border border-zena-sage text-zena-text hover:bg-zena-cream"
                          }`}
                        >
                          {loadingPlano === `cartao-${plano.slug}` ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                          Pagar com cartão
                        </button>
                        <Garantias dark={isDestaque} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* QR Code Pix */}
        {pixData && (
          <div className="bg-white rounded-2xl shadow-sm border border-zena-sage/20 p-8 max-w-md mx-auto text-center">
            <CheckCircle size={40} className="text-zena-green-light mx-auto mb-4" />
            <h2 className="text-xl font-bold text-zena-green-dark mb-2">Pague com Pix</h2>
            <p className="text-zena-text text-sm mb-6">
              {pixData.planoSlug === "hub" ? "Hub de Engajamento" : "Ecossistema Completo"}
              {" — "}R${pixData.valor}{ciclo === "anual" ? "/ano" : "/mês"}
              <br />Após o pagamento, seu acesso é liberado em segundos.
            </p>

            {pixData.pixQrCode && (
              <img
                src={`data:image/png;base64,${pixData.pixQrCode}`}
                alt="QR Code Pix"
                className="w-48 h-48 mx-auto mb-6 border border-zena-sage/20 rounded-xl"
              />
            )}

            <div className="bg-zena-cream rounded-xl p-4 mb-4">
              <p className="text-xs text-zena-text mb-2 font-medium">Pix Copia e Cola</p>
              <p className="font-mono text-xs text-zena-green-dark break-all leading-relaxed">{pixData.pixCopiaECola}</p>
            </div>

            <button
              onClick={copiarPix}
              className="w-full bg-zena-green-light text-white rounded-xl py-3 font-semibold hover:bg-zena-green-mid transition-colors flex items-center justify-center gap-2 mb-4"
            >
              {copiado ? <CheckCircle size={18} /> : <Copy size={18} />}
              {copiado ? "Copiado!" : "Copiar código Pix"}
            </button>

            <div className="flex items-center gap-2 justify-center text-zena-text text-xs">
              <Loader2 size={14} className="animate-spin text-zena-green-light" />
              Aguardando confirmação...
            </div>

            <button
              onClick={() => { setPixData(null); setPolling(false); }}
              className="mt-4 text-xs text-zena-text hover:text-zena-green-dark"
            >
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Garantias({ dark }: { dark?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1 text-[10px] ${dark ? "text-white/40" : "text-zena-text-light"}`}>
      <span>✓ Cancele quando quiser</span>
      <span>✓ Sem fidelidade</span>
      <span>✓ LGPD</span>
    </div>
  );
}
