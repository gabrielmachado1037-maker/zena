import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";
import { NexvelLogo } from "../onboarding/components/NexvelLogo";
import { PrimaryButton, TextButton } from "../onboarding/components/OnbButtons";
import { ativarPushPaciente, permissaoDecidida, pushSuportado } from "../../lib/pushPaciente";

/**
 * Opt-in de notificações — mostrado uma vez, logo após completar o perfil.
 * A permissão do sistema só é solicitada ao clicar em "Ativar". Negar não bloqueia.
 * Reaproveita os componentes de marca do onboarding e o util pushPaciente.
 */
const DESTINO = "/paciente/feed";

const BENEFICIOS = [
  "Registrar hábitos sem esquecer",
  "Manter sua sequência diária",
  "Não perder desafios",
  "Receber mensagens da nutricionista",
  "Ser avisado quando subir de liga",
  "Receber novas medalhas",
];

export default function AtivarNotificacoes() {
  const { token, loading } = usePacienteAuth();
  const navigate = useNavigate();
  const [processando, setProcessando] = useState(false);
  const [negado, setNegado] = useState(false);

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nx-evo border-t-transparent" />
      </div>
    );
  }
  if (!token) return <Navigate to="/login-paciente" replace />;
  // Sem suporte ou permissão já decidida → não mostra o opt-in.
  if (!pushSuportado() || permissaoDecidida()) return <Navigate to={DESTINO} replace />;

  async function ativar() {
    setProcessando(true);
    const r = await ativarPushPaciente();
    if (r === "ok") navigate(DESTINO, { replace: true });
    else { setNegado(true); setProcessando(false); }
  }

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-black">
      <div className="relative flex w-full max-w-[440px] flex-col bg-[#0A0A0A] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-center py-2">
          <NexvelLogo className="h-[26px]" />
        </header>

        <div className="flex flex-1 flex-col">
          {!negado ? (
            <>
              <div className="mt-8 text-center">
                <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-nx-evo/12 text-3xl">🔔</div>
                <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-white">
                  Ative as <span className="text-nx-evo">notificações.</span>
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-body-md text-[#A1A1AA]">
                  Receba lembretes inteligentes para registrar seus hábitos, manter sua sequência, concluir desafios e acompanhar sua evolução.
                </p>
              </div>

              <ul className="mt-7 space-y-2.5">
                {BENEFICIOS.map((b) => (
                  <li key={b} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#141414] px-4 py-3">
                    <span className="text-nx-evo">✅</span>
                    <span className="text-body-md text-white">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto space-y-3 pt-8">
                <PrimaryButton type="button" onClick={ativar} disabled={processando}>
                  {processando ? "Ativando…" : "Ativar notificações"}
                </PrimaryButton>
                <TextButton type="button" onClick={() => navigate(DESTINO, { replace: true })}>
                  Agora não
                </TextButton>
              </div>
            </>
          ) : (
            <>
              <div className="mt-16 flex flex-col items-center text-center">
                <div className="mb-4 grid size-16 place-items-center rounded-full bg-white/5 text-3xl">🔔</div>
                <h2 className="text-[22px] font-extrabold leading-snug tracking-tight text-white">
                  Sem problemas.
                </h2>
                <p className="mt-2 max-w-sm text-body-md text-[#A1A1AA]">
                  As notificações ajudam você a manter sua evolução. Você poderá ativá-las quando quiser nas configurações.
                </p>
              </div>
              <div className="mt-auto pt-10">
                <PrimaryButton type="button" onClick={() => navigate(DESTINO, { replace: true })}>
                  Continuar
                </PrimaryButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
