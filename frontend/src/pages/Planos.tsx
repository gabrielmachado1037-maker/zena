import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, Check, Copy, CheckCircle, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import api from "../lib/api";

interface BillingStatus {
  plano: string;
  planoAtivo: boolean;
  emTrial: boolean;
  diasRestantesTrial: number;
  temAssinatura: boolean;
  metodoPagamento: "pix" | "cartao" | null;
  planoVencimento: string | null;
}

interface PixData {
  pixCopiaECola: string;
  pixQrCode: string;
  valor: number;
  periodo: "mensal" | "anual";
}

export default function Planos() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPlano, setLoadingPlano] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/billing/status").then(r => {
      setStatus(r.data);
    }).finally(() => setLoading(false));
  }, []);

  // Polling após gerar Pix — verifica se pagamento foi confirmado
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const r = await api.get("/billing/pix-status");
      if (r.data.planoAtivo) {
        setPolling(false);
        setPixData(null);
        navigate("/app/billing?sucesso=1");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [polling, navigate]);

  async function assinarPix(periodo: "mensal" | "anual") {
    setError("");
    setLoadingPlano(periodo);
    try {
      const r = await api.post("/billing/checkout-pix", { periodo });
      setPixData(r.data);
      setPolling(true);
    } catch (e: any) {
      setError(e.response?.data?.error || "Erro ao gerar Pix. Tente novamente.");
    } finally {
      setLoadingPlano(null);
    }
  }

  async function assinarCartao(periodo: "mensal" | "anual") {
    setError("");
    setLoadingPlano(`cartao-${periodo}`);
    try {
      const r = await api.post("/billing/checkout", { periodo });
      window.location.href = r.data.url;
    } catch (e: any) {
      setError(e.response?.data?.error || "Erro ao abrir checkout. Tente novamente.");
      setLoadingPlano(null);
    }
  }

  async function gerenciarAssinatura() {
    try {
      const r = await api.post("/billing/portal");
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

  const jaAssinou = status?.planoAtivo && !status?.emTrial;

  return (
    <div className="min-h-screen bg-zena-cream py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Leaf className="text-zena-green-light" size={28} />
            <span className="text-2xl font-bold text-zena-green-dark">clinne</span>
          </div>
          <h1 className="text-3xl font-bold text-zena-green-dark mb-2">Planos e Preços</h1>
          {status?.emTrial && (
            <p className="text-amber-600 font-medium">
              Você está no período de teste — {status.diasRestantesTrial} dia(s) restantes.
            </p>
          )}
          {jaAssinou && (
            <p className="text-zena-green-light font-medium">
              ✓ Plano {status?.plano} ativo
              {status?.planoVencimento && ` · renova em ${new Date(status.planoVencimento).toLocaleDateString("pt-BR")}`}
            </p>
          )}
        </div>

        {/* Cards de plano */}
        {!pixData && (
          <>
            {/* Prova social */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="flex -space-x-2">
                {["FL", "AC", "RS", "MB"].map((i, idx) => (
                  <div key={idx} className="w-8 h-8 rounded-full bg-zena-green-mid border-2 border-zena-cream flex items-center justify-center text-white text-[10px] font-bold">{i}</div>
                ))}
              </div>
              <p className="text-zena-text-mid text-sm font-medium">
                Usado por <span className="text-zena-green-dark font-bold">+200 nutricionistas</span> em todo o Brasil
              </p>
            </div>

            {/* Grid: mensal | depoimento | anual */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 mb-6 items-start">

              {/* Plano Mensal */}
              <div className="bg-white rounded-2xl shadow-sm border border-zena-sage/20 p-8">
                <h2 className="text-lg font-bold text-zena-green-dark mb-1">Plano Mensal</h2>
                <p className="text-4xl font-extrabold text-zena-green-light mb-0.5">R$69</p>
                <p className="text-zena-text text-sm mb-1">por mês</p>
                <p className="text-zena-text-mid text-xs italic mb-6">Menos que uma consulta por mês</p>
                <ul className="space-y-2 mb-8">
                  {["Pacientes ilimitados", "Planos alimentares", "Área do paciente", "Cobranças via Pix", "Suporte por email"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zena-text">
                      <Check size={16} className="text-zena-green-light flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="space-y-3">
                  <button
                    onClick={() => assinarPix("mensal")}
                    disabled={!!loadingPlano}
                    className="w-full bg-zena-green-light text-white rounded-xl py-3 font-semibold hover:bg-zena-green-mid transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingPlano === "mensal" ? <Loader2 size={16} className="animate-spin" /> : null}
                    Pagar com Pix — R$69/mês
                  </button>
                  <button
                    onClick={() => assinarCartao("mensal")}
                    disabled={!!loadingPlano}
                    className="w-full border border-zena-sage text-zena-text rounded-xl py-2.5 text-sm font-medium hover:bg-zena-cream transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingPlano === "cartao-mensal" ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                    Pagar com cartão (Stripe)
                  </button>
                  <Garantias />
                </div>
              </div>

              {/* Depoimento (centro) */}
              <div className="hidden md:flex flex-col items-center justify-center gap-4 w-48 py-8 px-2 self-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-zena-green-mid to-teal-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
                  FL
                </div>
                <blockquote className="text-center">
                  <p className="text-zena-text-dark text-sm font-medium leading-snug mb-2">
                    "Reduzi 3h de trabalho semanal com o Clinne."
                  </p>
                  <footer className="text-zena-text-light text-xs">
                    <strong className="text-zena-text-mid">Dra. Fernanda Lima</strong><br />
                    CRN-3 15890 · São Paulo
                  </footer>
                </blockquote>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => <span key={s} className="text-amber-400 text-sm">★</span>)}
                </div>
              </div>

              {/* Plano Anual */}
              <div className="bg-zena-green-dark rounded-2xl shadow-sm p-8 relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-zena-green-light text-white text-xs font-bold px-3 py-1 rounded-full">
                  MELHOR VALOR
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Plano Anual</h2>
                <p className="text-4xl font-extrabold text-zena-mint mb-0.5">R$59</p>
                <p className="text-zena-text-light text-sm mb-1">por mês · cobrado como R$708/ano</p>
                <p className="text-zena-mint text-xs font-semibold mb-6">Você economiza R$120 — 2 meses grátis</p>
                <ul className="space-y-2 mb-8">
                  {["Tudo do plano mensal", "2 meses grátis", "Suporte prioritário"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zena-text-light">
                      <Check size={16} className="text-zena-mint flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="space-y-3">
                  <button
                    onClick={() => assinarPix("anual")}
                    disabled={!!loadingPlano}
                    className="w-full bg-zena-mint text-zena-green-dark rounded-xl py-3 font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingPlano === "anual" ? <Loader2 size={16} className="animate-spin" /> : null}
                    Pagar com Pix — R$708/ano
                  </button>
                  <button
                    onClick={() => assinarCartao("anual")}
                    disabled={!!loadingPlano}
                    className="w-full border border-zena-text-light/30 text-zena-text-light rounded-xl py-2.5 text-sm font-medium hover:bg-zena-green-mid transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingPlano === "cartao-anual" ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                    Pagar com cartão (Stripe)
                  </button>
                  <Garantias dark />
                </div>
              </div>
            </div>

            {/* Depoimento mobile (abaixo dos cards) */}
            <div className="md:hidden flex items-center gap-4 bg-white rounded-2xl p-5 border border-zena-sage/20 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zena-green-mid to-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                FL
              </div>
              <div>
                <p className="text-zena-text-dark text-sm font-medium">"Reduzi 3h de trabalho semanal com o Clinne."</p>
                <p className="text-zena-text-light text-xs mt-1">Dra. Fernanda Lima · CRN-3 15890</p>
                <div className="flex gap-0.5 mt-1">{[1,2,3,4,5].map(s => <span key={s} className="text-amber-400 text-xs">★</span>)}</div>
              </div>
            </div>
          </>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* QR Code / Copia e cola Pix */}
        {pixData && (
          <div className="bg-white rounded-2xl shadow-sm border border-zena-sage/20 p-8 max-w-lg mx-auto text-center">
            <CheckCircle size={40} className="text-zena-green-light mx-auto mb-4" />
            <h2 className="text-xl font-bold text-zena-green-dark mb-2">Pague com Pix</h2>
            <p className="text-zena-text text-sm mb-6">
              Plano {pixData.periodo === "mensal" ? "Mensal" : "Anual"} — R${pixData.periodo === "mensal" ? "69" : "708"}<br />
              Após o pagamento, seu acesso é liberado em segundos.
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
              Aguardando confirmação do pagamento...
            </div>

            <button
              onClick={() => { setPixData(null); setPolling(false); }}
              className="mt-4 text-xs text-zena-text hover:text-zena-green-dark"
            >
              Voltar para os planos
            </button>
          </div>
        )}

        {/* Gestão de assinatura ativa */}
        {jaAssinou && !pixData && (
          <div className="bg-white rounded-xl border border-zena-sage/20 p-6 text-center">
            <p className="text-zena-text text-sm mb-3">
              Quer gerenciar sua assinatura por cartão ou atualizar dados de pagamento?
            </p>
            {status?.metodoPagamento === "cartao" && (
              <button
                onClick={gerenciarAssinatura}
                className="text-zena-green-light font-medium text-sm hover:underline flex items-center gap-1 mx-auto"
              >
                Acessar portal de assinatura <ExternalLink size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Garantias({ dark }: { dark?: boolean }) {
  const cls = dark ? "text-zena-text-light/70" : "text-zena-text-light";
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1 ${cls} text-[11px]`}>
      <span>✓ Cancele quando quiser</span>
      <span>✓ Sem fidelidade</span>
      <span>✓ Dados protegidos (LGPD)</span>
    </div>
  );
}
