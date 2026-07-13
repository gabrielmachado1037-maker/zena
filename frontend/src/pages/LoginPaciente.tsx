import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { usePacienteAuth } from "../contexts/PacienteAuthContext";
import { NexvelLogo } from "./onboarding/components/NexvelLogo";
import { PrimaryButton } from "./onboarding/components/OnbButtons";
import { cn } from "../lib/utils";

/**
 * Login / cadastro do paciente — identidade dark + verde da marca (mesmo padrão
 * do onboarding). Abre na aba certa via ?tab=register. Toda a lógica de auth
 * preservada (login, register com código de vínculo, navegação, erros, loading).
 */
export default function LoginPaciente() {
  const [sp] = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">(sp.get("tab") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [telefone4, setTelefone4] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = usePacienteAuth();
  const navigate = useNavigate();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, senha);
      navigate("/paciente/feed");
    } catch (err: any) {
      setError(err.response?.data?.error || "E-mail ou senha incorretos.");
    } finally { setLoading(false); }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await register(email, senha, codigo.trim(), telefone4.trim());
      navigate("/completar-perfil");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao criar conta.");
    } finally { setLoading(false); }
  }

  const isLogin = tab === "login";

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-black">
      {/* fix p/ autofill não clarear o input escuro */}
      <style>{`.nx-input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #141414 inset;-webkit-text-fill-color:#fff;caret-color:#fff}`}</style>

      <div className="relative flex w-full max-w-[440px] flex-col bg-[#0A0A0A] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        {/* topo */}
        <header className="flex items-center justify-between py-2">
          <button
            type="button" onClick={() => navigate("/")} aria-label="Voltar"
            className="grid size-10 place-items-center rounded-full text-[#A1A1AA] transition-colors hover:bg-white/5 hover:text-white active:scale-95"
          >
            <ArrowLeft className="size-5" />
          </button>
          <Link to="/login" className="text-body-sm font-medium text-[#A1A1AA] transition-colors hover:text-nx-evo">
            Área da nutricionista
          </Link>
        </header>

        <div className="mt-8">
          <NexvelLogo className="h-[30px]" />

          <h1 className="mt-8 text-[30px] font-extrabold leading-tight tracking-tight text-white">
            {isLogin ? <>Bem-vindo <span className="text-nx-evo">de volta.</span></> : <>Crie a sua <span className="text-nx-evo">conta.</span></>}
          </h1>
          <p className="mt-2 text-body-md text-[#A1A1AA]">
            {isLogin ? "Entre e continue sua evolução." : "Use o código enviado pela sua nutricionista."}
          </p>

          {/* Abas */}
          <div className="mt-7 flex gap-1 rounded-full border border-white/[0.08] bg-[#141414] p-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(""); }}
                aria-pressed={tab === t}
                className={cn(
                  "flex-1 rounded-full py-2.5 text-body-sm font-bold transition-all duration-200",
                  tab === t ? "bg-white/[0.08] text-white shadow-sm" : "text-[#A1A1AA] hover:text-white",
                )}
              >
                {t === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {/* Formulário */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="mt-6 space-y-4">
            <Field
              label="E-mail" type="email" value={email} onChange={setEmail}
              placeholder="seu@email.com" autoComplete="email"
            />

            <PasswordField
              label={isLogin ? "Senha" : "Crie uma senha"}
              value={senha} onChange={setSenha}
              show={showSenha} onToggle={() => setShowSenha((s) => !s)}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />

            {!isLogin && (
              <>
                <div>
                  <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">Código de convite</label>
                  <input
                    type="text" inputMode="text" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                    placeholder="XXXXXXXX" maxLength={8} required
                    className="nx-input w-full rounded-2xl border border-white/[0.08] bg-[#141414] py-3.5 text-center text-2xl font-bold tracking-[0.3em] text-white placeholder:tracking-[0.3em] placeholder:text-[#3f3f46] focus:border-nx-evo/60 focus:outline-none focus:ring-2 focus:ring-nx-evo/40"
                  />
                  <p className="mt-1.5 text-body-sm text-[#71717A]">Código individual enviado pela sua nutricionista (é de uso único).</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">Últimos 4 dígitos do seu telefone</label>
                  <input
                    type="text" inputMode="numeric" value={telefone4}
                    onChange={(e) => setTelefone4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="0000" maxLength={4} required
                    className="nx-input w-full rounded-2xl border border-white/[0.08] bg-[#141414] py-3.5 text-center text-2xl font-bold tracking-[0.4em] text-white placeholder:tracking-[0.4em] placeholder:text-[#3f3f46] focus:border-nx-evo/60 focus:outline-none focus:ring-2 focus:ring-nx-evo/40"
                  />
                  <p className="mt-1.5 text-body-sm text-[#71717A]">Confirma que o convite é seu — o telefone cadastrado pela sua nutricionista.</p>
                </div>
              </>
            )}

            {error && (
              <p className="rounded-xl border border-nx-danger/25 bg-nx-danger/10 px-3.5 py-2.5 text-body-sm font-medium text-nx-danger">
                {error}
              </p>
            )}

            <PrimaryButton type="submit" disabled={loading} className="mt-2">
              {loading ? (isLogin ? "Entrando…" : "Criando…") : isLogin ? "Entrar" : "Criar conta"}
            </PrimaryButton>
          </form>

          {/* alternância textual */}
          <p className="mt-6 text-center text-body-sm text-[#A1A1AA]">
            {isLogin ? "Ainda não tem conta? " : "Já tem uma conta? "}
            <button
              type="button"
              onClick={() => { setTab(isLogin ? "register" : "login"); setError(""); }}
              className="font-bold text-nx-evo transition-colors hover:text-nx-evo-2"
            >
              {isLogin ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────── campos (dark) ───────── */
const INPUT_CLS =
  "nx-input w-full rounded-2xl border border-white/[0.08] bg-[#141414] px-4 py-3.5 text-body-md text-white " +
  "placeholder:text-[#52525b] focus:border-nx-evo/60 focus:outline-none focus:ring-2 focus:ring-nx-evo/40 transition-colors";

function Field({
  label, value, onChange, ...rest
}: { label: string; value: string; onChange: (v: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div>
      <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} required className={INPUT_CLS} {...rest} />
    </div>
  );
}

function PasswordField({
  label, value, onChange, show, onToggle, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••" required minLength={6} autoComplete={autoComplete}
          className={cn(INPUT_CLS, "pr-12")}
        />
        <button
          type="button" onClick={onToggle}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-3 top-1/2 -translate-y-1/2 grid size-8 place-items-center rounded-lg text-[#A1A1AA] transition-colors hover:text-white"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
