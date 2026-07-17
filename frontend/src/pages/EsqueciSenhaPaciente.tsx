import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MailCheck } from "lucide-react";
import api from "../lib/api";
import { NexvelLogo } from "./onboarding/components/NexvelLogo";
import { PrimaryButton } from "./onboarding/components/OnbButtons";

/**
 * "Esqueci a senha" do paciente — pede o e-mail e dispara o link de redefinição.
 * Mesma identidade dark/verde do login do paciente. Sempre mostra a tela de
 * confirmação (o backend não revela se o e-mail existe — anti-enumeração).
 */
export default function EsqueciSenhaPaciente() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(""); setLoading(true);
    try {
      await api.post("/auth/paciente/esqueci-senha", { email: email.trim() });
      setEnviado(true);
    } catch (err: any) {
      setErro(err.response?.data?.error || "Não foi possível enviar agora. Tente novamente.");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-black">
      <style>{`.nx-input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #141414 inset;-webkit-text-fill-color:#fff;caret-color:#fff}`}</style>

      <div className="relative flex w-full max-w-[440px] flex-col bg-[#0A0A0A] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between py-2">
          <button
            type="button" onClick={() => navigate("/login-paciente")} aria-label="Voltar"
            className="grid size-10 place-items-center rounded-full text-[#A1A1AA] transition-colors hover:bg-white/5 hover:text-white active:scale-95"
          >
            <ArrowLeft className="size-5" />
          </button>
        </header>

        <div className="mt-8">
          <NexvelLogo className="h-[30px]" />

          {enviado ? (
            <div className="mt-8">
              <span className="grid size-14 place-items-center rounded-full bg-nx-evo/12 text-nx-evo">
                <MailCheck className="size-7" />
              </span>
              <h1 className="mt-6 text-[30px] font-extrabold leading-tight tracking-tight text-white">
                Verifique seu <span className="text-nx-evo">e-mail.</span>
              </h1>
              <p className="mt-3 text-body-md leading-relaxed text-[#A1A1AA]">
                Se houver uma conta com <span className="font-semibold text-white">{email.trim()}</span>, enviamos um link para redefinir sua senha. O link vale por 1 hora.
              </p>
              <p className="mt-2 text-body-sm text-[#71717A]">
                Não recebeu? Confira a caixa de spam ou tente novamente em alguns minutos.
              </p>
              <Link
                to="/login-paciente"
                className="mt-8 flex w-full items-center justify-center rounded-2xl bg-nx-evo py-3.5 text-body-md font-bold text-nx-on-evo transition-colors hover:bg-nx-evo-2"
              >
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mt-8 text-[30px] font-extrabold leading-tight tracking-tight text-white">
                Esqueceu a <span className="text-nx-evo">senha?</span>
              </h1>
              <p className="mt-2 text-body-md text-[#A1A1AA]">
                Informe seu e-mail e enviaremos um link para você criar uma nova senha.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div>
                  <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">E-mail</label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com" autoComplete="email" required
                    className="nx-input w-full rounded-2xl border border-white/[0.08] bg-[#141414] px-4 py-3.5 text-body-md text-white placeholder:text-[#52525b] focus:border-nx-evo/60 focus:outline-none focus:ring-2 focus:ring-nx-evo/40 transition-colors"
                  />
                </div>

                {erro && (
                  <p className="rounded-xl border border-nx-danger/25 bg-nx-danger/10 px-3.5 py-2.5 text-body-sm font-medium text-nx-danger">
                    {erro}
                  </p>
                )}

                <PrimaryButton type="submit" disabled={loading} className="mt-2">
                  {loading ? "Enviando…" : "Enviar link"}
                </PrimaryButton>
              </form>

              <p className="mt-6 text-center text-body-sm text-[#A1A1AA]">
                Lembrou a senha?{" "}
                <Link to="/login-paciente" className="font-bold text-nx-evo transition-colors hover:text-nx-evo-2">
                  Entrar
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
