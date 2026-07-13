import { useState } from "react";
import { MailWarning, X } from "lucide-react";
import { usePacienteAuth } from "../contexts/PacienteAuthContext";
import apiPaciente from "../lib/apiPaciente";

const VERDE = "#7CFF5B";

// Nudge de verificação de e-mail do paciente (soft gate). Só aparece quando o
// backend reportou emailVerificado === false; não bloqueia nada.
export default function EmailVerificacaoBannerPaciente() {
  const { paciente } = usePacienteAuth();
  const [dispensado, setDispensado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!paciente || paciente.emailVerificado !== false || dispensado) return null;

  async function reenviar() {
    setEnviando(true);
    setMsg(null);
    try {
      await apiPaciente.post("/auth/paciente/reenviar-verificacao");
      setMsg("E-mail de confirmação reenviado. Confira sua caixa de entrada (e o spam).");
    } catch {
      setMsg("Não foi possível reenviar agora. Tente novamente em alguns minutos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 text-sm"
      style={{ background: "#16181D", borderBottom: "1px solid #2A2F38" }}
    >
      <MailWarning size={16} color={VERDE} className="flex-shrink-0" />
      <div className="flex-1 min-w-0" style={{ color: "#9CA3AF" }}>
        {msg ? (
          <span style={{ color: "#E5E7EB" }}>{msg}</span>
        ) : (
          <span>
            Confirme seu e-mail{" "}
            <strong className="break-all" style={{ color: "#E5E7EB" }}>{paciente.email}</strong> para proteger sua conta.
          </span>
        )}
      </div>
      {!msg && (
        <button
          onClick={reenviar}
          disabled={enviando}
          className="font-semibold flex-shrink-0 disabled:opacity-50"
          style={{ color: VERDE }}
        >
          {enviando ? "Enviando…" : "Reenviar"}
        </button>
      )}
      <button onClick={() => setDispensado(true)} className="flex-shrink-0" style={{ color: "#6B7280" }} aria-label="Dispensar">
        <X size={15} />
      </button>
    </div>
  );
}
