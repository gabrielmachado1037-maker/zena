import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Check, ShieldCheck } from "lucide-react";
import { ButtonNx } from "@/components/ui-nx";
import { checkoutParceria, statusPagamento, type CheckoutResp } from "@/lib/parceria";
import type { AxiosError } from "axios";

export function MarketplacePagarScreen() {
  const navigate = useNavigate();
  const { parceiroId = "" } = useParams();

  const [cpf, setCpf] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pix, setPix] = useState<CheckoutResp | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function gerar() {
    setErro(null);
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11 && digits.length !== 14) {
      setErro("Informe um CPF válido (11 dígitos).");
      return;
    }
    setGerando(true);
    try {
      const r = await checkoutParceria(parceiroId, digits);
      setPix(r);
    } catch (e) {
      const ax = e as AxiosError<{ error?: string; code?: string; message?: string }>;
      if (ax.response?.status === 409) {
        setErro("Você já tem um acesso ativo. Aguarde o vencimento para escolher outro.");
      } else {
        setErro(ax.response?.data?.error || "Não foi possível gerar o Pix. Tente novamente.");
      }
    } finally {
      setGerando(false);
    }
  }

  // Poll do pagamento enquanto o QR está na tela.
  useEffect(() => {
    if (!pix) return;
    pollRef.current = setInterval(async () => {
      try {
        const s = await statusPagamento(pix.consultaId);
        if (s.pago) {
          setConfirmado(true);
          if (pollRef.current) clearInterval(pollRef.current);
          navTimerRef.current = setTimeout(() => navigate("/paciente/parceria", { replace: true }), 1400);
        }
      } catch { /* segue tentando */ }
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, [pix, navigate]);

  async function copiar() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.pixCopiaECola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* clipboard bloqueado */ }
  }

  return (
    <div className="space-y-6 px-5 pb-24 pt-7">
      <header>
        <button
          onClick={() => navigate("/paciente/parceria/escolher")}
          className="mb-3 inline-flex items-center gap-1.5 text-body-sm font-semibold text-nx-on-surface-variant transition-colors hover:text-nx-on-surface"
        >
          <ArrowLeft className="size-4" /> Trocar nutricionista
        </button>
        <h1 className="text-headline-lg text-nx-on-surface">Pagamento</h1>
        <p className="mt-0.5 text-body-md text-nx-on-surface-variant">
          {pix ? `Consulta com ${pix.parceiroNome}` : "Consulta avulsa · 30 dias de acesso completo"}
        </p>
      </header>

      {/* Resumo do valor */}
      <div className="flex items-center justify-between rounded-nx-lg border border-nx-border bg-nx-surface p-5">
        <div>
          <p className="text-label-sm uppercase tracking-wide text-nx-on-surface-variant">Total</p>
          <p className="text-display-lg font-extrabold leading-none text-nx-evo">R$ 200</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-nx-evo/10 px-3 py-1.5 text-label-sm font-semibold text-nx-evo">
          <ShieldCheck className="size-3.5" /> Pix seguro
        </span>
      </div>

      {confirmado ? (
        <div className="rounded-nx-xl border border-nx-evo/40 bg-nx-evo/[0.08] p-8 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-nx-evo/15 text-nx-evo">
            <Check className="size-7" />
          </div>
          <p className="text-headline-md font-bold text-nx-on-surface">Pagamento confirmado!</p>
          <p className="mt-1 text-body-sm text-nx-on-surface-variant">Liberando seu acesso…</p>
        </div>
      ) : !pix ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-label-md font-semibold text-nx-on-surface">CPF do pagador</label>
            <input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              inputMode="numeric"
              placeholder="000.000.000-00"
              className="w-full rounded-nx-md border border-nx-border bg-nx-container-low px-4 py-3 text-body-md text-nx-on-surface outline-none placeholder:text-nx-on-surface-variant/60 focus:border-nx-evo/60"
            />
            <p className="mt-1.5 text-label-sm text-nx-on-surface-variant">Exigido pelo Pix para emitir a cobrança.</p>
          </div>
          {erro && <p className="text-body-sm font-medium text-nx-danger">{erro}</p>}
          <ButtonNx variant="evo" block size="lg" onClick={gerar} disabled={gerando}>
            {gerando ? "Gerando Pix…" : "Gerar Pix de R$ 200"}
          </ButtonNx>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-nx-xl border border-nx-border bg-nx-surface p-5 text-center">
            <p className="mb-3 text-body-sm text-nx-on-surface-variant">Escaneie no app do seu banco</p>
            <img
              src={`data:image/png;base64,${pix.pixQrCode}`}
              alt="QR Code Pix"
              className="mx-auto size-56 rounded-nx-md bg-white p-2"
            />
          </div>

          <button
            onClick={copiar}
            className="flex w-full items-center justify-between gap-3 rounded-nx-md border border-nx-border bg-nx-container-low px-4 py-3 text-left transition-colors hover:bg-nx-container-high"
          >
            <span className="min-w-0 flex-1 truncate text-body-sm text-nx-on-surface-variant">{pix.pixCopiaECola}</span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-body-sm font-bold text-nx-evo">
              {copiado ? <><Check className="size-4" /> Copiado</> : <><Copy className="size-4" /> Copiar</>}
            </span>
          </button>

          <div className="flex items-center justify-center gap-2 rounded-nx-md bg-nx-container-low py-3 text-body-sm text-nx-on-surface-variant">
            <div className="size-4 animate-spin rounded-full border-2 border-nx-evo border-t-transparent" />
            Aguardando confirmação do pagamento…
          </div>
        </div>
      )}
    </div>
  );
}
