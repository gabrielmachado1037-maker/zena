import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ProLogo, PrimaryBtn, INPUT_DARK } from "./nutri-landing/components/shared";
import { Constellation } from "./nutri-landing/components/Constellation";

const REMEMBER_KEY = "nx_nutri_email";

/** TELA 2 — Login da nutricionista (NEXVEL NUTRITION PRO), dark + verde. */
export default function Login() {
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? "");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(() => !!localStorage.getItem(REMEMBER_KEY));
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Informe um e-mail válido.");
    if (!senha) return setError("Digite sua senha.");
    setLoading(true);
    try {
      await login(email, senha);
      if (lembrar) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
      navigate("/app/dashboard");
    } catch (err: any) {
      // Mostra a mensagem real do backend (ex.: 429 "Muitas tentativas… 15 min"),
      // senão a nutri fica batendo achando que é senha errada.
      setError(err?.response?.data?.error || "E-mail ou senha incorretos.");
    } finally { setLoading(false); }
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#0A0A0A] px-5 py-10">
      {/* fix autofill escuro */}
      <style>{`.nx-input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #0B0F0C inset;-webkit-text-fill-color:#fff;caret-color:#fff}`}</style>

      {/* fundo constelação (direita) */}
      <Constellation className="pointer-events-none absolute inset-0 size-full opacity-90" />

      {/* voltar para a tela de início */}
      <button type="button" onClick={() => navigate("/")}
        aria-label="Voltar para a tela de início"
        className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-body-sm font-medium text-[#A1A1AA] transition-colors hover:text-white active:scale-[0.98]">
        <ArrowLeft size={18} /> Início
      </button>

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Marca + escudo */}
        <div className="flex flex-col items-center text-center">
          <ProLogo size="h-[28px]" className="[&_p]:text-center" />
          <span className="mt-6 grid size-14 place-items-center rounded-2xl border border-nx-evo/30 bg-nx-evo/10">
            <ShieldCheck className="size-7 text-nx-evo" strokeWidth={2} />
          </span>
          <h1 className="mt-6 text-[28px] font-extrabold tracking-tight text-white">Bem-vindo de volta!</h1>
          <p className="mx-auto mt-2 max-w-[36ch] text-body-md leading-relaxed text-[#A1A1AA]">
            Faça login para acessar a plataforma e acompanhar a evolução dos seus pacientes.
          </p>
        </div>

        {/* Card de login */}
        <div className="mt-8 rounded-[20px] border border-white/[0.06] bg-[#111311] p-6 shadow-2xl sm:p-7">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com" autoComplete="email" className={INPUT_DARK} />
            </div>

            <div>
              <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">Senha</label>
              <div className="relative">
                <input type={showSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha" autoComplete="current-password" className={`${INPUT_DARK} pr-12`} />
                <button type="button" onClick={() => setShowSenha((s) => !s)}
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#A1A1AA] transition-colors hover:text-white">
                  {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer select-none items-center gap-2 text-body-sm text-[#A1A1AA]">
                <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-[#0B0F0C] accent-nx-evo" />
                Lembrar de mim
              </label>
              <Link to="/esqueci-senha" className="text-body-sm font-semibold text-nx-evo hover:text-nx-evo-2">Esqueci minha senha</Link>
            </div>

            {error && (
              <p className="rounded-xl border border-nx-danger/25 bg-nx-danger/10 px-3.5 py-2.5 text-body-sm font-medium text-nx-danger">{error}</p>
            )}

            <PrimaryBtn type="submit" disabled={loading} className="w-full">
              {loading ? "Entrando…" : "Entrar"}
            </PrimaryBtn>
          </form>
        </div>

        <p className="mt-6 text-center text-body-sm text-[#A1A1AA]">
          Ainda não tem uma conta?{" "}
          <Link to="/cadastro" className="font-bold text-nx-evo hover:text-nx-evo-2">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
