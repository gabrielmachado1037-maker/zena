import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import api from "../lib/api";
import { cn } from "../lib/utils";
import { NexvelLogo } from "./onboarding/components/NexvelLogo";
import { PrimaryButton } from "./onboarding/components/OnbButtons";

/**
 * Redefinição de senha do paciente — abre pelo link do e-mail (?token=...).
 * Nova senha + confirmação; ao concluir, leva ao login. Mesma identidade do login.
 */
export default function RedefinirSenhaPaciente() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const token = sp.get("token") ?? "";

  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [show, setShow] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (senha.length < 6) { setErro("A senha deve ter ao menos 6 caracteres."); return; }
    if (senha !== confirma) { setErro("As senhas não conferem."); return; }
    setErro(""); setLoading(true);
    try {
      await api.post("/auth/paciente/redefinir-senha", { token, novaSenha: senha });
      setOk(true);
    } catch (err: any) {
      setErro(err.response?.data?.error || "Não foi possível redefinir a senha. Tente novamente.");
    } finally { setLoading(false); }
  }

  const inputCls =
    "nx-input w-full rounded-2xl border border-white/[0.08] bg-[#141414] px-4 py-3.5 text-body-md text-white " +
    "placeholder:text-[#52525b] focus:border-nx-evo/60 focus:outline-none focus:ring-2 focus:ring-nx-evo/40 transition-colors";

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

          {ok ? (
            <div className="mt-8">
              <span className="grid size-14 place-items-center rounded-full bg-nx-evo/12 text-nx-evo">
                <CheckCircle2 className="size-7" />
              </span>
              <h1 className="mt-6 text-[30px] font-extrabold leading-tight tracking-tight text-white">
                Senha <span className="text-nx-evo">alterada!</span>
              </h1>
              <p className="mt-3 text-body-md text-[#A1A1AA]">
                Pronto. Agora é só entrar com a sua nova senha.
              </p>
              <Link
                to="/login-paciente"
                className="mt-8 flex w-full items-center justify-center rounded-2xl bg-nx-evo py-3.5 text-body-md font-bold text-nx-on-evo transition-colors hover:bg-nx-evo-2"
              >
                Entrar
              </Link>
            </div>
          ) : !token ? (
            <div className="mt-8">
              <h1 className="text-[30px] font-extrabold leading-tight tracking-tight text-white">
                Link <span className="text-nx-evo">inválido.</span>
              </h1>
              <p className="mt-3 text-body-md text-[#A1A1AA]">
                Este link de redefinição está incompleto ou expirou. Solicite um novo.
              </p>
              <Link
                to="/esqueci-senha-paciente"
                className="mt-8 flex w-full items-center justify-center rounded-2xl bg-nx-evo py-3.5 text-body-md font-bold text-nx-on-evo transition-colors hover:bg-nx-evo-2"
              >
                Solicitar novo link
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mt-8 text-[30px] font-extrabold leading-tight tracking-tight text-white">
                Crie uma nova <span className="text-nx-evo">senha.</span>
              </h1>
              <p className="mt-2 text-body-md text-[#A1A1AA]">
                Escolha uma senha com pelo menos 6 caracteres.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div>
                  <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">Nova senha</label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)}
                      placeholder="••••••••" required minLength={6} autoComplete="new-password"
                      className={cn(inputCls, "pr-12")}
                    />
                    <button
                      type="button" onClick={() => setShow((s) => !s)}
                      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#A1A1AA] transition-colors hover:text-white"
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">Confirmar nova senha</label>
                  <input
                    type={show ? "text" : "password"} value={confirma} onChange={(e) => setConfirma(e.target.value)}
                    placeholder="••••••••" required minLength={6} autoComplete="new-password"
                    className={inputCls}
                  />
                </div>

                {erro && (
                  <p className="rounded-xl border border-nx-danger/25 bg-nx-danger/10 px-3.5 py-2.5 text-body-sm font-medium text-nx-danger">
                    {erro}
                  </p>
                )}

                <PrimaryButton type="submit" disabled={loading} className="mt-2">
                  {loading ? "Salvando…" : "Redefinir senha"}
                </PrimaryButton>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
