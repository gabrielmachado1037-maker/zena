import { useState } from "react";
import { MailWarning, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

// Nudge de verificação de e-mail (soft gate). Só aparece quando o backend
// reportou emailVerificado === false; não bloqueia nada.
export default function EmailVerificacaoBanner() {
  const { nutricionista } = useAuth();
  const [dispensado, setDispensado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!nutricionista || nutricionista.emailVerificado !== false || dispensado) return null;

  async function reenviar() {
    setEnviando(true);
    setMsg(null);
    try {
      await api.post("/auth/reenviar-verificacao");
      setMsg("E-mail de confirmação reenviado. Confira sua caixa de entrada (e o spam).");
    } catch {
      setMsg("Não foi possível reenviar agora. Tente novamente em alguns minutos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="bg-nx-container border-b border-nx-border px-4 py-2.5 flex items-center gap-3 text-sm">
      <MailWarning size={16} className="text-nx-evo flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {msg ? (
          <span className="text-nx-on-surface">{msg}</span>
        ) : (
          <span className="text-nx-on-surface-variant">
            Confirme seu e-mail{" "}
            <strong className="text-nx-on-surface break-all">{nutricionista.email}</strong> para proteger sua conta.
          </span>
        )}
      </div>
      {!msg && (
        <button
          onClick={reenviar}
          disabled={enviando}
          className="text-nx-evo font-semibold hover:underline disabled:opacity-50 flex-shrink-0"
        >
          {enviando ? "Enviando…" : "Reenviar"}
        </button>
      )}
      <button
        onClick={() => setDispensado(true)}
        className="text-nx-outline hover:text-nx-on-surface flex-shrink-0"
        aria-label="Dispensar"
      >
        <X size={15} />
      </button>
    </div>
  );
}
