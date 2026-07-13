import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, Apple } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ProLogo, PrimaryBtn, INPUT_DARK } from "./nutri-landing/components/shared";
import { Constellation } from "./nutri-landing/components/Constellation";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.9 35.7 44 30.4 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

const REMEMBER_KEY = "nx_nutri_email";

/** TELA 2 — Login da nutricionista (NEXVEL NUTRITION PRO), dark + verde. */
export default function Login() {
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? "");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(() => !!localStorage.getItem(REMEMBER_KEY));
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(""); setInfo("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Informe um e-mail válido.");
    if (!senha) return setError("Digite sua senha.");
    setLoading(true);
    try {
      await login(email, senha);
      if (lembrar) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
      navigate("/app/dashboard");
    } catch {
      setError("E-mail ou senha incorretos.");
    } finally { setLoading(false); }
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#0A0A0A] px-5 py-10">
      {/* fix autofill escuro */}
      <style>{`.nx-input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #0B0F0C inset;-webkit-text-fill-color:#fff;caret-color:#fff}`}</style>

      {/* fundo constelação (direita) */}
      <Constellation className="pointer-events-none absolute inset-0 size-full opacity-90" />

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

            {/* divisor */}
            <div className="flex items-center gap-3 py-0.5">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-body-sm text-[#A1A1AA]">ou</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <SocialBtn onClick={() => setInfo("Login social chega em breve — use e-mail e senha por enquanto.")}>
              <GoogleIcon /> Entrar com Google
            </SocialBtn>
            <SocialBtn onClick={() => setInfo("Login social chega em breve — use e-mail e senha por enquanto.")}>
              <Apple className="size-[18px]" /> Entrar com Apple
            </SocialBtn>
            {info && <p className="text-center text-body-sm text-[#A1A1AA]">{info}</p>}
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

function SocialBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-[#0B0F0C] py-3 text-body-md font-medium text-white transition-colors hover:border-white/20 hover:bg-white/5 active:scale-[0.99]">
      {children}
    </button>
  );
}
