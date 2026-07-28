import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";
import { NexvelLogo } from "../onboarding/components/NexvelLogo";
import { PrimaryButton } from "../onboarding/components/OnbButtons";
import { cn } from "../../lib/utils";

const INPUT_CLS =
  "nx-input w-full rounded-2xl border border-white/[0.08] bg-[#141414] px-4 py-3.5 text-body-md text-white " +
  "placeholder:text-[#52525b] focus:border-nx-evo/60 focus:outline-none focus:ring-2 focus:ring-nx-evo/40 transition-colors";

/** Cadastro AVULSO do paciente (B2C) — sem código de convite. Depois vai ao marketplace. */
export default function PacienteCadastro() {
  const navigate = useNavigate();
  const { signup } = usePacienteAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [aceite, setAceite] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!aceite) {
      setError("É necessário aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }
    setError(""); setLoading(true);
    try {
      await signup(nome.trim(), email.trim(), senha, undefined, aceite);
      // Sem nutri ainda → segue direto para escolher um parceiro.
      navigate("/paciente/parceria/escolher", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || "Não foi possível criar a conta. Tente novamente.");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-black">
      <style>{`.nx-input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #141414 inset;-webkit-text-fill-color:#fff;caret-color:#fff}`}</style>
      <div className="relative flex w-full max-w-[440px] flex-col bg-[#0A0A0A] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between py-2">
          <button
            type="button" onClick={() => navigate("/paciente-comecar")} aria-label="Voltar"
            className="grid size-10 place-items-center rounded-full text-[#A1A1AA] transition-colors hover:bg-white/5 hover:text-white active:scale-95"
          >
            <ArrowLeft className="size-5" />
          </button>
        </header>

        <div className="mt-8">
          <NexvelLogo className="h-[30px]" />
          <h1 className="mt-8 text-[30px] font-extrabold leading-tight tracking-tight text-white">
            Crie a sua <span className="text-nx-evo">conta.</span>
          </h1>
          <p className="mt-2 text-body-md text-[#A1A1AA]">Depois você escolhe seu nutricionista parceiro.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Seu nome" autoComplete="name" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">E-mail</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="seu@email.com" autoComplete="email" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">Crie uma senha</label>
              <div className="relative">
                <input
                  type={showSenha ? "text" : "password"} value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••" required minLength={6} autoComplete="new-password"
                  className={cn(INPUT_CLS, "pr-12")}
                />
                <button
                  type="button" onClick={() => setShowSenha((s) => !s)}
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#A1A1AA] transition-colors hover:text-white"
                >
                  {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 pt-1">
              <input
                type="checkbox" checked={aceite}
                onChange={(e) => setAceite(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 cursor-pointer appearance-none rounded-md border border-white/[0.15] bg-[#141414] transition-colors checked:border-nx-evo checked:bg-nx-evo focus:outline-none focus:ring-2 focus:ring-nx-evo/40 checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2308130A%22><path fill-rule=%22evenodd%22 d=%22M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z%22 clip-rule=%22evenodd%22/></svg>')] checked:bg-center checked:bg-no-repeat"
              />
              <span className="text-body-sm leading-snug text-[#A1A1AA]">
                Li e aceito os{" "}
                <Link to="/termos" target="_blank" rel="noopener noreferrer" className="font-semibold text-nx-evo underline-offset-2 hover:underline">Termos de Uso</Link>
                {" "}e a{" "}
                <Link to="/privacidade" target="_blank" rel="noopener noreferrer" className="font-semibold text-nx-evo underline-offset-2 hover:underline">Política de Privacidade</Link>.
              </span>
            </label>

            {error && (
              <p className="rounded-xl border border-nx-danger/25 bg-nx-danger/10 px-3.5 py-2.5 text-body-sm font-medium text-nx-danger">
                {error}
              </p>
            )}

            <PrimaryButton type="submit" disabled={loading || !aceite} className="mt-2">
              {loading ? "Criando…" : "Criar conta e escolher nutricionista"}
            </PrimaryButton>
          </form>

          <p className="mt-6 text-center text-body-sm text-[#A1A1AA]">
            Já tem uma conta?{" "}
            <Link to="/login-paciente" className="font-bold text-nx-evo transition-colors hover:text-nx-evo-2">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
