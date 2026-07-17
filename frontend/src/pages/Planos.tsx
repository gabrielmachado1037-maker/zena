import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Copy, CheckCircle, Loader2, AlertCircle, ExternalLink, CreditCard, QrCode, Check,
  Gamepad2, Medal, Target, LineChart, Sparkles, CalendarCheck, ClipboardList, MessageCircle,
} from "lucide-react";
import api from "../lib/api";
import { usePermissao } from "../hooks/usePermissao";
import { useAuth } from "../contexts/AuthContext";
import { CardNx, ButtonNx } from "../components/ui-nx";

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

// Slug mantém "ecossistema" (o backend espera esse identificador); só o NOME
// de exibição muda para "Nexvel Pro".
const PLANO = {
  slug: "ecossistema",
  nome: "Nexvel Pro",
  precoMensal: 149,
  precoAnualMensal: 124.17,
  precoAnualTotal: 1490,
  limite: "Até 50 pacientes ativos.",
  beneficios: [
    { icon: Gamepad2,      label: "Gamificação completa para pacientes" },
    { icon: Medal,         label: "Ligas e ranking automáticos" },
    { icon: Target,        label: "Desafios personalizados" },
    { icon: LineChart,     label: "Relatórios inteligentes de adesão" },
    { icon: Sparkles,      label: "IA com sugestões para nutricionistas" },
    { icon: CalendarCheck, label: "Check-ins diários automatizados" },
    { icon: ClipboardList, label: "Histórico completo do paciente" },
    { icon: MessageCircle, label: "WhatsApp e notificações inteligentes" },
  ],
} as const;

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function maskCpf(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function Planos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { planoSlug: planoAtualSlug } = usePermissao();
  const { nutricionista } = useAuth();

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [ciclo, setCiclo] = useState<"mensal" | "anual">("mensal");
  const [loadingPlano, setLoadingPlano] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixForm, setPixForm] = useState(false);
  const [cpf, setCpf] = useState("");
  const [nomeCpf, setNomeCpf] = useState("");
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
    const cpfDigits = cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) { setError("Informe um CPF válido (11 dígitos)."); return; }
    if (!nomeCpf.trim()) { setError("Informe o nome completo."); return; }
    setError("");
    setLoadingPlano(`pix-${planoSlug}`);
    try {
      const r = await api.post<PixData>("/billing/checkout-pix", { plano_slug: planoSlug, tipo: ciclo, cpf: cpfDigits, nome: nomeCpf.trim() });
      setPixData(r.data);
      setPixForm(false);
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
      <div className="min-h-screen bg-nx-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-nx-evo animate-spin" />
      </div>
    );
  }

  const planoAtivo = status?.planoSlug ?? planoAtualSlug;
  const isAtual = planoAtivo === PLANO.slug;
  const jaAssinou = (status?.planoAtivo && !status?.emTrial) || (status?.subscriptionStatus === "ativo");
  const precoMensalStr = ciclo === "anual" ? fmt(PLANO.precoAnualMensal) : String(PLANO.precoMensal);
  const totalCiclo = ciclo === "anual" ? PLANO.precoAnualTotal : PLANO.precoMensal;

  return (
    <div className="min-h-screen bg-nx-bg px-5 py-10">
      <div className="mx-auto max-w-md">

        {/* Header — posicionamento */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-nx-brand/40 bg-nx-brand/10 px-3 py-1 text-label-sm font-semibold uppercase tracking-wide text-nx-brand">
            <img src="/nexvel-x-512.png" alt="" className="h-3.5 w-auto" />
            Nexvel Pro
          </span>
          <h1 className="mt-4 text-headline-lg font-extrabold leading-tight text-nx-on-surface text-balance">
            Faça seus pacientes seguirem o plano com mais consistência
          </h1>
          <p className="mt-2 text-body-md text-nx-on-surface-variant">
            Teste gratuito por 14 dias. Depois R$149/mês.
          </p>

          {status?.emTrial && !jaAssinou && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-nx-gold/12 px-3 py-1 text-body-sm font-medium text-nx-gold">
              Teste ativo — {status.diasRestantesTrial} dia(s) restantes
            </p>
          )}
          {/* Trial expirado (dia 15): o app bloqueia até assinar — paywall. */}
          {!jaAssinou && !status?.emTrial && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-nx-md border border-nx-danger/30 bg-nx-danger/10 px-4 py-2.5 text-body-sm font-medium text-nx-danger">
              <AlertCircle size={15} className="shrink-0" />
              Seu teste gratuito terminou. Assine o Nexvel Pro para voltar a usar o app.
            </div>
          )}
          {moduloDestaque && !jaAssinou && status?.emTrial && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-nx-md border border-nx-gold/30 bg-nx-gold/10 px-4 py-2 text-body-sm text-nx-gold">
              <AlertCircle size={15} />
              Assine o Nexvel Pro para garantir este recurso após o teste.
            </div>
          )}
        </div>

        {/* Toggle mensal/anual */}
        {!pixData && !jaAssinou && (
          <div className="mb-6 flex justify-center">
            <div className="flex gap-1 rounded-nx-md border border-nx-border bg-nx-container p-1">
              <button
                onClick={() => setCiclo("mensal")}
                className={`rounded-nx-sm px-5 py-2 text-body-sm font-semibold transition-all ${
                  ciclo === "mensal" ? "bg-nx-evo text-nx-on-evo" : "text-nx-on-surface-variant hover:text-nx-on-surface"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setCiclo("anual")}
                className={`flex items-center gap-2 rounded-nx-sm px-5 py-2 text-body-sm font-semibold transition-all ${
                  ciclo === "anual" ? "bg-nx-evo text-nx-on-evo" : "text-nx-on-surface-variant hover:text-nx-on-surface"
                }`}
              >
                Anual
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  ciclo === "anual" ? "bg-nx-on-evo/15 text-nx-on-evo" : "bg-nx-evo/12 text-nx-evo"
                }`}>
                  2 meses grátis
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-nx-md border border-nx-danger/30 bg-nx-danger/10 p-4">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-nx-danger" />
            <p className="text-body-sm text-nx-danger">{error}</p>
          </div>
        )}

        {/* Card do plano */}
        {!pixData && !pixForm && (
          <CardNx glow className="p-7">
            {isAtual && (
              <span className="mb-4 inline-flex rounded-full bg-nx-evo/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-nx-evo">
                Seu plano
              </span>
            )}

            <h2 className="text-headline-md font-bold text-nx-on-surface">{PLANO.nome}</h2>

            {/* Preço */}
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-display-lg font-extrabold leading-none text-nx-on-surface">
                R${precoMensalStr}
              </span>
              <span className="text-body-md text-nx-on-surface-variant">/mês</span>
            </div>
            {ciclo === "anual" ? (
              <p className="mt-1 text-body-sm text-nx-evo">
                cobrado R${PLANO.precoAnualTotal}/ano — 2 meses grátis
              </p>
            ) : (
              <p className="mt-1 text-body-sm text-nx-on-surface-variant">{PLANO.limite}</p>
            )}
            {ciclo === "anual" && <p className="mt-0.5 text-body-sm text-nx-on-surface-variant">{PLANO.limite}</p>}

            {/* Benefícios */}
            <ul className="mt-6 space-y-3">
              {PLANO.beneficios.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-body-md text-nx-on-surface">
                  <span className="grid size-7 shrink-0 place-items-center rounded-nx-sm bg-nx-evo/12">
                    <Icon size={15} className="text-nx-evo" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>

            {/* Ações */}
            <div className="mt-7">
              {jaAssinou ? (
                <div>
                  <div className="flex items-center justify-center gap-2 rounded-nx-md bg-nx-evo/12 py-3.5 text-body-md font-semibold text-nx-evo">
                    <Check size={18} strokeWidth={3} />
                    Plano ativo
                  </div>
                  {status?.planoVencimento && (
                    <p className="mt-2 text-center text-body-sm text-nx-on-surface-variant">
                      Renova em {new Date(status.planoVencimento).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  {status?.metodoPagamento === "cartao" && (
                    <button
                      onClick={gerenciarAssinatura}
                      className="mt-2 flex w-full items-center justify-center gap-1 text-body-sm text-nx-on-surface-variant transition-colors hover:text-nx-on-surface"
                    >
                      Gerenciar assinatura <ExternalLink size={13} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {status?.emTrial && (
                    <p className="text-center text-body-sm text-nx-on-surface-variant">
                      Seu teste de 14 dias já está ativo — <span className="font-medium text-nx-on-surface">nenhum cartão necessário</span>. Assine quando quiser para continuar depois.
                    </p>
                  )}
                  <ButtonNx
                    variant="evo"
                    size="lg"
                    block
                    disabled={!!loadingPlano}
                    onClick={() => assinarCartao(PLANO.slug)}
                    leftIcon={loadingPlano === `cartao-${PLANO.slug}` ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                  >
                    Assinar com cartão · R${totalCiclo}{ciclo === "anual" ? "/ano" : "/mês"}
                  </ButtonNx>
                  <ButtonNx
                    variant="surface"
                    size="lg"
                    block
                    disabled={!!loadingPlano}
                    onClick={() => { setError(""); setNomeCpf((n) => n || nutricionista?.nome || ""); setPixForm(true); }}
                    leftIcon={<QrCode size={18} />}
                  >
                    Pagar com Pix
                  </ButtonNx>
                  <Garantias />
                </div>
              )}
            </div>
          </CardNx>
        )}

        {/* Nome + CPF (Asaas exige CPF/CNPJ para gerar o Pix e emitir a nota) */}
        {pixForm && !pixData && (
          <CardNx className="p-7">
            <button onClick={() => setPixForm(false)} className="mb-4 text-body-sm text-nx-on-surface-variant transition-colors hover:text-nx-on-surface">← Voltar</button>
            <h2 className="text-headline-md font-bold text-nx-on-surface">Dados para o Pix</h2>
            <p className="mt-2 text-body-sm text-nx-on-surface-variant">Precisamos do seu nome e CPF para gerar a cobrança e a nota fiscal.</p>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-label-sm font-medium text-nx-on-surface-variant">Nome completo</span>
                <input
                  value={nomeCpf}
                  onChange={(e) => setNomeCpf(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full rounded-nx-md border border-nx-border bg-nx-container px-4 py-3 text-body-md text-nx-on-surface placeholder:text-nx-on-surface-variant focus:border-nx-evo focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-label-sm font-medium text-nx-on-surface-variant">CPF</span>
                <input
                  value={cpf}
                  onChange={(e) => setCpf(maskCpf(e.target.value))}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className="w-full rounded-nx-md border border-nx-border bg-nx-container px-4 py-3 text-body-md tabular-nums text-nx-on-surface placeholder:text-nx-on-surface-variant focus:border-nx-evo focus:outline-none"
                />
              </label>
            </div>
            <ButtonNx
              variant="evo"
              size="lg"
              block
              className="mt-6"
              disabled={!!loadingPlano}
              onClick={() => assinarPix(PLANO.slug)}
              leftIcon={loadingPlano === `pix-${PLANO.slug}` ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
            >
              Gerar Pix · R${totalCiclo}{ciclo === "anual" ? "/ano" : "/mês"}
            </ButtonNx>
          </CardNx>
        )}

        {/* QR Code Pix */}
        {pixData && (
          <CardNx className="p-8 text-center">
            <CheckCircle size={40} className="mx-auto mb-4 text-nx-evo" />
            <h2 className="text-headline-md font-bold text-nx-on-surface">Pague com Pix</h2>
            <p className="mt-2 text-body-sm text-nx-on-surface-variant">
              {PLANO.nome}{" — "}R${pixData.valor}{ciclo === "anual" ? "/ano" : "/mês"}
              <br />Após o pagamento, seu acesso é liberado em segundos.
            </p>

            {pixData.pixQrCode && (
              <img
                src={`data:image/png;base64,${pixData.pixQrCode}`}
                alt="QR Code Pix"
                className="mx-auto my-6 h-48 w-48 rounded-nx-md border border-nx-border bg-white p-1"
              />
            )}

            <div className="mb-4 rounded-nx-md border border-nx-border bg-nx-container p-4 text-left">
              <p className="mb-2 text-label-sm font-medium text-nx-on-surface-variant">Pix Copia e Cola</p>
              <p className="break-all font-mono text-body-sm leading-relaxed text-nx-on-surface">{pixData.pixCopiaECola}</p>
            </div>

            <ButtonNx variant="evo" size="lg" block onClick={copiarPix} leftIcon={copiado ? <CheckCircle size={18} /> : <Copy size={18} />}>
              {copiado ? "Copiado!" : "Copiar código Pix"}
            </ButtonNx>

            <div className="mt-4 flex items-center justify-center gap-2 text-body-sm text-nx-on-surface-variant">
              <Loader2 size={14} className="animate-spin text-nx-evo" />
              Aguardando confirmação...
            </div>

            <button
              onClick={() => { setPixData(null); setPolling(false); }}
              className="mt-4 text-body-sm text-nx-on-surface-variant transition-colors hover:text-nx-on-surface"
            >
              Voltar
            </button>
          </CardNx>
        )}
      </div>
    </div>
  );
}

function Garantias() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-2 text-label-sm text-nx-on-surface-variant">
      <span>✓ Cancele quando quiser</span>
      <span>✓ Sem fidelidade</span>
      <span>✓ LGPD</span>
    </div>
  );
}
